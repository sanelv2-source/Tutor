import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, ArrowLeft, CheckCircle2, Lock, LogOut } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabaseClient';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Replace with your actual publishable key
const publishableKey = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!publishableKey) {
  console.warn('VITE_STRIPE_PUBLISHABLE_KEY is missing. Please add it in the "Settings" menu to enable frontend payments.');
}
const stripePromise = loadStripe(publishableKey || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

function CheckoutForm({ onNavigate, user, setUser, pendingUser, setPendingUser }: { onNavigate: (page: string) => void, user: any, setUser: (user: any) => void, pendingUser: any, setPendingUser: (user: any) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const activeEmail = user?.email || pendingUser?.email;
  const activeName = user?.name || pendingUser?.name;

  useEffect(() => {
    // Create SetupIntent as soon as the page loads
    fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch((err) => {
        console.error("Payment intent error:", err);
        setError('Kunne ikke koble til betalingsleverandør. Sjekk at STRIPE_SECRET_KEY er lagt inn i "Settings"-menyen.');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Confirm the SetupIntent using the card details
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement as any,
            billing_details: {
              email: activeEmail,
              name: activeName,
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || 'Kortet ble avvist');
      }

      // If successful, handle registration if needed, then tell our backend to mark the user as paid
      if (setupIntent && setupIntent.status === 'succeeded') {
        let currentUser = user;

        // 1. If we have a pending user, register them now
        if (!currentUser && pendingUser) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: pendingUser.email,
            password: pendingUser.password,
            options: {
              data: {
                full_name: pendingUser.name,
                email: pendingUser.email,
                role: 'tutor'
              },
              emailRedirectTo: `${window.location.origin}/`,
            }
          });

          if (signUpError) throw signUpError;
          
          if (data.user) {
            // Opprett profil
            await supabase.from('profiles').upsert({ 
              id: data.user.id, 
              email: pendingUser.email, 
              full_name: pendingUser.name,
              role: 'tutor',
              trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              subscription_status: 'inactive'
            });

            currentUser = {
              name: pendingUser.name,
              email: pendingUser.email,
              hasPaid: false,
              role: 'tutor'
            };
          }
        }

        if (!activeEmail) throw new Error("Ingen e-postadresse funnet");

        const response = await fetch('/api/payment/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: activeEmail }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Kunne ikke oppdatere brukerstatus');
        }

        setPendingUser(null);
        setUser({ ...currentUser, hasPaid: true });
        onNavigate('dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En ukjent feil oppstod');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Payment Methods */}
      <div className="flex gap-4 mb-6">
        <label className="flex-1 relative border-2 border-indigo-600 bg-indigo-50 rounded-xl p-4 cursor-pointer flex items-center justify-center">
          <input type="radio" name="payment_method" value="card" className="sr-only" defaultChecked />
          <span className="font-bold text-indigo-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Kort
          </span>
          <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-indigo-600 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
          </div>
        </label>
        <label className="flex-1 relative border-2 border-slate-200 hover:border-slate-300 bg-white rounded-xl p-4 cursor-pointer flex items-center justify-center transition-colors">
          <input type="radio" name="payment_method" value="vipps" className="sr-only" disabled />
          <span className="font-bold text-slate-400 flex items-center gap-2">
            <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-xs font-black tracking-wider">VIPPS</span>
          </span>
          <span className="absolute -top-2 -right-2 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full border border-slate-200">Kommer</span>
        </label>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#334155',
                '::placeholder': {
                  color: '#94a3b8',
                },
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              invalid: {
                color: '#ef4444',
                iconColor: '#ef4444',
              },
            },
            hidePostalCode: true,
          }}
        />
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret}
          className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Behandler betaling...
            </span>
          ) : (
            <span className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Start 14-dagers gratis prøveperiode
            </span>
          )}
        </button>
      </div>
      
      <p className="text-xs text-center text-slate-500 flex items-center justify-center mt-4">
        <ShieldCheck className="h-4 w-4 mr-1 text-emerald-500" />
        Sikker og kryptert betaling via Stripe
      </p>
      
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </form>
    </div>
  );
}

export default function Payment({ onNavigate, user, setUser, pendingUser, setPendingUser }: { onNavigate: (page: string) => void, user: any, setUser: (user: any) => void, pendingUser: any, setPendingUser: (user: any) => void }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPendingUser(null);
    onNavigate('landing');
  };

  const handleBack = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPendingUser(null);
    onNavigate('signup');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col py-12 sm:px-6 lg:px-8 font-sans relative">
      <button 
        onClick={handleBack}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tilbake
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl mt-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Fullfør din registrering
          </h2>
          <p className="mt-2 text-slate-600">
            {pendingUser ? `Velkommen, ${pendingUser.name}! Start din 14-dagers gratis prøveperiode.` : 'Du betaler ingenting i dag. Start din 14-dagers gratis prøveperiode.'}
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          
          {/* Payment Form (Left) */}
          <div className="md:col-span-3 bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <CreditCard className="mr-2 h-6 w-6 text-indigo-600" />
              Betalingsinformasjon
            </h3>

            <Elements stripe={stripePromise}>
              <CheckoutForm onNavigate={onNavigate} user={user} setUser={setUser} pendingUser={pendingUser} setPendingUser={setPendingUser} />
            </Elements>
          </div>

          {/* Order Summary (Right) */}
          <div className="md:col-span-2">
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
              
              <h3 className="text-lg font-bold mb-6 relative z-10">Ordresammendrag</h3>
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                  <div>
                    <p className="font-bold text-lg">TutorFlyt Pro Beta</p>
                    <p className="text-sm text-slate-400 mt-1">Full tilgang til alle funksjoner</p>
                  </div>
                  <p className="font-bold">149 kr</p>
                </div>
                
                <div className="flex justify-between items-center text-sm text-slate-300">
                  <p>Fakturering</p>
                  <p>Månedlig</p>
                </div>
                
                <div className="flex justify-between items-center text-sm text-emerald-400 font-medium">
                  <p>Beta-rabatt (50%)</p>
                  <p>- 149 kr</p>
                </div>

                <div className="flex justify-between items-center text-sm text-emerald-400 font-medium pb-4 border-b border-slate-800">
                  <p>14 dagers gratis prøveperiode</p>
                  <p>- 149 kr</p>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <p className="font-bold text-lg">Å betale i dag</p>
                  <p className="font-bold text-2xl">0 kr</p>
                </div>
              </div>

              <div className="mt-8 space-y-3 relative z-10">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Ubegrenset antall elever og fakturaer</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Automatiske progresjonsrapporter (Magic Link)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Avbryt når som helst. Ingen bindingstid.</p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 relative z-10">
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Etter 14 dager fornyes abonnementet automatisk for 149 kr/mnd. Du vil få en påminnelse på e-post 3 dager før prøveperioden utløper.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
