import { supabase } from '../supabaseClient';
import { readApiJson } from './api';

export async function deleteCurrentAccount() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Du må være logget inn for å slette kontoen.');
  }

  const response = await fetch('/api/account/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ confirm: true }),
  });

  return readApiJson(response, 'Kunne ikke slette kontoen.');
}

export async function clearAccountSession() {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});

  try {
    localStorage.removeItem('tutorflyt_user');
    localStorage.removeItem('tutorflyt_auth_token');
  } catch {
    // Ignore storage cleanup errors.
  }
}
