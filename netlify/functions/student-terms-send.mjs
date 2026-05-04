import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  getBearerToken,
  json,
  sendStudentTermsEmail,
} from '../shared/student-terms-core.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const resendApiKey = process.env.RESEND_API_KEY || '';

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const supabaseAdmin = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'TutorFlyt <onboarding@resend.dev>';

  const result = await sendStudentTermsEmail({
    supabaseAdmin,
    resend,
    authToken: getBearerToken(event.headers.authorization || event.headers.Authorization),
    payload,
    fromEmail,
  });

  return json(result.statusCode, result.body);
}
