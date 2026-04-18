import React from 'react';
import { 
  ArrowLeft, 
  UserPlus, 
  Clock, 
  Wallet, 
  MonitorSmartphone, 
  TrendingUp, 
  MessageCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import Logo from './Logo';
import Footer from './Footer';

export default function HowItWorks({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <main className="pb-24">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Slik fungerer TutorFlyt
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Tre enkle steg for å komme i gang. Enten du er en lærer som vil ha mindre administrasjon, eller en elev som vil ha bedre oversikt.
          </p>
        </section>

        {/* Video Demo Section */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto mb-24">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900 aspect-video group">
            <video 
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              autoPlay 
              muted 
              loop 
              playsInline
            >
              <source src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/sign/Video/63328-506377472_medium.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMDI1N2Q0Mi04YTljLTQ2OWItOGY2Yy1lZjJiMjE3ZmI0YTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlby82MzMyOC01MDYzNzc0NzJfbWVkaXVtLm1wNCIsImlhdCI6MTc3MzQ4MjkxOCwiZXhwIjoxODA1MDE4OTE4fQ.W2KgNPPrxQB_9X2dmIsUVKcuILC8GCnOoX5WB6mbAIE`} type="video/mp4" />
              Din nettleser støtter ikke video-taggen.
            </video>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          
          {/* Lærere Section */}
          <section>
            <div className="text-center mb-16">
              <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm mb-2 block">For Lærere</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Fokusér på faget, vi tar oss av resten</h2>
            </div>
            
            <div className="space-y-24">
              {/* Step 1: Text Left, Image Right */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl">1</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Opprett profil</h3>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    Registrer deg på få minutter. Legg til elevene dine, sett opp fagene du underviser i, og du er klar til å starte. Alt er samlet på ett sted, slik at du slipper å lete gjennom regneark og notatbøker.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Rask og enkel oppsett
                    </li>
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Importer elever på 1-2-3
                    </li>
                  </ul>
                </div>
                <div className="flex-1 order-1 md:order-2 w-full">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/3]">
                    <img 
                      src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800" 
                      alt="Lærer oppretter profil" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Image Left, Text Right */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 w-full">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/3]">
                    <img 
                      src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800" 
                      alt="Lærer logger timer" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600 font-bold text-xl">2</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Logg timer & progresjon</h3>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    Etter hver time fyller du raskt ut en statusrapport. Noter mestringsnivå, lekser og kommentarer med noen få klikk. Eleven får automatisk beskjed.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Visuell progresjonssporing
                    </li>
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Del ressurser og lekser enkelt
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 3: Text Left, Image Right */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xl">3</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Få betalt</h3>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    Send automatisk Vipps-krav eller faktura rett etter timen. Få full oversikt over hvem som har betalt og hva som utestår, uten å måtte sjekke banken manuelt.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Integrert med Vipps og Stripe
                    </li>
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Automatisk purring på utestående
                    </li>
                  </ul>
                </div>
                <div className="flex-1 order-1 md:order-2 w-full">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/3]">
                    <img 
                      src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800" 
                      alt="Lærer får betalt" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

          {/* Elever Section */}
          <section>
            <div className="text-center mb-16">
              <span className="text-orange-500 font-bold tracking-wider uppercase text-sm mb-2 block">For Elever</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Full oversikt over læringen</h2>
            </div>
            
            <div className="space-y-24">
              {/* Step 1: Image Left, Text Right */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 w-full">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/3]">
                    <img 
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800" 
                      alt="Elev får tilgang til portal" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl">1</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Få tilgang til din portal</h3>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    Motta en sikker, magisk lenke på SMS eller e-post. Ingen passord å huske – bare klikk og du er inne i din personlige portal på mobilen eller PC-en.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Sikker, passordløs innlogging
                    </li>
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Fungerer perfekt på alle enheter
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 2: Text Left, Image Right */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 font-bold text-xl">2</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Se fremgang & ressurser</h3>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    Følg med på mestringsnivået fra uke til uke. Finn lekser, tilbakemeldinger og delte dokumenter samlet på ett sted, slik at du alltid er forberedt.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Alt studiemateriell på ett sted
                    </li>
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Tydelig oversikt over hva som må øves på
                    </li>
                  </ul>
                </div>
                <div className="flex-1 order-1 md:order-2 w-full">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/3]">
                    <img 
                      src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800" 
                      alt="Elev ser fremgang" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Image Left, Text Right */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 w-full">
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/3]">
                    <img 
                      src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&q=80&w=800" 
                      alt="Elev kommuniserer med lærer" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 font-bold text-xl">3</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Kommuniser med din lærer</h3>
                  </div>
                  <p className="text-lg text-slate-600 leading-relaxed mb-6">
                    Be om å flytte timer, still spørsmål om leksene eller gi beskjed om fravær – alt direkte gjennom portalen. Slutt på spredte SMS-er og e-poster.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Innebygd chat med læreren
                    </li>
                    <li className="flex items-center gap-3 text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Enkel ombooking av timer
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="mt-32">
            <div className="bg-indigo-600 rounded-[2.5rem] p-10 md:p-20 text-center shadow-2xl relative overflow-hidden max-w-5xl mx-auto">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-indigo-700 rounded-full blur-3xl opacity-50"></div>
              
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
                  Klar til å forenkle undervisningen?
                </h2>
                <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
                  Bli med i betaen i dag og få en ryddigere hverdag for deg og dine elever.
                </p>
                <button 
                  onClick={() => onNavigate('signup')}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl text-white bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Kom i gang nå
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>
      
      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
