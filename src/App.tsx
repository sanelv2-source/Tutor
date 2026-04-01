import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
import CompleteProfile from './components/CompleteProfile';
import { InvoicePage } from './components/InvoicePage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{name: string, email: string, hasPaid: boolean, role?: string} | null>(() => {
    const saved = localStorage.getItem('tutorflyt_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isInitializing, setIsInitializing] = useState(true);

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
        setIsInitializing(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const role = profile?.role;

      setUser({
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Bruker',
        email: session.user.email || '',
        hasPaid: true,
        role: role
      });

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Sørg for at vi bare tvinger navigering hvis de er på forsiden eller innloggingssider
        const path = window.location.pathname;
        if (path === '/' || path === '/login' || path === '/signup') {
          if (role === 'tutor') {
            navigate('/tutor/dashboard');
          } else if (role === 'student') {
            navigate('/student/dashboard');
          } else {
            navigate('/complete-profile');
          }
        }
      }
      setIsInitializing(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkRoleAndSetUser(session, 'INITIAL_SESSION');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkRoleAndSetUser(session, _event);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {showNavbar && <Navbar onNavigate={handleNavigate} />}
      <Routes>
        <Route path="/" element={<Landing onNavigate={handleNavigate} setUser={setUser} />} />
        <Route path="/login" element={<Login onNavigate={handleNavigate} setUser={setUser} />} />
        <Route path="/signup" element={<Signup onNavigate={handleNavigate} />} />
        <Route path="/payment" element={<Payment onNavigate={handleNavigate} user={user} setUser={setUser} />} />
        
        {/* Kun lærere kan se dashboardet sitt */}
        <Route path="/tutor/dashboard" element={
          <ProtectedRoute allowedRole="tutor" user={user}>
            <Dashboard onNavigate={handleNavigate} user={user} onLogout={async () => { 
              await supabase.auth.signOut();
              setUser(null); 
              navigate('/'); 
            }} />
          </ProtectedRoute>
        } />
        
        {/* Kun eleven kan se sin portal */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute allowedRole="student" user={user}>
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
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/invoice/:publicToken" element={<InvoicePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
