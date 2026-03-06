import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function Verify({ token, onNavigate }: { token: string, onNavigate: (page: string) => void }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Bekrefter e-postadressen din...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          throw new Error('Ugyldig eller utløpt lenke');
        }

        setStatus('success');
        setMessage('E-postadressen din er nå bekreftet!');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Noe gikk galt');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/50 max-w-md w-full text-center border border-slate-100">
        {status === 'loading' && (
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
        )}

        {status === 'error' && (
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          {status === 'loading' ? 'Bekrefter...' : status === 'success' ? 'Vellykket!' : 'Feil'}
        </h2>
        
        <p className="text-slate-600 mb-8">{message}</p>

        {status === 'success' && (
          <button
            onClick={() => {
              // Remove the token from the URL
              window.history.replaceState({}, document.title, window.location.pathname);
              onNavigate('login');
            }}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
          >
            Gå til innlogging
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={() => {
              window.history.replaceState({}, document.title, window.location.pathname);
              onNavigate('landing');
            }}
            className="w-full flex justify-center items-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all"
          >
            Tilbake til forsiden
          </button>
        )}
      </div>
    </div>
  );
}
