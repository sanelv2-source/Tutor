import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

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

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) {
    return json(400, { error: 'E-post er pakrevd.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('Profile lookup error:', fetchError);
      return json(500, { error: 'Kunne ikke hente profil.' });
    }

    if (!profile) {
      return json(404, { error: 'Profil ikke funnet' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: 'active' })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Profile payment update error:', updateError);
      return json(500, { error: 'Kunne ikke oppdatere betalingsstatus' });
    }

    return json(200, { success: true });
  } catch (error) {
    console.error('Error processing payment:', error);
    return json(500, { error: 'Kunne ikke oppdatere betalingsstatus' });
  }
}
