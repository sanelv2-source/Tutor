import React from 'react';
import Footer from './Footer';
import PlanPicker from './PlanPicker';
import { isPurchasablePlan, type SubscriptionPlan } from '../lib/plans';
import { trackEvent } from '../utils/analytics';

export default function Pricing({ onNavigate }: { onNavigate: (page: string) => void }) {
  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    await trackEvent('upgrade_clicked', {
      source: 'pricing_page',
      target_plan: plan,
    });
    onNavigate(isPurchasablePlan(plan) ? `payment:${plan}` : 'signup');
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

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PlanPicker onChoosePlan={handleChoosePlan} />
        </section>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
