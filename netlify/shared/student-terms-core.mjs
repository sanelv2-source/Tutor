export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const clipText = (value, maxLength) => String(value ?? '').trim().slice(0, maxLength);
export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
export const getBearerToken = (value) => String(value ?? '').replace(/^Bearer\s+/i, '').trim();

export async function sendStudentTermsEmail({ supabaseAdmin, resend, authToken, payload, fromEmail }) {
  const studentId = clipText(payload.studentId, 80);
  const termsId = clipText(payload.termsId, 80);

  if (!authToken) {
    return { statusCode: 401, body: { error: 'Du må være logget inn for å sende vilkår.' } };
  }

  if (!studentId) {
    return { statusCode: 400, body: { error: 'Velg en elev først.' } };
  }

  if (!supabaseAdmin) {
    return { statusCode: 500, body: { error: 'Supabase server config mangler.' } };
  }

  if (!resend) {
    return { statusCode: 500, body: { error: 'E-posttjenesten er ikke konfigurert.' } };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
  if (authError || !authData.user) {
    return { statusCode: 401, body: { error: 'Ugyldig eller utløpt innlogging.' } };
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, tutor_id, full_name, email, parent_email, profile_id')
    .eq('id', studentId)
    .maybeSingle();

  if (studentError) {
    console.error('Terms student lookup error:', studentError);
    return { statusCode: 500, body: { error: 'Kunne ikke hente eleven.' } };
  }

  if (!student || student.tutor_id !== authData.user.id) {
    return { statusCode: 403, body: { error: 'Du kan bare sende vilkår til egne elever.' } };
  }

  const recipientEmail = normalizeEmail(student.parent_email || student.email);
  if (!recipientEmail) {
    return { statusCode: 400, body: { error: 'Eleven mangler e-postadresse.' } };
  }

  let termsQuery = supabaseAdmin
    .from('teacher_terms')
    .select('id, title, cancellation_notice_hours, payment_due_days, content')
    .eq('tutor_id', authData.user.id);

  termsQuery = termsId ? termsQuery.eq('id', termsId) : termsQuery.eq('is_default', true);

  const { data: terms, error: termsError } = await termsQuery.maybeSingle();
  if (termsError) {
    console.error('Terms lookup error:', termsError);
    return { statusCode: 500, body: { error: 'Kunne ikke hente vilkår.' } };
  }

  if (!terms) {
    return { statusCode: 404, body: { error: 'Lag vilkår før du sender dem.' } };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', authData.user.id)
    .maybeSingle();

  const teacherName = clipText(profile?.full_name || authData.user.user_metadata?.full_name || 'Læreren din', 120);
  const title = clipText(terms.title || 'Vilkår for privatundervisning', 160);
  const content = clipText(terms.content, 6000);

  const { error: emailError } = await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject: `${title} fra ${teacherName}`,
    html: `
      <div style="background:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;color:#0f172a;">
        <div style="margin:0 auto;max-width:680px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px;">
          <h1 style="font-size:24px;margin:0 0 12px;">${escapeHtml(title)}</h1>
          <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px;">
            Hei ${escapeHtml(student.full_name || 'elev')}, her er avbestillingsregler og vilkår fra ${escapeHtml(teacherName)}.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:0 0 24px;">
            <p style="margin:0 0 8px;"><strong>Avbestilling:</strong> senest ${escapeHtml(terms.cancellation_notice_hours)} timer før avtalt time.</p>
            <p style="margin:0;"><strong>Betaling:</strong> forfall ${escapeHtml(terms.payment_due_days)} dager etter faktura dersom annet ikke er avtalt.</p>
          </div>
          <p style="white-space:pre-wrap;line-height:1.7;color:#334155;">${escapeHtml(content)}</p>
          <p style="color:#64748b;font-size:14px;line-height:22px;margin:28px 0 0;">Vennlig hilsen<br>${escapeHtml(teacherName)}</p>
        </div>
      </div>
    `,
  });

  if (emailError) {
    console.error('Resend terms error:', emailError);
    return { statusCode: 502, body: { error: emailError.message || 'Kunne ikke sende vilkår.' } };
  }

  if (student.profile_id) {
    const notificationBody = `${teacherName} har sendt deg vilkår og avbestillingsregler.`;
    const payloadBase = {
      user_id: student.profile_id,
      type: 'terms',
      title: 'Nye vilkår',
      body: notificationBody,
      message: notificationBody,
      link: '/student/dashboard',
      is_read: false,
    };

    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert([payloadBase]);

    if (notificationError) {
      console.warn('Could not create terms notification:', notificationError.message);
    }
  }

  return { statusCode: 200, body: { success: true, emailSent: true } };
}
