import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const clipText = (value, maxLength) => String(value ?? '').trim().slice(0, maxLength);
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const getBearerToken = (value) => String(value ?? '').replace(/^Bearer\s+/i, '').trim();
const isSchemaCacheColumnError = (error) => /schema cache|Could not find .* column|column .* does not exist/i.test(error?.message || '');

async function findStudentForPayment(supabaseAdmin, { studentId, tutorId, recipientEmail, studentName }) {
  if (studentId) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('id, profile_id, full_name, email, tutor_id')
      .eq('id', studentId)
      .eq('tutor_id', tutorId)
      .maybeSingle();

    if (!error && data) return data;
  }

  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('id, profile_id, full_name, email, tutor_id')
    .eq('tutor_id', tutorId);

  if (error) {
    console.warn('Could not look up student for payment notification:', error.message);
    return null;
  }

  const normalizedRecipientEmail = normalizeEmail(recipientEmail);
  const normalizedStudentName = String(studentName || '').trim().toLowerCase();

  return (students || []).find((student) =>
    (student.email && normalizeEmail(student.email) === normalizedRecipientEmail) ||
    (student.full_name && student.full_name.trim().toLowerCase() === normalizedStudentName)
  ) || null;
}

async function createPaymentNotification(supabaseAdmin, userId, { teacherName, amount, link }) {
  if (!userId) return;

  const body = `${teacherName} har sendt deg et betalingskrav på ${amount} kr.`;
  const payload = {
    user_id: userId,
    type: 'payment',
    title: 'Nytt betalingskrav',
    body,
    message: body,
    link,
    is_read: false,
  };

  let { error } = await supabaseAdmin.from('notifications').insert([payload]);

  if (error && /message|body|column/i.test(error.message || '')) {
    ({ error } = await supabaseAdmin.from('notifications').insert([{
      user_id: userId,
      type: 'payment',
      title: 'Nytt betalingskrav',
      body,
      link,
      is_read: false,
    }]));
  }

  if (error && /message|body|column/i.test(error.message || '')) {
    ({ error } = await supabaseAdmin.from('notifications').insert([{
      user_id: userId,
      type: 'payment',
      title: 'Nytt betalingskrav',
      message: body,
      link,
      is_read: false,
    }]));
  }

  if (error) {
    console.warn('Could not create payment notification:', error.message);
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const resendApiKey = process.env.RESEND_API_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  const authToken = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!authToken) {
    return json(401, { error: 'Du må være logget inn for å sende betalingskrav.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const invoiceId = clipText(payload.invoiceId, 80);
  const studentId = clipText(payload.studentId, 80);
  const recipientEmail = normalizeEmail(payload.recipientEmail);
  const paymentPageUrl = clipText(payload.paymentPageUrl, 1000);

  if (!invoiceId || !recipientEmail) {
    return json(400, { error: 'Mangler faktura eller mottaker.' });
  }

  if (!resendApiKey) {
    return json(500, { error: 'E-posttjenesten er ikke konfigurert.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    const fetchInvoice = (columns) => supabaseAdmin
      .from('invoices')
      .select(columns)
      .eq('id', invoiceId)
      .maybeSingle();

    let { data: invoice, error: invoiceError } = await fetchInvoice(
      'id, tutor_id, student_name, amount, due_date, description, public_token',
    );

    if (invoiceError && isSchemaCacheColumnError(invoiceError)) {
      ({ data: invoice, error: invoiceError } = await fetchInvoice(
        'id, tutor_id, student_name, amount, due_date, public_token',
      ));
    }

    if (invoiceError) {
      console.error('Vipps invoice lookup error:', invoiceError);
      return json(500, { error: 'Kunne ikke hente betalingskravet.' });
    }

    if (!invoice) {
      return json(404, { error: 'Fant ikke betalingskravet.' });
    }

    if (invoice.tutor_id !== authData.user.id) {
      return json(403, { error: 'Du kan bare sende dine egne betalingskrav.' });
    }

    const { data: tutorProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', authData.user.id)
      .maybeSingle();

    const teacherName = tutorProfile?.full_name || authData.user.user_metadata?.full_name || 'Læreren din';
    const tutorPhone = clipText(tutorProfile?.phone, 80);

    if (!tutorPhone || /ikke oppgitt|mangler nummer/i.test(tutorPhone)) {
      return json(400, { error: 'Læreren mangler mobilnummer på profilen.' });
    }

    const amount = Number(invoice.amount || 0).toLocaleString('no-NO');
    const description = invoice.description || `Undervisning - ${invoice.student_name || 'elev'}`;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';
    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: `Betalingskrav fra ${teacherName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #0f172a; padding: 24px;">
          <h1 style="font-size: 24px; margin: 0 0 12px;">Betaling for undervisning</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #475569;">${escapeHtml(teacherName)} har sendt deg et betalingskrav.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 22px 0;">
            <p style="margin: 0 0 8px;"><strong>Elev:</strong> ${escapeHtml(invoice.student_name || 'Ikke oppgitt')}</p>
            <p style="margin: 0 0 8px;"><strong>Gjelder:</strong> ${escapeHtml(description)}</p>
            <p style="margin: 0 0 8px;"><strong>Beløp:</strong> ${escapeHtml(amount)} kr</p>
            <p style="margin: 0;"><strong>Vipps til:</strong> <span style="font-size: 20px; font-weight: 800; color: #ff5b24;">${escapeHtml(tutorPhone)}</span></p>
          </div>
          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 16px; margin: 22px 0;">
            <p style="margin: 0 0 8px; color: #9a3412; font-weight: 700;">Åpne Vipps og send beløpet til lærerens mobilnummer.</p>
            <p style="margin: 0; color: #9a3412;">Bruk gjerne meldingen: ${escapeHtml(description)}</p>
          </div>
          ${paymentPageUrl ? `<p style="font-size: 14px; line-height: 1.6; color: #64748b;">Du kan også se betalingskravet her: <a href="${escapeHtml(paymentPageUrl)}">${escapeHtml(paymentPageUrl)}</a></p>` : ''}
          <p style="font-size: 12px; color: #94a3b8; margin-top: 28px;">Betalingen skjer direkte i Vipps. Tutorflyt lagrer status og historikk.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend Vipps request error:', emailError);
      return json(502, { error: emailError.message || 'Kunne ikke sende e-post.' });
    }

    const updatePayload = {
      status: 'request_sent',
      request_sent_at: new Date().toISOString(),
      email: recipientEmail,
      tutor_phone: tutorPhone,
      payment_link: null,
    };

    let { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoiceId);

    if (updateError && isSchemaCacheColumnError(updateError)) {
      ({ error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'request_sent', email: recipientEmail, tutor_phone: tutorPhone })
        .eq('id', invoiceId));
    }

    if (updateError && isSchemaCacheColumnError(updateError)) {
      ({ error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'request_sent', email: recipientEmail })
        .eq('id', invoiceId));
    }

    if (updateError) {
      console.error('Vipps invoice update error:', updateError);
      return json(500, { error: 'Kunne ikke oppdatere betalingsstatus.' });
    }

    const student = await findStudentForPayment(supabaseAdmin, {
      studentId,
      tutorId: authData.user.id,
      recipientEmail,
      studentName: invoice.student_name,
    });

    if (student?.profile_id) {
      await createPaymentNotification(supabaseAdmin, student.profile_id, {
        teacherName,
        amount,
        link: '/student/dashboard?tab=payments',
      });
    }

    return json(200, { success: true });
  } catch (error) {
    console.error('Error sending Vipps payment request:', error);
    return json(500, { error: 'Kunne ikke sende betalingskravet.' });
  }
}
