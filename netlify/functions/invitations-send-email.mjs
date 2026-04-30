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

const getOrigin = (event) => {
  const configuredUrl = process.env.APP_URL || '';
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const origin = event.headers.origin || event.headers.Origin || '';
  if (origin) return origin.replace(/\/$/, '');

  const host = event.headers.host || event.headers.Host || '';
  const proto = event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'] || 'https';
  return host ? `${proto}://${host}` : '';
};

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  const authToken = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!authToken) {
    return json(401, { error: 'Du må være logget inn for å sende invitasjon.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig foresporsel.' });
  }

  const email = normalizeEmail(payload.email);
  const inviteToken = clipText(payload.token, 200);

  if (!email || !inviteToken) {
    return json(400, { error: 'Mangler e-post eller invitasjonstoken.' });
  }

  const origin = getOrigin(event);
  if (!origin) {
    return json(500, { error: 'APP_URL mangler.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('student_invitations')
      .select('id, email, tutor_id, status, expires_at')
      .eq('token', inviteToken)
      .maybeSingle();

    if (invitationError) {
      console.error('Invitation lookup error:', invitationError);
      return json(500, { error: 'Kunne ikke hente invitasjonen.' });
    }

    if (!invitation) {
      return json(404, { error: 'Fant ikke invitasjonen.' });
    }

    if (invitation.tutor_id !== authData.user.id) {
      return json(403, { error: 'Du kan bare sende egne invitasjoner.' });
    }

    if (normalizeEmail(invitation.email) !== email) {
      return json(400, { error: 'E-post matcher ikke invitasjonen.' });
    }

    if (invitation.status !== 'pending') {
      return json(400, { error: 'Invitasjonen er ikke lenger aktiv.' });
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      return json(410, { error: 'Invitasjonen er utløpt.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', authData.user.id)
      .maybeSingle();

    const tutorName = clipText(
      profile?.full_name || authData.user.user_metadata?.full_name || payload.tutorName || 'Læreren din',
      120,
    );
    const inviteUrl = `${origin}/student/accept-invite?token=${encodeURIComponent(inviteToken)}`;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';
    const resendApiKey = process.env.RESEND_API_KEY || '';

    if (!resendApiKey) {
      return json(500, { error: 'E-posttjenesten er ikke konfigurert.' });
    }

    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Invitasjon til TutorFlyt',
      html: `
        <div style="background-color:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;">
          <div style="margin:0 auto;padding:40px 32px;background:#fff;border-radius:12px;max-width:600px;border:1px solid #e2e8f0;text-align:center;">
            <h1 style="color:#0f172a;font-size:24px;margin:0 0 20px;">Du er invitert til TutorFlyt</h1>
            <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 20px;">
              <strong>${escapeHtml(tutorName)}</strong> har invitert deg til TutorFlyt.
            </p>
            <div style="margin:32px 0;text-align:center;">
              <a href="${escapeHtml(inviteUrl)}" style="background:#4f46e5;border-radius:8px;color:#fff;display:inline-block;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 32px;">
                Aksepter invitasjon
              </a>
            </div>
            <p style="color:#94a3b8;font-size:14px;line-height:22px;margin:24px 0 0;">
              Lenken er gyldig i 7 dager.
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend invitation error:', emailError);
      return json(502, { error: emailError.message || 'Kunne ikke sende invitasjon.' });
    }

    return json(200, { success: true, emailSent: true });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return json(500, { error: 'Kunne ikke sende invitasjon.' });
  }
}
