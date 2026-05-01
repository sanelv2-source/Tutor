import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import Footer from './Footer';

export default function Pricing({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <main className="pb-24">
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Enkel og transparent prising
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Én enkel pris for hele lærerverktøyet. Ingen skjulte gebyrer. Ingen bindingstid.
          </p>
        </section>

        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10"></div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro Lærer</h3>
            <p className="text-slate-500 mb-6">For privatlærere som vil samle elever, timer, betaling og oppfølging på ett sted.</p>
            
            <div className="mb-8">
              <span className="text-5xl font-extrabold text-slate-900">149,-</span>
              <span className="text-slate-500 font-medium">/mnd</span>
            </div>
            
            <ul className="space-y-4 mb-10">
              {[
                'Ubegrenset antall elever og timer',
                'Kalender med oversikt over faste og enkeltstående timer',
                'Betalingsoversikt, fakturaoppfølging og Vipps-flyt',
                'Elevportal for meldinger, oppgaver og rapporter',
                'Progresjonssporing etter hver undervisningstime',
                'Norsk support og ingen bindingstid'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => onNavigate('signup')}
              className="w-full py-4 text-lg font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
            >
              Start din gratis prøveperiode
            </button>
            <p className="mt-4 text-center text-sm text-slate-500">
              14 dager gratis. Deretter 149 kr per måned.
            </p>
          </div>
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
