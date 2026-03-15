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
import ClientPortal from './components/ClientPortal';
import HowItWorks from './components/HowItWorks';
import Pricing from './components/Pricing';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './components/Unauthorized';

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

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('tutorflyt_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tutorflyt_user');
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Simple heuristic for prototype: if they have a specific metadata flag or we can just check if they were invited
        // For now, let's assume if they don't have a name set, they might be a student, but actually we should check metadata
        const role = session.user.user_metadata?.role || 'tutor';
        setUser(prev => prev || {
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Bruker',
          email: session.user.email || '',
          hasPaid: true,
          role: role
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || 'tutor';
        setUser({
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Bruker',
          email: session.user.email || '',
          hasPaid: true,
          role: role
        });
        if (_event === 'SIGNED_IN') {
          if (role === 'student') {
            navigate('/student/dashboard');
          } else {
            navigate('/tutor/dashboard');
          }
        }
      } else {
        setUser(null);
      }
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
            <ClientPortal portalId="default" />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
