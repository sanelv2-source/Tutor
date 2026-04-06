import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle2, Lock } from 'lucide-react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Signup from './components/Signup';
import Payment from './components/Payment';
import Verify from './components/Verify';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import Contact from './components/Contact';
import About from './components/About';
import EmailPreview from './components/EmailPreview';
import StudentDashboard from './components/StudentDashboard';
import HowItWorks from './components/HowItWorks';
import Pricing from './components/Pricing';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './components/Unauthorized';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{name: string, email: string, hasPaid: boolean, role?: string} | null>(null);
  const [pendingUser, setPendingUser] = useState<{name: string, email: string, password: string} | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem('tutorflyt_session_id'));

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('tutorflyt_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tutorflyt_user');
    }
  }, [user]);

  useEffect(() => {
    const checkRoleAndSetUser = async (session: any, event?: string) => {
      if (!session?.user || !session.user.email) {
        setUser(null);
        setIsAuthReady(true);
        return;
      }

      // Sjekk om brukeren ligger i students-tabellen
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle();

      // Hent betalingsstatus og sesjons-ID fra profiles-tabellen
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, last_session_id')
        .eq('id', session.user.id)
        .maybeSingle();

      const isStudent = !!studentData || session.user.user_metadata?.role === 'student';
      const role = isStudent ? 'student' : 'tutor';
      const hasPaid = role === 'student' || profile?.subscription_status === 'active';

      // Single session logic: If this is a new login, update the session ID
      if (event === 'SIGNED_IN') {
        const newSessionId = crypto.randomUUID();
        localStorage.setItem('tutorflyt_session_id', newSessionId);
        setCurrentSessionId(newSessionId);
        
        // Update profile with new session ID
        await supabase
          .from('profiles')
          .update({ last_session_id: newSessionId })
          .eq('id', session.user.id);
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_UP') {
        // On initial load, if we don't have a session ID in localStorage, create one
        let sid = localStorage.getItem('tutorflyt_session_id');
        if (!sid) {
          sid = crypto.randomUUID();
          localStorage.setItem('tutorflyt_session_id', sid);
          setCurrentSessionId(sid);
          
          // Update profile
          await supabase
            .from('profiles')
            .update({ last_session_id: sid })
            .eq('id', session.user.id);
        } else {
          setCurrentSessionId(sid);
          
          // Check if the session ID matches the one in the database
          if (profile && profile.last_session_id && profile.last_session_id !== sid) {
            console.warn("Session invalidated by another login");
            await supabase.auth.signOut();
            setUser(null);
            navigate('/login');
            return;
          }
        }
      }

      setUser({
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Bruker',
        email: session.user.email || '',
        hasPaid: hasPaid,
        role: role
      });
      setIsAuthReady(true);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const path = window.location.pathname;
        
        // Tving KUN til betaling hvis de prøver å nå lærer-området uten å ha betalt
        if (path.startsWith('/tutor') && role === 'tutor' && !hasPaid) {
          navigate('/payment');
          return;
        }

        // Standard navigering for de som er på forsiden eller innloggingssider
        if (path === '/' || path === '/login' || path === '/signup') {
          if (role === 'student') {
            navigate('/student/dashboard');
          } else {
            if (hasPaid) {
              navigate('/tutor/dashboard');
            } else {
              navigate('/payment');
            }
          }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkRoleAndSetUser(session, 'INITIAL_SESSION');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkRoleAndSetUser(session, _event);
    });

    // Realtime listener for session invalidation
    let profileSubscription: any = null;
    
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        profileSubscription = supabase
          .channel(`public:profiles:id=eq.${session.user.id}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          }, (payload) => {
            const newSessionId = payload.new.last_session_id;
            const localSessionId = localStorage.getItem('tutorflyt_session_id');
            
            if (newSessionId && localSessionId && newSessionId !== localSessionId) {
              console.warn("Logged out due to login on another device");
              supabase.auth.signOut().then(() => {
                setUser(null);
                navigate('/login');
              });
            }
          })
          .subscribe();
      }
    };

    setupRealtime();

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
    };
  }, [navigate]);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (location.pathname === '/success' && user && !user.hasPaid) {
      // Mark user as paid in frontend and backend
      const updatePaymentStatus = async () => {
        setIsProcessingPayment(true);
        try {
          await fetch('/api/payment/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
          });
          setUser({ ...user, hasPaid: true });
        } catch (err) {
          console.error("Failed to update payment status:", err);
        } finally {
          setIsProcessingPayment(false);
        }
      };
      updatePaymentStatus();
    }
  }, [location.pathname, user]);

  const showNavbar = ['/', '/how-it-works', '/pricing', '/privacy', '/terms', '/contact', '/about'].includes(location.pathname);

  // Helper function to pass to legacy components that still use onNavigate
  const handleNavigate = (page: string) => {
    const routes: Record<string, string> = {
      'landing': '/',
      'login': '/login',
      'signup': '/signup',
      'dashboard': '/tutor/dashboard',
      'portal': '/student/dashboard',
      'payment': '/payment',
      'verify': '/verify',
      'how-it-works': '/how-it-works',
      'pricing': '/pricing',
      'privacy': '/privacy',
      'terms': '/terms',
      'contact': '/contact',
      'about': '/about',
      'emails': '/emails',
      'unauthorized': '/unauthorized'
    };
    navigate(routes[page] || '/');
  };

  return (
    <>
      {showNavbar && <Navbar onNavigate={handleNavigate} />}
      <Routes>
        <Route path="/" element={<Landing onNavigate={handleNavigate} setUser={setUser} />} />
        <Route path="/login" element={<Login onNavigate={handleNavigate} setUser={setUser} />} />
        <Route path="/signup" element={<Signup onNavigate={handleNavigate} setPendingUser={setPendingUser} />} />
        <Route path="/payment" element={<Payment onNavigate={handleNavigate} user={user} setUser={setUser} pendingUser={pendingUser} setPendingUser={setPendingUser} />} />
        
        {/* Kun lærere kan se dashboardet sitt */}
        <Route path="/tutor/dashboard" element={
          <ProtectedRoute allowedRole="tutor" user={user} isAuthReady={isAuthReady}>
            <Dashboard onNavigate={handleNavigate} user={user} onLogout={async () => { 
              await supabase.auth.signOut();
              setUser(null); 
              navigate('/'); 
            }} />
          </ProtectedRoute>
        } />
        
        {/* Kun eleven kan se sin portal */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute allowedRole="student" user={user} isAuthReady={isAuthReady}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/verify" element={<Verify onNavigate={handleNavigate} setUser={setUser} />} />
        <Route path="/how-it-works" element={<HowItWorks onNavigate={handleNavigate} />} />
        <Route path="/pricing" element={<Pricing onNavigate={handleNavigate} />} />
        <Route path="/privacy" element={<Privacy onNavigate={handleNavigate} />} />
        <Route path="/terms" element={<Terms onNavigate={handleNavigate} />} />
        <Route path="/contact" element={<Contact onNavigate={handleNavigate} />} />
        <Route path="/about" element={<About onNavigate={handleNavigate} />} />
        <Route path="/emails" element={<EmailPreview onNavigate={handleNavigate} />} />
        <Route path="/unauthorized" element={<Unauthorized onNavigate={handleNavigate} />} />
        <Route path="/success" element={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {isProcessingPayment ? 'Aktiverer konto...' : 'Betaling vellykket!'}
              </h2>
              <p className="text-slate-600 mb-8">
                {isProcessingPayment 
                  ? 'Vennligst vent mens vi oppdaterer din profil.' 
                  : 'Velkommen som Pro-bruker. Du kan nå ta i bruk alle funksjoner.'}
              </p>
              <button 
                onClick={() => navigate('/tutor/dashboard')}
                disabled={isProcessingPayment}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isProcessingPayment ? 'Vennligst vent...' : 'Gå til dashbordet'}
              </button>
            </div>
          </div>
        } />
        <Route path="/cancel" element={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Betaling avbrutt</h2>
              <p className="text-slate-600 mb-8">Ingen bekymring, du har ikke blitt belastet. Du kan prøve igjen når som helst.</p>
              <button 
                onClick={() => navigate('/payment')}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Tilbake til betaling
              </button>
            </div>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
