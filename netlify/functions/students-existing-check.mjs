import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

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
    return json(401, { error: 'Du må være logget inn for å sjekke elever.' });
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
      return json(500, { error: 'Kunne ikke sjekke om eleven finnes.' });
    }

    const { data: linkedStudents, error: linkedStudentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, email, subject, profile_id')
      .eq('tutor_id', authData.user.id)
      .or(`email.eq.${email}${profile?.id ? `,profile_id.eq.${profile.id}` : ''}`)
      .limit(1);

    if (linkedStudentError) {
      console.error('Existing linked student lookup error:', linkedStudentError);
      return json(500, { error: 'Kunne ikke sjekke lærerens elevliste.' });
    }

    const linkedStudent = linkedStudents?.[0] || null;

    return json(200, {
      exists: !!profile,
      alreadyLinked: !!linkedStudent,
      profile: profile
        ? {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
          }
        : null,
      student: linkedStudent || null,
    });
  } catch (error) {
    console.error('Error checking existing student:', error);
    return json(500, { error: 'Kunne ikke sjekke om eleven finnes.' });
  }
}
