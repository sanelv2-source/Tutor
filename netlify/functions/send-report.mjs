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

const getReportStatusLabel = (status) => {
  if (status === 'great') return 'Veldig bra';
  if (status === 'good') return 'Bra';
  if (status === 'needs_focus') return 'Trenger fokus';
  return 'Ikke vurdert';
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

  const authToken = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!authToken) {
    return json(401, { error: 'Du må være logget inn for å sende rapport.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const studentId = clipText(payload.studentId, 80);
  const studentEmail = normalizeEmail(payload.studentEmail);
  const studentName = clipText(payload.studentName || 'eleven', 120);
  const topic = clipText(payload.topic || 'Dagens time', 160);
  const reportStatus = clipText(payload.reportStatus, 40);
  const masteryLevel = Number(payload.masteryLevel);
  const reportComment = clipText(payload.reportComment || 'Ingen kommentar.', 4000);
  const homework = clipText(payload.homework || 'Ingen lekser denne gangen.', 2000);

  if (!studentId || !studentEmail) {
    return json(400, { error: 'Mangler elev eller e-postadresse.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, tutor_id, email, full_name')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError) {
      console.error('Report student lookup error:', studentError);
      return json(500, { error: 'Kunne ikke hente eleven.' });
    }

    if (!student || student.tutor_id !== authData.user.id) {
      return json(403, { error: 'Du kan bare sende rapporter for egne elever.' });
    }

    const allowedEmails = [student.email].filter(Boolean).map(normalizeEmail);
    if (!allowedEmails.includes(studentEmail)) {
      return json(400, { error: 'E-postadressen matcher ikke eleven.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', authData.user.id)
      .maybeSingle();

    const tutorName = clipText(profile?.full_name || authData.user.user_metadata?.full_name || 'Læreren din', 120);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';
    const masteryText = Number.isFinite(masteryLevel) ? `${Math.max(0, Math.min(100, masteryLevel))}%` : 'Ikke vurdert';

    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: studentEmail,
      subject: `Ny progresjonsrapport fra ${tutorName}`,
      html: `
        <div style="background-color:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;color:#0f172a;">
          <div style="margin:0 auto;padding:32px;background:#fff;border-radius:12px;max-width:640px;border:1px solid #e2e8f0;">
            <h1 style="font-size:24px;margin:0 0 12px;">Ny progresjonsrapport</h1>
            <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px;">
              Hei ${escapeHtml(student.full_name || studentName)}, her er en oppsummering fra ${escapeHtml(tutorName)}.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:0 0 24px;">
              <p><strong>Emne:</strong> ${escapeHtml(topic)}</p>
              <p><strong>Dagens innsats:</strong> ${escapeHtml(getReportStatusLabel(reportStatus))}</p>
              <p><strong>Mestring:</strong> ${escapeHtml(masteryText)}</p>
              <p><strong>Kommentar:</strong><br>${escapeHtml(reportComment).replace(/\n/g, '<br>')}</p>
              <p><strong>Lekser:</strong><br>${escapeHtml(homework).replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color:#64748b;font-size:14px;line-height:22px;margin:0;">Vennlig hilsen<br>TutorFlyt</p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend report error:', emailError);
      return json(502, { error: emailError.message || 'Kunne ikke sende e-post via Resend.' });
    }

    return json(200, { success: true, emailSent: true });
  } catch (error) {
    console.error('Error sending report:', error);
    return json(500, { error: 'Kunne ikke sende rapport.' });
  }
}
