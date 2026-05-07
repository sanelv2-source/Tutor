import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabaseClient';
import { trackAnalyticsEvent } from '../utils/analytics';
import {
  PLAN_NAMES,
  PLAN_PRICES,
  isPurchasablePlan,
  normalizePlan,
} from '../lib/plans';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const publishableKey = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!publishableKey) {
  console.warn('VITE_STRIPE_PUBLISHABLE_KEY is missing. Please add it in the "Settings" menu to enable frontend payments.');
}
const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);

const planHighlights: Record<'start' | 'pro', string[]> = {
  start: [
    'Maks 5 elever og 25 timer per måned',
    'Ingen annonser i læreropplevelsen',
    'Enkel fakturering og elevoversikt',
  ],
  pro: [
    'Maks 20 elever og ubegrensede timer',
    'Full kalender, fakturering og elevoversikt',
    'Påminnelser og enkel rapportering',
  ],
};

type CheckoutFormProps = {
  onNavigate: (page: string) => void;
  user: any;
  setUser: (user: any) => void;
  pendingUser: any;
  setPendingUser: (user: any) => void;
  selectedPlan: 'start' | 'pro';
};

function CheckoutForm({
  onNavigate,
  user,
  setUser,
  pendingUser,
  setPendingUser,
  selectedPlan,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const activeEmail = user?.email || pendingUser?.email;
  const activeName = user?.name || pendingUser?.name;
  const selectedPlanName = PLAN_NAMES[selectedPlan];
  const selectedPlanPrice = PLAN_PRICES[selectedPlan];

  useEffect(() => {
    setClientSecret('');
    setError('');

    if (!activeEmail) {
      return;
    }

    if (!publishableKey) {
      setError('Stripe-konfigurasjon mangler. Legg inn VITE_STRIPE_PUBLISHABLE_KEY.');
      return;
    }

    fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan, email: activeEmail }),
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
        console.error('Payment intent error:', err);
        setError('Kunne ikke koble til betalingsleverandør. Sjekk at STRIPE_SECRET_KEY er lagt inn i Settings.');
      });
  }, [activeEmail, selectedPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Kortfeltet ble ikke funnet');

      const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(
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

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error('Betalingen ble ikke fullført. Prøv igjen.');
      }

      let currentUser = user;
      let currentUserId: string | null = null;

      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.id) {
        currentUserId = authData.user.id;
      }

      if (!currentUser && pendingUser) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: pendingUser.email,
          password: pendingUser.password,
          options: {
            data: {
              full_name: pendingUser.name,
              email: pendingUser.email,
              role: 'tutor',
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          currentUserId = data.user.id;
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: pendingUser.email,
            full_name: pendingUser.name,
            role: 'tutor',
            plan: 'free',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            subscription_status: 'inactive',
          });

          currentUser = {
            name: pendingUser.name,
            email: pendingUser.email,
            hasPaid: false,
            role: 'tutor',
            plan: 'free',
          };

          await trackAnalyticsEvent('signup_completed', { role: 'tutor', source: 'payment_signup' }, { userId: currentUserId });
        }
      }

      if (!activeEmail) throw new Error('Ingen e-postadresse funnet');

      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: activeEmail,
          plan: selectedPlan,
          paymentIntentId: paymentIntent.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke oppdatere brukerstatus');
      }

      setPendingUser(null);
      await trackAnalyticsEvent('subscription_started', { plan: selectedPlan, source: 'payment_form' }, { userId: currentUserId });
      setUser({ ...currentUser, hasPaid: true, plan: selectedPlan });
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En ukjent feil oppstod');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!activeEmail) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-bold">Du må være logget inn før du betaler.</p>
        <p className="mt-2 leading-6">
          Opprett en gratis konto først, eller logg inn med eksisterende bruker. Deretter kan du velge Start eller Pro og betale valgt beløp.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onNavigate('signup')}
            className="inline-flex items-center justify-center rounded-lg bg-amber-900 px-4 py-2 font-bold text-white hover:bg-amber-800"
          >
            Opprett konto
          </button>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 font-bold text-amber-900 hover:bg-amber-100"
          >
            Logg inn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
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
                Betal {selectedPlanPrice} kr og aktiver {selectedPlanName}
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

export default function Payment({
  onNavigate,
  user,
  setUser,
  pendingUser,
  setPendingUser,
}: {
  onNavigate: (page: string) => void;
  user: any;
  setUser: (user: any) => void;
  pendingUser: any;
  setPendingUser: (user: any) => void;
}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const requestedPlan = normalizePlan(params.get('plan') || 'pro');
  const selectedPlan = (isPurchasablePlan(requestedPlan) ? requestedPlan : 'pro') as 'start' | 'pro';
  const selectedPlanName = PLAN_NAMES[selectedPlan];
  const selectedPlanPrice = PLAN_PRICES[selectedPlan];
  const fromDashboard = params.get('from') === 'dashboard';
  const highlights = planHighlights[selectedPlan];

  const handleBack = () => {
    onNavigate(fromDashboard ? 'dashboard' : 'pricing');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col py-12 sm:px-6 lg:px-8 font-sans relative">
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tilbake til {fromDashboard ? 'dashboard' : 'priser'}
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl mt-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Fullfør {selectedPlanName}-oppgraderingen
          </h2>
          <p className="mt-2 text-slate-600">
            Du betaler {selectedPlanPrice} kr i dag for {selectedPlanName}. Ingen bindingstid.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <CreditCard className="mr-2 h-6 w-6 text-indigo-600" />
              Betalingsinformasjon
            </h3>

            <Elements stripe={stripePromise}>
              <CheckoutForm
                onNavigate={onNavigate}
                user={user}
                setUser={setUser}
                pendingUser={pendingUser}
                setPendingUser={setPendingUser}
                selectedPlan={selectedPlan}
              />
            </Elements>
          </div>

          <div className="md:col-span-2">
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>

              <h3 className="text-lg font-bold mb-6 relative z-10">Ordresammendrag</h3>

              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                  <div>
                    <p className="font-bold text-lg">Tutorflyt {selectedPlanName}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedPlan === 'pro' ? 'Anbefalt pakke for aktive privatlærere' : 'Lav terskel for nye privatlærere'}
                    </p>
                  </div>
                  <p className="font-bold">{selectedPlanPrice} kr</p>
                </div>

                <div className="flex justify-between items-center text-sm text-slate-300">
                  <p>Fakturering</p>
                  <p>Månedlig</p>
                </div>

                <div className="flex justify-between items-center text-sm text-slate-300 pb-4 border-b border-slate-800">
                  <p>Ingen bindingstid</p>
                  <p>Kan endres senere</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <p className="font-bold text-lg">Å betale i dag</p>
                  <p className="font-bold text-2xl">{selectedPlanPrice} kr</p>
                </div>
              </div>

              <div className="mt-8 space-y-3 relative z-10">
                {highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300">{highlight}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 relative z-10">
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  {selectedPlanName} koster {selectedPlanPrice} kr/mnd. Du belastes valgt beløp nå.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
