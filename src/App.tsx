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
import ResetPassword from './components/ResetPassword';
import HowItWorks from './components/HowItWorks';
import Pricing from './components/Pricing';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './components/Unauthorized';
import AcceptInvite from './components/AcceptInvite';
import { InvoicePage } from './components/InvoicePage';

// Inactivity timeout (45 minutes)
const INACTIVITY_TIMEOUT = 45 * 60 * 1000;
const PASSWORD_RECOVERY_FLAG = 'tutorflyt_password_recovery';

const isPasswordResetPage = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/reset-password';
};

const hasPasswordRecoveryMarker = () => {
  if (typeof window === 'undefined') return false;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return (
    searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    searchParams.has('token_hash') ||
    hashParams.has('token_hash')
  );
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{name: string, email: string, hasPaid: boolean, role?: string} | null>(null);
  const [pendingUser, setPendingUser] = useState<{name: string, email: string, password: string} | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Save user to localStorage whenever it changes
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('tutorflyt_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('tutorflyt_user');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [user]);

  useEffect(() => {
    const checkRoleAndSetUser = async (session: any, event?: string) => {
      if (!session?.user || !session.user.email) {
        setUser(null);
        setIsAuthReady(true);
        return;
      }

      const isStoredRecovery = (() => {
        try {
          return sessionStorage.getItem(PASSWORD_RECOVERY_FLAG) === 'true';
        } catch (e) {
          return false;
        }
      })();
      const hasRecoveryMarker = hasPasswordRecoveryMarker();
      const isRecoveryFlow = event === 'PASSWORD_RECOVERY' || hasRecoveryMarker || (isPasswordResetPage() && isStoredRecovery);

      if (isRecoveryFlow) {
        try {
          if (event === 'PASSWORD_RECOVERY' || hasRecoveryMarker) {
            sessionStorage.setItem(PASSWORD_RECOVERY_FLAG, 'true');
          }
        } catch (e) {
          // Ignore storage errors
        }
        setUser(null);
        setIsAuthReady(true);
        return;
      }

      // Hent profil og sesjons-ID med retry-logikk for å håndtere "Failed to fetch" i AI Studio
      let profile = null;
      let profileError = null;
      let retries = 3;

      while (retries > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, last_session_id, role')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (!error) {
          profile = data;
          break;
        }

        profileError = error;
        // Hvis det er en nettverksfeil (Failed to fetch), prøv igjen etter en kort pause
        if (error.message?.includes('fetch') || error.message?.includes('Network')) {
          console.warn(`Nettverksfeil ved henting av profil, prøver på nytt... (${retries} forsøk igjen)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        } else {
          // Andre feil (f.eks. RLS) bør ikke prøves på nytt
          break;
        }
      }

      if (profileError) {
        console.error("Feil ved henting av profil etter flere forsøk:", profileError);
        
        // Sjekk om det kan skyldes manglende konfigurasjon
        const url = import.meta.env.VITE_SUPABASE_URL;
        const isPlaceholder = !url || url.includes('placeholder-project');
        if (isPlaceholder) {
          console.error("Supabase-konfigurasjon mangler! Vennligst sett VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i 'Settings'-menyen.");
        }
      }

      // Sjekk om brukeren ligger i students-tabellen med retry
      let studentData = null;
      let studentRetries = 2;
      while (studentRetries > 0) {
        const { data, error } = await supabase
          .from('students')
          .select('id')
          .eq('email', session.user.email)
          .maybeSingle();
        
        if (!error) {
          studentData = data;
          break;
        }
        
        if (error.message?.includes('fetch') || error.message?.includes('Network')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          studentRetries--;
        } else {
          break;
        }
      }

      const isStudent = !!studentData || session.user.user_metadata?.role === 'student' || profile?.role === 'student';
      const role = isStudent ? 'student' : 'tutor';
      const hasPaid = role === 'student' || profile?.subscription_status === 'active';

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

    // Consolidated auth initialization
    let isInitialCheckDone = false;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await checkRoleAndSetUser(session, 'INITIAL_SESSION');
      } else {
        setIsAuthReady(true);
      }
      isInitialCheckDone = true;
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip the first event if we already handled it in initAuth to avoid race conditions
      if (_event === 'INITIAL_SESSION' && isInitialCheckDone) return;
      checkRoleAndSetUser(session, _event);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Inactivity auto-logout logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(async () => {
          console.log("Logging out due to inactivity");
          await supabase.auth.signOut();
          setUser(null);
          navigate('/login');
        }, INACTIVITY_TIMEOUT);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    if (user) {
      events.forEach(event => {
        window.addEventListener(event, resetTimer);
      });
      resetTimer(); // Initial start
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, navigate]);

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
        <Route path="/student/accept-invite" element={<AcceptInvite />} />
        <Route path="/invoice/:publicToken" element={<InvoicePage />} />
        
        <Route path="/verify" element={<Verify onNavigate={handleNavigate} setUser={setUser} />} />
        <Route path="/how-it-works" element={<HowItWorks onNavigate={handleNavigate} />} />
        <Route path="/pricing" element={<Pricing onNavigate={handleNavigate} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy onNavigate={handleNavigate} />} />
        <Route path="/terms" element={<Terms onNavigate={handleNavigate} />} />
        <Route path="/contact" element={<Contact onNavigate={handleNavigate} />} />
        <Route path="/about" element={<About onNavigate={handleNavigate} />} />
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
