import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Logo from './Logo';
import { supabase } from '../supabaseClient';

const PASSWORD_RECOVERY_FLAG = 'tutorflyt_password_recovery';

const getRecoveryParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return {
    tokenHash: searchParams.get('token_hash') || hashParams.get('token_hash'),
    type: searchParams.get('type') || hashParams.get('type'),
  };
};

const clearRecoveryUrl = () => {
  if (window.location.search || window.location.hash) {
    window.history.replaceState(null, document.title, '/reset-password');
  }
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const setReady = (isReady: boolean, message = '') => {
      if (!isMounted) return;
      setHasRecoverySession(isReady);
      setError(message);
      setIsVerifying(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        try {
          sessionStorage.setItem(PASSWORD_RECOVERY_FLAG, 'true');
        } catch (e) {
          // Ignore storage errors
        }
        clearRecoveryUrl();
        setReady(!!session, session ? '' : 'Tilbakestillingslenken er ugyldig eller utløpt. Be om en ny lenke.');
      }
    });

    const verifyRecoveryLink = async () => {
      try {
        const { tokenHash, type } = getRecoveryParams();

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (verifyError) throw verifyError;

          try {
            sessionStorage.setItem(PASSWORD_RECOVERY_FLAG, 'true');
          } catch (e) {
            // Ignore storage errors
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Kunne ikke bekrefte tilbakestillingslenken.');
          }

          clearRecoveryUrl();
          setReady(true);
          return;
        }

        if (type === 'recovery') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const { data: { session } } = await supabase.auth.getSession();
        const hasRecoveryFlag = (() => {
          try {
            return sessionStorage.getItem(PASSWORD_RECOVERY_FLAG) === 'true';
          } catch (e) {
            return false;
          }
        })();

        if (session && hasRecoveryFlag) {
          clearRecoveryUrl();
          setReady(true);
          return;
        }

        setReady(false, 'Tilbakestillingslenken er ugyldig eller utløpt. Be om en ny lenke.');
      } catch (err: any) {
        console.error('Password recovery verification error:', err);
        setReady(false, 'Tilbakestillingslenken er ugyldig eller utløpt. Be om en ny lenke.');
      }
    };

    verifyRecoveryLink();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const abandonPasswordReset = async (destination = '/login') => {
    try {
      sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG);
    } catch (e) {
      // Ignore storage errors
    }
    await supabase.auth.signOut();
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasRecoverySession) {
      setError('Tilbakestillingslenken er ugyldig eller utløpt. Be om en ny lenke.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passordene er ikke like');
      return;
    }

    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      try {
        sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG);
      } catch (e) {
        // Ignore storage errors
      }
      await supabase.auth.signOut();

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Kunne ikke oppdatere passord');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-10 shadow-xl sm:rounded-2xl border border-slate-100 text-center">
            <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Sjekker lenken...</h2>
            <p className="text-slate-600">
              Vent litt mens vi bekrefter tilbakestillingslenken din.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasRecoverySession && error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-10 shadow-xl sm:rounded-2xl border border-slate-100 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Lenken virker ikke</h2>
            <p className="text-slate-600 mb-8">{error}</p>
            <button
              onClick={() => abandonPasswordReset('/login')}
              className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors"
            >
              Gå til innlogging
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-10 shadow-xl sm:rounded-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Passordet er oppdatert!</h2>
            <p className="text-slate-600 mb-8">
              Ditt passord er nå endret. Du blir videresendt til innlogging om noen sekunder.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors"
            >
              Gå til innlogging nå
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      <button 
        onClick={() => abandonPasswordReset('/login')}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tilbake til innlogging
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo iconSize="w-16 h-16 text-4xl" textSize="text-3xl" showText={false} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Lag nytt passord
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Velg et nytt og sikkert passord for din konto
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Nytt passord
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Gjenta nytt passord
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Oppdaterer...' : 'Oppdater passord'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
