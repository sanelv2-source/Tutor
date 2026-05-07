import React from 'react';
import { ArrowRight, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import {
  PLAN_NAMES,
  PLAN_ORDER,
  PLAN_PRICES,
  isPurchasablePlan,
  type SubscriptionPlan,
} from '../lib/plans';

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
    audience: 'Kommer senere',
    intro: 'For seriøse privatlærere når AI-assistent og mer avansert automatisering er klart.',
    features: [
      'Ubegrenset elever',
      'Ubegrenset timer',
      'Ingen annonser',
      'Avansert statistikk',
      'Mer automatisering',
      'Prioritert support',
      'AI-assistent når klar',
    ],
  },
};

type PlanPickerProps = {
  currentPlan?: SubscriptionPlan;
  context?: 'public' | 'dashboard';
  onChoosePlan: (plan: SubscriptionPlan) => void | Promise<void>;
};

export default function PlanPicker({ currentPlan, context = 'public', onChoosePlan }: PlanPickerProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-4">
      {PLAN_ORDER.map((plan) => {
        const isRecommended = plan === 'pro';
        const isComingSoon = plan === 'premium';
        const isCurrentPlan = currentPlan === plan;
        const isFreeInDashboard = context === 'dashboard' && plan === 'free';
        const isDisabled = isComingSoon || isCurrentPlan || isFreeInDashboard;
        const copy = planCopy[plan];

        return (
          <article
            key={plan}
            className={`relative flex h-full flex-col rounded-lg border bg-white p-6 shadow-sm ${
              isRecommended ? 'border-teal-500 ring-2 ring-teal-500' : 'border-slate-200'
            } ${isComingSoon ? 'opacity-85' : ''}`}
          >
            {isRecommended && (
              <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1 text-xs font-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Mest verdi
              </div>
            )}

            {isComingSoon && (
              <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                <Clock className="h-3.5 w-3.5" />
                Kommer senere
              </div>
            )}

            <div className="pr-24 lg:pr-0">
              <h2 className="text-2xl font-black text-slate-950">{PLAN_NAMES[plan]}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">{copy.audience}</p>
            </div>

            <div className="mt-6 min-h-12">
              {isComingSoon ? (
                <span className="text-3xl font-black text-slate-950">Kommer senere</span>
              ) : (
                <>
                  <span className="text-4xl font-black text-slate-950">{PLAN_PRICES[plan]}</span>
                  <span className="ml-1 text-sm font-semibold text-slate-500">kr/mnd</span>
                </>
              )}
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
              type="button"
              onClick={() => {
                if (!isDisabled || (plan === 'free' && context === 'public')) {
                  void onChoosePlan(plan);
                }
              }}
              disabled={isDisabled}
              className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
                isRecommended
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-slate-950 text-white hover:bg-slate-800'
              }`}
            >
              {isCurrentPlan
                ? 'Din plan'
                : isComingSoon
                  ? 'Kommer senere'
                  : plan === 'free'
                    ? 'Start gratis'
                    : `Velg ${PLAN_NAMES[plan]}`}
              {(!isDisabled || (plan === 'free' && context === 'public')) && isPurchasablePlan(plan) && (
                <ArrowRight className="h-4 w-4" />
              )}
              {plan === 'free' && context === 'public' && <ArrowRight className="h-4 w-4" />}
            </button>
          </article>
        );
      })}
    </section>
  );
}
