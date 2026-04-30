import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

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

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig foresporsel.' });
  }

  const token = clipText(payload.token, 200);
  if (!token) {
    return json(400, { error: 'Mangler invitasjonstoken.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('student_invitations')
      .select('id, student_id, tutor_id, email, status, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (invitationError) {
      console.error('Invitation validation lookup error:', invitationError);
      return json(500, { error: 'Kunne ikke hente invitasjonen.' });
    }

    if (!invitation) {
      return json(404, { error: 'Fant ikke invitasjonen.' });
    }

    if (invitation.status !== 'pending') {
      return json(410, { error: 'Invitasjonen er ikke lenger aktiv.' });
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      return json(410, { error: 'Invitasjonen er utløpt.' });
    }

    const { data: tutor } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', invitation.tutor_id)
      .maybeSingle();

    return json(200, {
      invitation: {
        id: invitation.id,
        student_id: invitation.student_id,
        email: invitation.email,
        status: invitation.status,
        expires_at: invitation.expires_at,
        tutor: tutor || null,
      },
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    return json(500, { error: 'Kunne ikke validere invitasjonen.' });
  }
}
