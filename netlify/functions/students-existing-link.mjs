import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const clipText = (value, maxLength) => String(value ?? '').trim().slice(0, maxLength);
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const getBearerToken = (value) => String(value ?? '').replace(/^Bearer\s+/i, '').trim();

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
    return json(401, { error: 'Du må være logget inn for å invitere eksisterende elev.' });
  }

  let payloadBody = {};
  try {
    payloadBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const email = normalizeEmail(payloadBody.email);
  const studentName = clipText(payloadBody.studentName, 120);
  const subject = clipText(payloadBody.subject, 120);

  if (!email) {
    return json(400, { error: 'E-postadresse er påkrevd.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', email)
      .eq('role', 'student')
      .maybeSingle();

    if (profileError) {
      console.error('Existing student profile lookup error:', profileError);
      return json(500, { error: 'Kunne ikke hente eksisterende elev.' });
    }

    if (!profile) {
      return json(404, { error: 'Fant ingen eksisterende elevbruker med denne e-posten.' });
    }

    const { data: existingStudents, error: existingStudentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('tutor_id', authData.user.id)
      .or(`email.eq.${email},profile_id.eq.${profile.id}`)
      .limit(1);

    if (existingStudentError) {
      console.error('Existing tutor student lookup error:', existingStudentError);
      return json(500, { error: 'Kunne ikke sjekke om eleven allerede er lagt til.' });
    }

    const existingStudent = existingStudents?.[0] || null;
    const payload = {
      email,
      full_name: studentName || profile.full_name || email.split('@')[0],
      subject: subject || 'Fag: Ikke oppgitt',
      tutor_id: authData.user.id,
      status: 'active',
      profile_id: profile.id,
    };

    let student;

    if (existingStudent) {
      const { data, error } = await supabaseAdmin
        .from('students')
        .update(payload)
        .eq('id', existingStudent.id)
        .select()
        .single();

      if (error) {
        console.error('Existing student update error:', error);
        return json(500, { error: 'Kunne ikke oppdatere eleven.' });
      }

      student = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('students')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Existing student link insert error:', error);
        return json(500, { error: 'Kunne ikke legge til eksisterende elev.' });
      }

      student = data;
    }

    const { data: tutorProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', authData.user.id)
      .maybeSingle();

    const tutorName = tutorProfile?.full_name || authData.user.user_metadata?.full_name || 'Læreren din';
    const notificationBody = `${tutorName} har lagt deg til som elev i TutorFlyt.`;

    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: profile.id,
        type: 'student_linked',
        title: 'Du er lagt til hos en lærer',
        body: notificationBody,
        message: notificationBody,
        link: '/student/dashboard',
        is_read: false,
      });

    return json(200, { success: true, student, profile });
  } catch (error) {
    console.error('Error linking existing student:', error);
    return json(500, { error: 'Kunne ikke invitere eksisterende elev.' });
  }
}
