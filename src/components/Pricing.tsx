import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import Footer from './Footer';
import { PLAN_NAMES, PLAN_ORDER, PLAN_PRICES, type SubscriptionPlan } from '../lib/plans';
import { trackEvent } from '../utils/analytics';

const planCopy: Record<SubscriptionPlan, { audience: string; intro: string; features: string[]; limitations?: string[] }> = {
  free: {
    audience: 'Nye privatlærere og testbrukere',
    intro: 'Kom i gang med Tutorflyt uten kostnad.',
    features: [
      'Maks 3 elever',
      'Maks 10 timer per måned',
      'Enkel kalender',
      'Begrenset fakturering',
      'Interne oppgraderingsmeldinger',
      'Tutorflyt-branding',
    ],
    limitations: ['Relevante sponsorplasseringer', 'Ikke AI', 'Ikke avansert statistikk'],
  },
  start: {
    audience: 'Nye privatlærere med noen få elever',
    intro: 'For nye privatlærere som vil jobbe mer ryddig.',
    features: [
      'Maks 5 elever',
      'Maks 25 timer per måned',
      'Ingen annonser',
      'Bedre kalender',
      'Enkel fakturering',
      'Enkel elevoversikt',
      'Begrenset automatisering',
    ],
    limitations: ['Ikke AI', 'Ikke avansert statistikk'],
  },
  pro: {
    audience: 'Aktive privatlærere med 3-10+ elever',
    intro: 'For aktive privatlærere som vil samle elever, timer og fakturering på ett sted.',
    features: [
      'Maks 20 elever',
      'Ubegrensede timer',
      'Ingen annonser',
      'Full kalender',
      'Full fakturering',
      'Elevoversikt',
      'Påminnelser',
      'Enkel rapportering',
    ],
  },
  premium: {
    audience: 'Seriøse privatlærere med mange elever',
    intro: 'For deg som driver privatundervisning seriøst og trenger full kontroll.',
    features: [
      'Ubegrenset elever',
      'Ubegrenset timer',
      'Ingen annonser',
      'Avansert statistikk',
      'Mer automatisering',
      'Prioritert support',
      'Klargjort for AI-assistent senere',
    ],
  },
};

export default function Pricing({ onNavigate }: { onNavigate: (page: string) => void }) {
  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    await trackEvent('upgrade_clicked', {
      source: 'pricing_page',
      target_plan: plan,
    });
    onNavigate(plan === 'free' ? 'signup' : `payment:${plan}`);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      <main className="pb-16 sm:pb-24">
        <section className="mx-auto max-w-5xl px-4 pb-8 pt-12 text-center sm:px-6 sm:pb-12 sm:pt-20 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wider text-teal-700">Priser for norske privatlærere</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Velg pakken som passer undervisningen din
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Start gratis, oppgrader når du trenger flere elever, flere timer og mer kontroll.
          </p>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {PLAN_ORDER.map((plan) => {
            const isRecommended = plan === 'pro';
            const copy = planCopy[plan];

            return (
              <article
                key={plan}
                className={`relative flex h-full flex-col rounded-lg border bg-white p-6 shadow-sm ${
                  isRecommended ? 'border-teal-500 ring-2 ring-teal-500' : 'border-slate-200'
                }`}
              >
                {isRecommended && (
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1 text-xs font-black text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Mest verdi
                  </div>
                )}

                <div className="pr-24 lg:pr-0">
                  <h2 className="text-2xl font-black text-slate-950">{PLAN_NAMES[plan]}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{copy.audience}</p>
                </div>

                <div className="mt-6">
                  <span className="text-4xl font-black text-slate-950">{PLAN_PRICES[plan]}</span>
                  <span className="ml-1 text-sm font-semibold text-slate-500">kr/mnd</span>
                </div>

                <p className="mt-5 min-h-16 text-sm leading-6 text-slate-600">{copy.intro}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {copy.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {copy.limitations?.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-500">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleChoosePlan(plan)}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition-colors ${
                    isRecommended
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan === 'free' ? 'Start gratis' : `Velg ${PLAN_NAMES[plan]}`}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </section>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
