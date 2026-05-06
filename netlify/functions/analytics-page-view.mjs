import { createClient } from '@supabase/supabase-js';
import { getGeoFromHeaders, recordPageViewEvent } from '../shared/visitor-analytics-core.mjs';

const json = (statusCode, body) => new Response(JSON.stringify(body), {
  status: statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
});

export default async function handler(request, context) {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Netlify.env.get('SUPABASE_URL') || Netlify.env.get('VITE_SUPABASE_URL') || '';
  const serviceRoleKey = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Ugyldig forespørsel.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const geo = context?.geo || getGeoFromHeaders(request.headers);

  try {
    await recordPageViewEvent(supabaseAdmin, payload, geo);
    return json(202, { success: true });
  } catch (error) {
    console.error('Page view analytics error:', error);
    return json(500, { error: 'Kunne ikke lagre sidevisning.' });
  }
}

export const config = {
  path: '/api/analytics/page-view',
};
