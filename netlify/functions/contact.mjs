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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY || '';
  if (!resendApiKey) {
    return json(500, { error: 'E-posttjenesten er ikke konfigurert.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const name = clipText(payload.name, 120);
  const email = normalizeEmail(payload.email);
  const message = clipText(payload.message, 4000);
  const pageUrl = clipText(payload.pageUrl || event.headers.origin || event.headers.Origin || '', 1000);
  const userAgent = clipText(event.headers['user-agent'] || event.headers['User-Agent'] || '', 1000);

  if (!name || !email || !message) {
    return json(400, { error: 'Navn, e-post og melding er påkrevd.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Oppgi en gyldig e-postadresse.' });
  }

  const contactEmail = process.env.CONTACT_EMAIL || process.env.SUPPORT_EMAIL || 'info@tutorflyt.no';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';
  const subject = `Ny kontaktmelding fra ${name}`;
  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      replyTo: email,
      subject,
      text: [
        'Ny kontaktmelding fra tutorflyt.no',
        '',
        `Navn: ${name}`,
        `E-post: ${email}`,
        pageUrl ? `Side: ${pageUrl}` : '',
        '',
        message,
      ].filter(Boolean).join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #0f172a;">
          <h2 style="margin-bottom: 8px;">Ny kontaktmelding</h2>
          <p style="margin-top: 0; color: #64748b;">Sendt fra kontaktsiden på tutorflyt.no.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
            <p><strong>Navn:</strong> ${escapeHtml(name)}</p>
            <p><strong>E-post:</strong> ${escapeHtml(email)}</p>
            <p><strong>Side:</strong> ${escapeHtml(pageUrl || 'Ikke oppgitt')}</p>
          </div>
          <h3 style="margin-bottom: 8px;">Melding</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">User agent: ${escapeHtml(userAgent || 'Ikke oppgitt')}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API returned an error for contact message:', error);
      return json(502, { error: 'Kunne ikke sende meldingen.' });
    }

    return json(200, { success: true, emailId: data?.id });
  } catch (error) {
    console.error('Error sending contact message:', error);
    return json(500, { error: 'Kunne ikke sende meldingen.' });
  }
}
