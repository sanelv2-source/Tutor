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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return json(401, { error: 'Du må være logget inn for å sende supportmelding.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const category = clipText(payload.category || 'other', 80);
  const subject = clipText(payload.subject, 140);
  const message = clipText(payload.message, 4000);
  const pageUrl = clipText(payload.pageUrl, 1000);
  const userAgent = clipText(payload.userAgent, 1000);
  const requestedRole = clipText(payload.role, 30);

  if (!subject || !message) {
    return json(400, { error: 'Tittel og beskrivelse er påkrevd.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    const senderName = profile?.full_name || authData.user.user_metadata?.full_name || authData.user.email || 'Ukjent bruker';
    const senderEmail = profile?.email || authData.user.email || null;
    const role = profile?.role || requestedRole || 'unknown';

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('support_feedback')
      .insert({
        user_id: authData.user.id,
        user_role: role,
        user_name: senderName,
        user_email: senderEmail,
        category,
        subject,
        message,
        page_url: pageUrl || null,
        user_agent: userAgent || null,
        status: 'new',
      })
      .select('id')
      .single();

    if (feedbackError) {
      console.error('Support feedback insert error:', feedbackError);
      return json(500, { error: 'Kunne ikke lagre supportmeldingen.' });
    }

    const supportEmail = process.env.SUPPORT_EMAIL || 'info@tutorflyt.no';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';
    const resendApiKey = process.env.RESEND_API_KEY || '';

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY missing. Support feedback was saved but no email was sent.');
      return json(200, { success: true, id: feedback.id, emailSent: false });
    }

    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: supportEmail,
      subject: `Support: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #0f172a;">
          <h2 style="margin-bottom: 8px;">Ny supportmelding</h2>
          <p style="margin-top: 0; color: #64748b;">Sak ID: ${escapeHtml(feedback.id)}</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
            <p><strong>Fra:</strong> ${escapeHtml(senderName)}</p>
            <p><strong>E-post:</strong> ${escapeHtml(senderEmail || 'Ikke oppgitt')}</p>
            <p><strong>Rolle:</strong> ${escapeHtml(role)}</p>
            <p><strong>Kategori:</strong> ${escapeHtml(category)}</p>
            <p><strong>Side:</strong> ${escapeHtml(pageUrl || 'Ikke oppgitt')}</p>
          </div>
          <h3 style="margin-bottom: 8px;">${escapeHtml(subject)}</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">User agent: ${escapeHtml(userAgent || 'Ikke oppgitt')}</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend API returned an error for support feedback:', emailError);
      return json(502, { error: 'Meldingen ble lagret, men e-post til support feilet.' });
    }

    return json(200, { success: true, id: feedback.id, emailSent: true });
  } catch (error) {
    console.error('Error handling support feedback:', error);
    return json(500, { error: 'Kunne ikke sende supportmeldingen.' });
  }
}
