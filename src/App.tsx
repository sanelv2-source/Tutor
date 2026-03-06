import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Signup from './components/Signup';
import Payment from './components/Payment';
import Verify from './components/Verify';
import Privacy from './components/Privacy';
import Contact from './components/Contact';

export default function App() {
  const [page, setPage] = useState('landing');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [user, setUser] = useState<{name: string, email: string, hasPaid: boolean} | null>(null);

  useEffect(() => {
    // Check for verification token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify');
    if (token) {
      setVerificationToken(token);
      setPage('verify');
    }
  }, []);

  // Auth Guards
  if (page === 'dashboard' && !user) {
    setPage('login');
    return null;
  }
  
  if (page === 'dashboard' && user && !user.hasPaid) {
    setPage('payment');
    return null;
  }

  if (page === 'payment' && !user) {
    setPage('login');
    return null;
  }

  return (
    <>
      {page === 'login' && <Login onNavigate={setPage} setUser={setUser} />}
      {page === 'signup' && <Signup onNavigate={setPage} />}
      {page === 'payment' && <Payment onNavigate={setPage} user={user} setUser={setUser} />}
      {page === 'dashboard' && <Dashboard onNavigate={setPage} user={user} onLogout={() => { setUser(null); setPage('landing'); }} />}
      {page === 'landing' && <Landing onNavigate={setPage} />}
      {page === 'verify' && verificationToken && <Verify token={verificationToken} onNavigate={setPage} />}
      {page === 'privacy' && <Privacy onNavigate={setPage} />}
      {page === 'contact' && <Contact onNavigate={setPage} />}
    </>
  );
}
