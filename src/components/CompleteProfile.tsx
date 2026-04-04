import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Logo from './Logo';
import { linkStudentProfileByEmail } from '../utils/studentLinking';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error && error.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);

      // Check if profile already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'tutor') {
        navigate('/tutor/dashboard');
      } else if (profile?.role === 'student') {
        navigate('/student/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  const handleComplete = async (role: 'tutor' | 'student') => {
    if (!user) return;
    
    if (role === 'student') {
      setError('Elevkontoer kan kun opprettes via en invitasjonslenke fra læreren din.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: profileError } = await supabase.from('profiles').update({ 
        role: role
      }).eq('id', user.id);

      if (profileError) throw profileError;

      window.location.href = '/tutor/dashboard';
    } catch (err: any) {
      console.error('Profile completion error:', err);
      setError(err.message || 'Kunne ikke opprette profil');
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo iconSize="w-16 h-16 text-4xl" textSize="text-3xl" showText={false} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Fullfør profilen din
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Velg om du er lærer eller elev for å fortsette
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => handleComplete('tutor')}
              disabled={isLoading}
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              Jeg er lærer
            </button>
            <button
              onClick={() => handleComplete('student')}
              disabled={isLoading}
              className="w-full flex justify-center items-center py-4 px-4 border border-slate-200 rounded-xl shadow-sm text-base font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              Jeg er elev
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
