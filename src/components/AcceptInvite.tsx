import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || searchParams.get('token');

  console.log('TOKEN FROM URL:', token);

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error && error.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      } else if (session?.user) {
        setExistingUser(session.user);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Ingen invitasjonslenke funnet.');
        setLoading(false);
        return;
      }

      try {
        // DEBUG SNIPPET START
        const { data: debugData, error: debugError } = await supabase
          .from('student_invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .single();

        console.log('DATA:', debugData);
        console.log('ERROR:', debugError);
        // DEBUG SNIPPET END

        const response = await fetch('/api/invitations/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Ugyldig invitasjon');
        } else {
          setInvitation(data.invitation);
        }
      } catch (err: any) {
        setError('Kunne ikke validere invitasjonen. Prøv igjen senere.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const finalizeStudentInvitation = async (token: string) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.id || !user.email) {
      throw new Error('Fant ikke innlogget bruker.');
    }

    const normalizedEmail = user.email.trim().toLowerCase();

    const { data: invitation, error: invitationError } = await supabase
      .from('student_invitations')
      .select('id, student_id, email, status, expires_at')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      throw new Error('Fant ikke invitasjonen.');
    }

    if (invitation.email.trim().toLowerCase() !== normalizedEmail) {
      throw new Error('E-post matcher ikke invitasjonen.');
    }

    if (invitation.status !== 'pending') {
      return;
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      throw new Error('Invitasjonen er utløpt.');
    }

    const { error: linkError } = await supabase
      .from('students')
      .update({
        profile_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.student_id);

    if (linkError) {
      throw new Error('Kunne ikke koble student til brukerkonto.');
    }

    const { error: acceptError } = await supabase
      .from('student_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (acceptError) {
      throw new Error('Kunne ikke markere invitasjonen som akseptert.');
    }
  };

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (existingUser && existingUser.email !== invitation.email) {
      setError(`Du er logget inn med ${existingUser.email}, men invitasjonen er for ${invitation.email}. Vennligst logg ut først.`);
      return;
    }

    if (!existingUser && password !== confirmPassword) {
      setError('Passordene er ikke like');
      return;
    }

    setSignupLoading(true);
    setError(null);

    try {
      let userId = existingUser?.id;

      if (!userId) {
        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: invitation.email,
          password: password,
          options: {
            data: {
              role: 'student'
            }
          }
        });

        if (authError) {
          console.error('Signup failed:', authError);
          throw new Error(`Kunne ikke opprette bruker: ${authError.message}`);
        }

        if (!authData.user) {
          console.error('Signup returned no user');
          throw new Error('Kunne ikke opprette bruker: Ingen bruker returnert');
        }
        userId = authData.user.id;
      }

      // 2. Accept invitation directly via Supabase
      if (token) {
        await finalizeStudentInvitation(token);
      }

      // 4. Navigate to dashboard
      try {
        window.location.href = '/student/dashboard';
      } catch (navError) {
        console.error('Redirect failure:', navError);
        throw new Error('Kunne ikke omdirigere til dashbordet.');
      }
      
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'En feil oppstod under registrering');
    } finally {
      setSignupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-slate-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Ugyldig invitasjon</h1>
          <p className="text-slate-600 mb-8">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Gå til forsiden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-900 tracking-tight">TutorFlyt</span>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Velkommen!</h1>
          <p className="text-slate-600">
            Du har blitt invitert av <strong className="text-slate-900">{invitation?.tutor?.full_name || 'læreren din'}</strong> til å opprette en elevkonto.
          </p>
        </div>

        <div className="bg-indigo-50 rounded-xl p-4 mb-8 border border-indigo-100 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-900">Din e-postadresse</p>
            <p className="text-sm text-indigo-700">{invitation?.email}</p>
          </div>
        </div>

        {existingUser ? (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-800">
                Du er allerede logget inn som <strong>{existingUser.email}</strong>.
              </p>
            </div>
            <button
              onClick={() => handleSignup()}
              disabled={signupLoading}
              className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center"
            >
              {signupLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Aksepter invitasjon'
              )}
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setExistingUser(null);
                setError(null);
              }}
              type="button"
              className="w-full bg-white text-slate-700 border border-slate-200 font-medium py-3.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Logg ut
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Velg et passord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Min. 6 tegn"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bekreft passord
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Gjenta passordet"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={signupLoading}
              className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center"
            >
              {signupLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Opprett konto'
              )}
            </button>
            <div className="text-center mt-4">
              <p className="text-sm text-slate-600">
                Har du allerede en konto?{' '}
                <button 
                  type="button"
                  onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/student/accept-invite?token=${token}`)}`)} 
                  className="text-indigo-600 font-medium hover:underline"
                >
                  Logg inn her
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
