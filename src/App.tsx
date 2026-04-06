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

// Memory fallback for session ID (persists during tab session even if localStorage is blocked)
let memorySessionId: string | null = null;
let lastLocalUpdate = 0;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{name: string, email: string, hasPaid: boolean, role?: string} | null>(null);
  const [pendingUser, setPendingUser] = useState<{name: string, email: string, password: string} | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Robust session ID access
  const getSessionId = () => {
    if (memorySessionId) return memorySessionId;
    try {
      const sid = localStorage.getItem('tutorflyt_session_id');
      if (sid) memorySessionId = sid;
      return sid;
    } catch (e) {
      return null;
    }
  };

  const saveSessionId = (id: string | null) => {
    memorySessionId = id;
    lastLocalUpdate = Date.now();
    try {
      if (id) {
        localStorage.setItem('tutorflyt_session_id', id);
      } else {
        localStorage.removeItem('tutorflyt_session_id');
      }
    } catch (e) {
      // Storage blocked
    }
  };

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(getSessionId());

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

      // Hent profil og sesjons-ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, last_session_id, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) console.error("Feil ved henting av profil:", profileError);

      // Sjekk om brukeren ligger i students-tabellen
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle();

      const isStudent = !!studentData || session.user.user_metadata?.role === 'student' || profile?.role === 'student';
      const role = isStudent ? 'student' : 'tutor';
      const hasPaid = role === 'student' || profile?.subscription_status === 'active';

      // --- Single Session Logic ---
      const generateId = () => {
        try {
          return crypto.randomUUID();
        } catch (e) {
          return Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
      };

      let localSid = getSessionId();
      const dbSid = profile?.last_session_id;

      if (event === 'SIGNED_IN') {
        const newSessionId = generateId();
        saveSessionId(newSessionId);
        setCurrentSessionId(newSessionId);
        
        await supabase
          .from('profiles')
          .update({ last_session_id: newSessionId })
          .eq('id', session.user.id);
          
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_UP') {
        if (!localSid) {
          if (dbSid) {
            // Hvis vi mangler lokal ID (f.eks. første gang i en ny fane), adopterer vi DB-sesjonen
            saveSessionId(dbSid);
            setCurrentSessionId(dbSid);
          } else {
            // Ingen ID noen steder: opprett en ny
            const newSid = generateId();
            saveSessionId(newSid);
            setCurrentSessionId(newSid);
            await supabase.from('profiles').update({ last_session_id: newSid }).eq('id', session.user.id);
          }
        } else if (dbSid && dbSid !== localSid) {
          // STRENG SJEKK: Hvis vi har en lokal ID, men den er annerledes enn i DB, 
          // betyr det at noen andre har logget inn etter oss.
          console.warn("Sesjon ugyldig: Innlogging oppdaget på en annen enhet");
          await supabase.auth.signOut();
          setUser(null);
          saveSessionId(null);
          navigate('/login');
          return;
        }
      }
      // --- End Single Session Logic ---

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

  // Realtime listener for session invalidation
  useEffect(() => {
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
            const localSessionId = getSessionId();
            
            // Ignore updates that happen very close to our own local update (to prevent self-logout)
            const timeSinceLastUpdate = Date.now() - lastLocalUpdate;
            if (timeSinceLastUpdate < 2000) return;

            if (newSessionId && localSessionId && newSessionId !== localSessionId) {
              console.warn("Logged out due to login on another device");
              supabase.auth.signOut().then(() => {
                setUser(null);
                saveSessionId(null);
                navigate('/login');
              });
            }
          })
          .subscribe();
      }
    };

    if (user) {
      setupRealtime();
    }

    return () => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
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
