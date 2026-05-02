import { createClient } from '@supabase/supabase-js';
import { deleteAccountForUser, getBearerToken, json } from '../shared/account-delete-core.mjs';

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
    return json(401, { error: 'Du må være logget inn for å slette kontoen.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    const result = await deleteAccountForUser(supabaseAdmin, authData.user);
    return json(200, { success: true, ...result });
  } catch (error) {
    console.error('Account deletion error:', error);
    return json(500, { error: error.message || 'Kunne ikke slette kontoen.' });
  }
}
