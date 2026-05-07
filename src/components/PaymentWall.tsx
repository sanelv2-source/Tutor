import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import PlanPicker from './PlanPicker';
import type { SubscriptionPlan } from '../lib/plans';

interface PaymentWallProps {
  currentPlan?: SubscriptionPlan;
  showPlans?: boolean;
  onUpgrade?: () => void;
  onChoosePlan?: (plan: SubscriptionPlan) => void | Promise<void>;
}

export default function PaymentWall({ currentPlan, showPlans = false, onUpgrade, onChoosePlan }: PaymentWallProps) {
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center py-8">
        {!showPlans ? (
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Prøveperioden er over</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Din 14-dagers prøveperiode har utløpt. Oppgrader for å fortsette å bruke Tutorflyt og beholde tilgangen til elever, timeplaner og data.
            </p>
            <button
              onClick={onUpgrade}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              Se pakker
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-white p-5 shadow-xl border border-slate-100 sm:p-8">
            <div className="mb-8 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-wider text-teal-700">Velg pakke</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Fortsett med Tutorflyt</h2>
              <p className="mt-3 text-slate-600">
                Velg Start eller Pro for å aktivere kontoen igjen. Premium kommer senere når de avanserte funksjonene er klare.
              </p>
            </div>
            <PlanPicker currentPlan={currentPlan} context="dashboard" onChoosePlan={(plan) => onChoosePlan?.(plan)} />
          </div>
        )}
      </div>
    </div>
  );
}
