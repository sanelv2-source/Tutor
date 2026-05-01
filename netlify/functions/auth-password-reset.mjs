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

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

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
  const resendApiKey = process.env.RESEND_API_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  if (!resendApiKey) {
    return json(500, { error: 'E-posttjenesten er ikke konfigurert.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return json(400, { error: 'E-postadresse er påkrevd.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Oppgi en gyldig e-postadresse.' });
  }

  const origin = getOrigin(event);
  if (!origin) {
    return json(500, { error: 'APP_URL mangler.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const resend = new Resend(resendApiKey);
  const resetPageUrl = `${origin}/reset-password`;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: resetPageUrl,
      },
    });

    if (error) {
      console.error('Supabase recovery link error:', error);
      if (/not found|user.*not.*found|no user/i.test(error.message || '')) {
        return json(200, { success: true });
      }
      return json(502, { error: 'Kunne ikke lage tilbakestillingslenke.' });
    }

    const tokenHash = data?.properties?.hashed_token;
    const resetUrl = tokenHash
      ? `${resetPageUrl}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
      : data?.properties?.action_link;

    if (!resetUrl) {
      return json(502, { error: 'Kunne ikke lage tilbakestillingslenke.' });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';
    const replyTo = process.env.SUPPORT_EMAIL || 'info@tutorflyt.no';
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      replyTo,
      subject: 'Tilbakestill passordet ditt i TutorFlyt',
      text: [
        'Hei!',
        '',
        'Vi mottok en forespørsel om å tilbakestille passordet ditt i TutorFlyt.',
        'Åpne lenken under for å lage et nytt passord:',
        resetUrl,
        '',
        'Hvis du ikke ba om dette, kan du trygt ignorere denne e-posten.',
        '',
        'Hilsen TutorFlyt',
      ].join('\n'),
      html: `
        <div style="background-color:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;">
          <div style="margin:0 auto;padding:40px 32px;background:#fff;border-radius:12px;max-width:600px;border:1px solid #e2e8f0;text-align:center;color:#0f172a;">
            <h1 style="font-size:24px;margin:0 0 20px;">Tilbakestill passordet ditt</h1>
            <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 20px;">
              Vi mottok en forespørsel om å lage et nytt passord for TutorFlyt-kontoen din.
            </p>
            <div style="margin:32px 0;text-align:center;">
              <a href="${escapeHtml(resetUrl)}" style="background:#0f766e;border-radius:8px;color:#fff;display:inline-block;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 32px;">
                Lag nytt passord
              </a>
            </div>
            <p style="color:#64748b;font-size:14px;line-height:22px;margin:0;">
              Hvis du ikke ba om dette, kan du trygt ignorere denne e-posten.
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend password reset error:', emailError);
      return json(502, { error: 'Kunne ikke sende tilbakestillingslenke.' });
    }

    return json(200, { success: true });
  } catch (error) {
    console.error('Password reset request error:', error);
    return json(500, { error: 'Kunne ikke sende tilbakestillingslenke.' });
  }
}
