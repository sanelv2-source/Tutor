import { createClient } from '@supabase/supabase-js';
import {
  getAdminAnalyticsSummary,
  getBearerToken,
  requireAdminUser,
} from '../shared/admin-analytics-core.mjs';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const token = getBearerToken(event.headers.authorization || event.headers.Authorization);

  try {
    await requireAdminUser(supabaseAdmin, token);
    const summary = await getAdminAnalyticsSummary(supabaseAdmin);
    return json(200, summary);
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode >= 500) {
      console.error('Admin analytics error:', error);
    }
    return json(statusCode, { error: error?.message || 'Kunne ikke hente admin-data.' });
  }
}
