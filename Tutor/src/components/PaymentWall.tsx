import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface PaymentWallProps {
  onUpgrade?: () => void;
}

export default function PaymentWall({ onUpgrade }: PaymentWallProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Prøveperioden er over</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Din 14-dagers prøveperiode har utløpt. Oppgrader til fullversjon for å fortsette å bruke Tutorflyt og beholde tilgangen til alle dine elever, timeplaner og data.
        </p>
        <button 
          onClick={onUpgrade}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
        >
          Oppgrader til fullversjon
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
