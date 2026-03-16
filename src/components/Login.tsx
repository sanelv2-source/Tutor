import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import Logo from './Logo';
import { supabase } from '../supabaseClient';

export default function Login({ onNavigate, setUser }: { onNavigate: (page: string) => void, setUser: (user: any) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      setIsLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        const authWindow = window.open(
          data.url,
          'oauth_popup',
          'width=600,height=700'
        );

        if (!authWindow) {
          setError('Vennligst tillat popup-vinduer for å logge inn med ' + provider);
          setIsLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En feil oppstod');
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        throw error;
      }

      setIsMagicLinkSent(true);
    } catch (err: any) {
      console.error('Magic link error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Kunne ikke sende magisk lenke';
      
      if (errorMessage === '{}' || (typeof err === 'object' && Object.keys(err).length === 0)) {
        errorMessage = 'Kunne ikke sende magisk lenke. Sjekk at magiske lenker er aktivert i Supabase-prosjektet ditt, og at SMTP er konfigurert.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        // Nå leser vi rollen fra metadataene som vi nettopp lagret
        const userRole = data.user.user_metadata?.role;
        
        // Ruting basert på rolle
        if (userRole === 'student') {
          navigate('/student/dashboard');
        } else {
          navigate('/tutor/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Innlogging feilet';
      
      if (errorMessage === '{}' || (typeof err === 'object' && Object.keys(err).length === 0)) {
        errorMessage = 'Kunne ikke logge inn. Sjekk at e-post/passord-innlogging er aktivert i Supabase-prosjektet ditt.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      <button 
        onClick={() => onNavigate('landing')}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tilbake til forsiden
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center cursor-pointer" onClick={() => onNavigate('landing')}>
          <Logo iconSize="w-16 h-16 text-4xl" textSize="text-3xl" showText={false} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-3">
          Velkommen til TutorFlyt
          <Send className="w-8 h-8 text-teal-600" />
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Ditt verktøy for en enklere undervisningshverdag
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <h3 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            Logg inn
          </h3>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isMagicLinkSent ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                <Mail className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Sjekk e-posten din</h3>
              <p className="text-sm text-slate-500 mb-6">
                Vi har sendt en magisk innloggingslenke til <strong>{email}</strong>. Klikk på lenken i e-posten for å logge inn.
              </p>
              <button
                onClick={() => setIsMagicLinkSent(false)}
                className="text-sm font-medium text-teal-600 hover:text-teal-500"
              >
                Prøv en annen e-postadresse
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={usePassword ? handleSubmit : handleMagicLink}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  E-postadresse
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                    placeholder="din@epost.no"
                    required
                  />
                </div>
              </div>

              {usePassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Passord
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 cursor-pointer">
                    Husk meg
                  </label>
                </div>

                <div className="text-sm">
                  <button 
                    type="button" 
                    onClick={() => setUsePassword(!usePassword)}
                    className="font-medium text-teal-600 hover:text-teal-500 transition-colors"
                  >
                    {usePassword ? 'Bruk magisk lenke' : 'Logg inn med passord'}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sender...' : (
                    <>
                      {usePassword ? 'Logg inn' : 'Send magisk lenke'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {!isMagicLinkSent && (
            <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Eller fortsett med
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <span className="sr-only">Logg inn med Google</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('apple')}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <span className="sr-only">Logg inn med Apple</span>
                  <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.89-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6 1.22 1.11-.34 2.52-1.22 4.06-1.22 1.31 0 3.004.48 4.02 2.02-3.13 1.98-2.61 5.98.18 7.32-.25.58-.55 1.16-.91 1.73z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
        
        <p className="mt-8 text-center text-sm text-slate-500">
          Har du ikke en konto?{' '}
          <button onClick={() => onNavigate('signup')} className="font-medium text-teal-600 hover:text-teal-500 transition-colors">
            Registrer deg her
          </button>
        </p>
      </div>
    </div>
  );
}
