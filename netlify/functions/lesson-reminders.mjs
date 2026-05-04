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
const normalizeName = (value) => String(value ?? '').trim().toLowerCase();
const lessonTimeZone = process.env.LESSON_TIME_ZONE || 'Europe/Oslo';

const toDateString = (date) => date.toISOString().slice(0, 10);

const getTimeZoneOffsetMs = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
};

const zonedTimeToUtc = ({ year, month, day, hour, minute, second }, timeZone) => {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  try {
    const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
    const adjusted = new Date(utcGuess.getTime() - offset);
    const correctedOffset = getTimeZoneOffsetMs(adjusted, timeZone);
    return new Date(utcGuess.getTime() - correctedOffset);
  } catch (error) {
    console.warn(`Invalid lesson timezone "${timeZone}", falling back to UTC:`, error?.message || error);
    return utcGuess;
  }
};

const parseLessonStart = (lesson) => {
  const [year, month, day] = String(lesson.lesson_date || '').split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = String(lesson.start_time || '00:00:00').split(':').map(Number);
  if (!year || !month || !day) return null;
  return zonedTimeToUtc({ year, month, day, hour, minute, second }, lessonTimeZone);
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

async function fetchStudentsForLessons(supabaseAdmin, lessons, tutorIds) {
  if (!tutorIds.length) return [];

  const studentIds = [...new Set(lessons.map((lesson) => lesson.student_id).filter(Boolean))];
  const buildQuery = (columns) => {
    let query = supabaseAdmin.from('students').select(columns);
    if (studentIds.length > 0) {
      return query.or(`id.in.(${studentIds.join(',')}),tutor_id.in.(${tutorIds.join(',')})`);
    }
    return query.in('tutor_id', tutorIds);
  };

  const { data, error } = await buildQuery('id, tutor_id, full_name, email, profile_id');
  if (error) throw error;
  return data || [];
}

function findStudentForLesson(lesson, studentById, studentsByTutorAndName) {
  if (lesson.student_id && studentById.has(lesson.student_id)) {
    return studentById.get(lesson.student_id);
  }

  return studentsByTutorAndName.get(`${lesson.tutor_id}:${normalizeName(lesson.student_name)}`) || null;
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
    if (!settingsRows?.length) return json(200, { checked: 0, sent: 0, skipped: {}, lessonTimeZone });

    const tutorIds = settingsRows.map((row) => row.tutor_id).filter(Boolean);
    if (!tutorIds.length) return json(200, { checked: 0, sent: 0, skipped: {}, lessonTimeZone });

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
    if (!lessons?.length) return json(200, { checked: 0, sent: 0, skipped: {}, lessonTimeZone });

    const students = await fetchStudentsForLessons(supabaseAdmin, lessons, tutorIds);
    const studentById = new Map(students.map((student) => [student.id, student]));
    const studentsByTutorAndName = new Map(
      students
        .filter((student) => student.tutor_id && student.full_name)
        .map((student) => [`${student.tutor_id}:${normalizeName(student.full_name)}`, student]),
    );

    const { data: tutorProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', tutorIds);

    const teacherNameById = new Map((tutorProfiles || []).map((profile) => [profile.id, profile.full_name || 'Læreren din']));

    let checked = 0;
    let sent = 0;
    const skipped = {
      completedOrCancelled: 0,
      invalidStart: 0,
      outsideReminderWindow: 0,
      missingRecipient: 0,
      failed: 0,
    };

    for (const lesson of lessons) {
      checked += 1;
      if (isCompletedOrCancelled(lesson.status)) {
        skipped.completedOrCancelled += 1;
        continue;
      }

      const setting = settingsByTutor.get(lesson.tutor_id);
      const reminderHours = Number(setting?.lesson_reminder_hours || 24);
      const lessonStart = parseLessonStart(lesson);
      if (!lessonStart) {
        skipped.invalidStart += 1;
        continue;
      }

      const msUntilLesson = lessonStart.getTime() - now.getTime();
      if (msUntilLesson < -30 * 60 * 1000 || msUntilLesson > reminderHours * 60 * 60 * 1000) {
        skipped.outsideReminderWindow += 1;
        continue;
      }

      const student = findStudentForLesson(lesson, studentById, studentsByTutorAndName);
      const studentName = student?.full_name || lesson.student_name || 'elev';
      const recipientEmail = normalizeEmail(student?.email);
      const teacherName = teacherNameById.get(lesson.tutor_id) || 'Læreren din';
      const notificationBody = `${teacherName} minner om timen ${lesson.lesson_date} kl. ${String(lesson.start_time || '').slice(0, 5)}.`;

      try {
        if (!recipientEmail && !student?.profile_id) {
          skipped.missingRecipient += 1;
          throw new Error('Ingen e-post eller elevprofil for paminnelse.');
        }

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
          throw new Error('Ingen e-post eller elevprofil for paminnelse.');
        }

        const { error: updateError } = await supabaseAdmin
          .from('lessons')
          .update({ reminder_sent_at: new Date().toISOString(), reminder_last_error: null })
          .eq('id', lesson.id);

        if (updateError) throw updateError;
        sent += 1;
      } catch (error) {
        skipped.failed += 1;
        console.error(`Lesson reminder failed for ${lesson.id}:`, error);
        await supabaseAdmin
          .from('lessons')
          .update({ reminder_last_error: String(error?.message || error).slice(0, 500) })
          .eq('id', lesson.id);
      }
    }

    return json(200, { checked, sent, skipped, lessonTimeZone });
  } catch (error) {
    console.error('Lesson reminder job failed:', error);
    return json(500, { error: 'Kunne ikke kjøre timepåminnelser.' });
  }
}
