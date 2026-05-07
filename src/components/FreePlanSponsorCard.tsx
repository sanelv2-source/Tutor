import React from 'react';
import { ArrowUpRight, BookOpenCheck } from 'lucide-react';
import { trackEvent } from '../utils/analytics';

export default function FreePlanSponsorCard({ onUpgrade }: { onUpgrade?: () => void | Promise<void> }) {
  const handleUpgradeClick = async () => {
    if (onUpgrade) {
      await onUpgrade();
      return;
    }

    await trackEvent('upgrade_clicked', {
      source: 'free_plan_sponsor_card',
      target_plan: 'pro',
    });
  };

  return (
    <section className="rounded-lg border border-teal-200 bg-teal-50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Sponset plassering</p>
            <h2 className="mt-1 text-base font-black text-slate-950">Anbefalt ressurs for privatlærere</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Verktøy, maler og ressurser for deg som underviser privat.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUpgradeClick}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 sm:w-auto"
        >
          Se pakker
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
