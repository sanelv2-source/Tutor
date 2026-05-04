import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = {
  schedule: '@hourly',
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const toDateString = (date) => date.toISOString().slice(0, 10);

const parseLessonStart = (lesson) => {
  const [year, month, day] = String(lesson.lesson_date || '').split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = String(lesson.start_time || '00:00:00').split(':').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

const isCompletedOrCancelled = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  return ['fullført', 'fullfort', 'completed', 'done', 'cancelled', 'canceled', 'avlyst'].includes(normalized);
};

async function insertNotification(supabaseAdmin, userId, title, body) {
  if (!userId) return null;

  const payload = {
    user_id: userId,
    type: 'lesson_reminder',
    title,
    body,
    message: body,
    link: '/student/dashboard?tab=calendar',
    is_read: false,
  };

  const { error } = await supabaseAdmin.from('notifications').insert([payload]);
  if (error) {
    console.warn('Lesson reminder notification failed:', error.message);
  }

  return error;
}

const formatLessonDate = (dateString) => {
  const [year, month, day] = String(dateString || '').split('-').map(Number);
  if (!year || !month || !day) return String(dateString || '');
  return new Date(year, month - 1, day).toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

async function sendReminderEmail({ resend, fromEmail, recipientEmail, teacherName, studentName, lessonDate, startTime, durationMinutes }) {
  if (!resend || !recipientEmail) return false;

  const dateText = formatLessonDate(lessonDate);
  const timeText = String(startTime || '').slice(0, 5);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject: `Påminnelse: time ${dateText} kl. ${timeText}`,
    html: `
      <div style="background:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;color:#0f172a;">
        <div style="margin:0 auto;max-width:620px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px;">
          <h1 style="font-size:24px;margin:0 0 12px;">Timepåminnelse</h1>
          <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 22px;">
            Dette er en påminnelse om avtalt undervisning med ${escapeHtml(teacherName)}.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:0 0 24px;">
            <p style="margin:0 0 8px;"><strong>Elev:</strong> ${escapeHtml(studentName)}</p>
            <p style="margin:0 0 8px;"><strong>Tid:</strong> ${escapeHtml(dateText)} kl. ${escapeHtml(timeText)}</p>
            <p style="margin:0;"><strong>Varighet:</strong> ${escapeHtml(durationMinutes || 60)} minutter</p>
          </div>
          <p style="color:#64748b;font-size:14px;line-height:22px;margin:0;">Vennlig hilsen<br>TutorFlyt</p>
        </div>
      </div>
    `,
  });

  if (error) throw error;
  return true;
}

export async function handler() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';
  const now = new Date();
  const maxDate = new Date(now.getTime() + 168 * 60 * 60 * 1000);

  try {
    const { data: settingsRows, error: settingsError } = await supabaseAdmin
      .from('teacher_settings')
      .select('tutor_id, lesson_reminder_hours')
      .eq('lesson_reminders_enabled', true);

    if (settingsError) throw settingsError;
    if (!settingsRows?.length) return json(200, { checked: 0, sent: 0 });

    const tutorIds = settingsRows.map((row) => row.tutor_id).filter(Boolean);
    const settingsByTutor = new Map(settingsRows.map((row) => [row.tutor_id, row]));

    const { data: lessons, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('id, tutor_id, student_id, student_name, lesson_date, start_time, duration_minutes, status, reminder_sent_at')
      .in('tutor_id', tutorIds)
      .is('reminder_sent_at', null)
      .gte('lesson_date', toDateString(now))
      .lte('lesson_date', toDateString(maxDate))
      .order('lesson_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (lessonError) throw lessonError;
    if (!lessons?.length) return json(200, { checked: 0, sent: 0 });

    const studentIds = [...new Set(lessons.map((lesson) => lesson.student_id).filter(Boolean))];
    const { data: students } = studentIds.length
      ? await supabaseAdmin
          .from('students')
          .select('id, full_name, email, parent_email, profile_id')
          .in('id', studentIds)
      : { data: [] };

    const studentById = new Map((students || []).map((student) => [student.id, student]));

    const { data: tutorProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', tutorIds);

    const teacherNameById = new Map((tutorProfiles || []).map((profile) => [profile.id, profile.full_name || 'Læreren din']));

    let checked = 0;
    let sent = 0;

    for (const lesson of lessons) {
      checked += 1;
      if (isCompletedOrCancelled(lesson.status)) continue;

      const setting = settingsByTutor.get(lesson.tutor_id);
      const reminderHours = Number(setting?.lesson_reminder_hours || 24);
      const lessonStart = parseLessonStart(lesson);
      if (!lessonStart) continue;

      const msUntilLesson = lessonStart.getTime() - now.getTime();
      if (msUntilLesson < -30 * 60 * 1000 || msUntilLesson > reminderHours * 60 * 60 * 1000) {
        continue;
      }

      const student = studentById.get(lesson.student_id);
      const studentName = student?.full_name || lesson.student_name || 'elev';
      const recipientEmail = normalizeEmail(student?.parent_email || student?.email);
      const teacherName = teacherNameById.get(lesson.tutor_id) || 'Læreren din';
      const notificationBody = `${teacherName} minner om timen ${lesson.lesson_date} kl. ${String(lesson.start_time || '').slice(0, 5)}.`;

      try {
        const emailSent = await sendReminderEmail({
          resend,
          fromEmail,
          recipientEmail,
          teacherName,
          studentName,
          lessonDate: lesson.lesson_date,
          startTime: lesson.start_time,
          durationMinutes: lesson.duration_minutes,
        });

        await insertNotification(supabaseAdmin, student?.profile_id, 'Timepåminnelse', notificationBody);

        if (!emailSent && !student?.profile_id) {
          throw new Error('Ingen e-post eller elevprofil for påminnelse.');
        }

        const { error: updateError } = await supabaseAdmin
          .from('lessons')
          .update({ reminder_sent_at: new Date().toISOString(), reminder_last_error: null })
          .eq('id', lesson.id);

        if (updateError) throw updateError;
        sent += 1;
      } catch (error) {
        console.error(`Lesson reminder failed for ${lesson.id}:`, error);
        await supabaseAdmin
          .from('lessons')
          .update({ reminder_last_error: String(error?.message || error).slice(0, 500) })
          .eq('id', lesson.id);
      }
    }

    return json(200, { checked, sent });
  } catch (error) {
    console.error('Lesson reminder job failed:', error);
    return json(500, { error: 'Kunne ikke kjøre timepåminnelser.' });
  }
}
