import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MonitorSmartphone,
  TrendingUp,
  Wallet
} from 'lucide-react';

type TeacherDashboardDemoProps = {
  onNavigate: (page: string) => void;
  variant?: 'landing' | 'how-it-works';
};

const highlights = [
  {
    icon: Clock,
    title: 'Dagens timer',
    text: 'Se neste økt, elever og avtaler uten å lete i meldinger.'
  },
  {
    icon: TrendingUp,
    title: 'Elevprogresjon',
    text: 'Logg fremgang og send korte rapporter etter timen.'
  },
  {
    icon: Wallet,
    title: 'Betaling',
    text: 'Følg Vipps-krav, inntekt og utestående på samme sted.'
  }
];

export default function TeacherDashboardDemo({ onNavigate, variant = 'landing' }: TeacherDashboardDemoProps) {
  const isLanding = variant === 'landing';

  return (
    <section className={isLanding
      ? 'py-16 sm:py-24 bg-slate-50 border-y border-slate-200 overflow-hidden'
      : 'px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-16 sm:mb-24'
    }>
      <div className={isLanding ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' : ''}>
        <div className={isLanding
          ? 'grid lg:grid-cols-[0.82fr_1.18fr] gap-10 lg:gap-14 items-center'
          : 'grid lg:grid-cols-[0.78fr_1.22fr] gap-8 lg:gap-10 items-center rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:p-8 shadow-xl'
        }>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100">
              <MonitorSmartphone className="h-4 w-4" />
              Demo av lærer-dashboardet
            </div>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Se hva du får når du åpner TutorFlyt.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              En kort gjennomgang av lærerens arbeidsflate: timer, elevprogresjon, rapporter og betaling samlet på ett sted.
            </p>

            <div className="mt-7 space-y-4">
              {highlights.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('signup')}
              className="mt-8 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl"
            >
              Prøv gratis i 14 dager
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="relative min-w-0">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-2xl">
              <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-slate-950 px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 hidden text-xs font-medium text-slate-400 sm:inline">app.tutorflyt.no/tutor/dashboard</span>
              </div>
              <picture>
                <source srcSet="/teacher-dashboard-demo.webp" type="image/webp" />
                <img
                  src="/teacher-dashboard-demo-poster.png"
                  alt="Kort animert demo av lærer-dashboardet i TutorFlyt"
                  className="block aspect-video w-full bg-slate-100 object-cover"
                  loading={isLanding ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </picture>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Kort, konkret og laget for lærere
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
              <span>Viser hele flyten på 10 sekunder</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
