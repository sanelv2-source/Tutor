import { createClient } from '@supabase/supabase-js';
import {
  generateTeacherAssistantContent,
  normalizeTeacherAssistantRequest,
} from '../shared/teacher-ai-core.mjs';

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

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return json(401, { error: 'Du må være logget inn for å bruke AI-assistenten.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !authKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, authKey);
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    const request = normalizeTeacherAssistantRequest({
      ...payload,
      teacherName: payload.teacherName || authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Lærer',
    });
    const content = await generateTeacherAssistantContent(request);

    return json(200, { content });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode >= 500) {
      console.error('Teacher AI error:', error);
    }
    return json(statusCode, { error: error?.message || 'Kunne ikke generere AI-utkast.' });
  }
}
