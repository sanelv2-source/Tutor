import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import { supabase } from '../supabaseClient';
import { trackEvent } from '../utils/analytics';

export default function Signup({ onNavigate, setPendingUser }: { onNavigate: (page: string) => void, setPendingUser: (user: any) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!name || !email || !password) {
      setError('Vennligst fyll ut alle feltene');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Passordet må være minst 8 tegn');
      setIsLoading(false);
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name,
            email: normalizedEmail,
            role: 'tutor',
            plan: 'free',
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      setPendingUser(null);

      if (data.user && data.session) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: normalizedEmail,
          full_name: name,
          role: 'tutor',
          plan: 'free',
          subscription_status: 'inactive',
        });
      }

      await trackEvent('signup_completed', { role: 'tutor', plan: 'free', source: 'free_signup' }, { userId: data.user?.id });

      if (data.session) {
        onNavigate('dashboard');
      } else {
        setSuccessMessage('Kontoen er opprettet. Sjekk e-posten din for å bekrefte innloggingen.');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err?.message || 'En ukjent feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      <button 
        onClick={() => onNavigate('landing')}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tilbake til forsiden
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center cursor-pointer mb-4" onClick={() => onNavigate('landing')}>
          <Logo iconSize="w-14 h-14 text-3xl" textSize="text-2xl" showText={false} />
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</div>
            <span className="text-sm font-bold text-slate-900">Konto</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm">2</div>
            <span className="text-sm font-medium text-slate-500">Gratis plan</span>
          </div>
        </div>

        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Opprett din bruker
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Kom i gang med Tutorflyt uten kostnad
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {(error || successMessage) && (
            <div className={`mb-4 border px-4 py-3 rounded-lg text-sm ${error ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              {error || successMessage}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Fullt navn
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                  placeholder="Ola Nordmann"
                />
              </div>
            </div>

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
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                  placeholder="din@epost.no"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                  placeholder="Minst 8 tegn"
                  required
                />
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300 rounded cursor-pointer"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="font-medium text-slate-700 cursor-pointer">
                  Jeg har lest og aksepterer TutorFlyt sine <button type="button" onClick={() => onNavigate('terms')} className="text-indigo-600 hover:underline">bruksvilkår</button>.
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Oppretter konto...' : (
                  <>
                    Opprett konto
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <p className="mt-8 text-center text-sm text-slate-500">
          Har du allerede en konto?{' '}
          <button onClick={() => onNavigate('login')} className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            Logg inn her
          </button>
        </p>
      </div>
    </div>
  );
}
