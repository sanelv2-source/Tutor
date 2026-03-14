import React from 'react';
import { ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';
import Footer from './Footer';

export default function About({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Historien bak TutorFlyt
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Vi bygger verktøyet vi selv savnet da vi underviste. For å gi lærere friheten tilbake.
          </p>
        </section>

        {/* Image Placeholder 1 */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20">
          <div className="aspect-video bg-slate-200 rounded-3xl overflow-hidden relative shadow-lg">
            <img 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="Team samarbeid" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-indigo-900/10 mix-blend-multiply"></div>
          </div>
        </section>

        {/* Hvorfor vi eksisterer & USP */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto mb-24">
          <div className="prose prose-lg prose-slate mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Hvorfor vi eksisterer</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Alt startet med en enkel observasjon: <strong>Vi så fantastiske lærere som druknet i SMS-er, uoversiktlige Excel-ark og evigvarende Vipps-krav.</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Å være privatlærer handler om å dele kunnskap, se elevene vokse og oppleve mestring. Men i stedet for å fokusere på undervisningen, brukte mange lærere timevis hver uke på ren administrasjon. Det å holde styr på hvem som hadde betalt for hvilken time, og når neste avtale egentlig var, ble en stressfaktor.
            </p>
            <p className="text-slate-600 leading-relaxed mb-6">
              Vi ønsket å gi uavhengige privatlærere de samme profesjonelle verktøyene som store skoler har – bare mye enklere. 
            </p>
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-6 rounded-r-2xl my-8">
              <p className="text-xl font-medium text-indigo-900 italic m-0">
                "TutorFlyt ble født for å gi lærere friheten tilbake. Slik at de kan fokusere på det de elsker: å undervise."
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 bg-white border-y border-slate-200 mb-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Reisen vår</h2>
            
            <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              
              {/* Item 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900 text-lg">Problemet oppdages</h3>
                  </div>
                  <p className="text-slate-600">Vi innså hvor mye tid som gikk tapt til administrasjon i stedet for undervisning.</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900 text-lg">Første prototype</h3>
                  </div>
                  <p className="text-slate-600">Vi bygget en enkel løsning for å håndtere timeplaner og betalinger for en liten gruppe lærere.</p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-indigo-900 text-lg">TutorFlyt lanseres</h3>
                  </div>
                  <p className="text-slate-600">Plattformen åpnes for alle privatlærere i Norge, med full integrasjon for betaling og elevportal.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Våre verdier */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-24">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Våre verdier</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Enkelhet</h3>
              <p className="text-slate-600">
                Teknologi skal fjerne friksjon, ikke skape den. Vi designer alt med tanke på at det skal være intuitivt fra første klikk.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Profesjonalitet</h3>
              <p className="text-slate-600">
                Vi gir deg verktøyene som får deg til å fremstå som den seriøse og dyktige læreren du er, overfor både elever og foreldre.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Trygghet</h3>
              <p className="text-slate-600">
                Både data og betalinger er sikret med bransjeledende standarder. Du og dine elever kan alltid føle dere trygge.
              </p>
            </div>
          </div>
        </section>

        {/* Signature & CTA */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto mb-24 text-center">
          <div className="mb-12">
            <p className="text-lg text-slate-600 mb-4">
              Vi er utrolig stolte av det vi har bygget, men vi er enda mer stolte av lærerne som bruker plattformen vår hver dag.
            </p>
            <p className="text-xl font-medium text-slate-900 font-serif italic">
              – Teamet bak TutorFlyt
            </p>
          </div>
          
          <div className="bg-indigo-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
            
            <h2 className="text-3xl font-bold text-white mb-6 relative z-10">Klar for å få friheten tilbake?</h2>
            <button 
              onClick={() => onNavigate('signup')}
              className="relative z-10 inline-flex justify-center items-center px-8 py-4 text-lg font-bold rounded-xl text-indigo-900 bg-white hover:bg-indigo-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Bli en del av reisen – Start i dag
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
