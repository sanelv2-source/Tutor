import React from 'react';
import { CheckCircle2, Lock, LogOut } from 'lucide-react';
import Logo from './Logo';
import { supabase } from '../supabaseClient';

const TEMP_ADMIN_PASSWORD = 'Tutorflyt23';

function useNoIndex() {
  React.useEffect(() => {
    const previousRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousContent = previousRobots?.getAttribute('content') || null;
    const robots = previousRobots || document.createElement('meta');

    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex,nofollow');
    if (!previousRobots) document.head.appendChild(robots);

    return () => {
      if (previousRobots && previousContent) {
        previousRobots.setAttribute('content', previousContent);
      } else if (!previousRobots) {
        robots.remove();
      }
    };
  }, []);
}

export default function AdminPasswordChange({
  onChanged,
  onLogout,
}: {
  onChanged: () => void;
  onLogout: () => void;
}) {
  useNoIndex();

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passordene er ikke like.');
      return;
    }

    if (password.length < 12) {
      setError('Velg et passord på minst 12 tegn.');
      return;
    }

    if (password === TEMP_ADMIN_PASSWORD) {
      setError('Du må velge et nytt passord, ikke det midlertidige passordet.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Admin-sesjonen er utløpt. Logg inn på nytt.');

      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          force_password_change: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      setSuccess(true);
      setTimeout(onChanged, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere passord.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo iconSize="w-14 h-14 text-3xl" textSize="text-2xl" showText={false} />
        </div>
        <h1 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-950">
          Bytt admin-passord
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Første innlogging med midlertidig passord krever nytt passord før adminpanelet åpnes.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Passordet er oppdatert.
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700">
                Nytt passord
              </label>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-confirm-password" className="block text-sm font-semibold text-slate-700">
                Gjenta nytt passord
              </label>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Oppdaterer...' : 'Oppdater passord'}
            </button>
          </form>

          <button
            type="button"
            onClick={onLogout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Logg ut
          </button>
        </div>
      </div>
    </div>
  );
}
