import React, { useState } from 'react';
import { 
  CheckCircle2, 
  FileWarning, 
  MessageSquareWarning, 
  FileQuestion,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Calendar as CalendarIcon,
  MessageCircle
} from 'lucide-react';
import Logo from './Logo';
import Footer from './Footer';
import TeacherDashboardDemo from './TeacherDashboardDemo';

// FAQ Accordion Component
const AccordionItem = ({ question, answer }: { question: string, answer: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button 
        className="w-full py-5 sm:py-6 flex justify-between items-center gap-4 text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base sm:text-lg font-medium text-slate-900">{question}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />}
      </button>
      {isOpen && (
        <div className="pb-6 text-slate-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

export default function Landing({ onNavigate, setUser }: { onNavigate: (page: string) => void, setUser?: (user: any) => void }) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <main>
        {/* 1. Hero Section */}
        <section className="pt-10 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            <div className="max-w-2xl min-w-0">
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-5 sm:mb-6 leading-[1.08] break-words">
                Slutt å mase om betaling. <span className="text-indigo-600">Begynn å undervise.</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-7 sm:mb-8 leading-relaxed">
                Det enkle kontrollpanelet bygget for norske privatlærere. Automatiser fakturering, styr timeplanen og imponerer elevene – alt fra mobilen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <button 
                  onClick={() => onNavigate('signup')}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-5 sm:px-6 py-3 text-base font-bold rounded-xl text-white bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-center"
                >
                  Prøv ut nå – 14 dager gratis prøveperiode
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-500 font-medium">
                Ingen binding. Ingen kredittkort kreves.
              </p>
              <div className="mt-8 flex items-start sm:items-center gap-3">
                <div className="flex -space-x-2 shrink-0">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                    </div>
                  ))}
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="text-sm text-slate-600 font-medium">
                    Allerede <span className="text-indigo-600 font-bold">4 lærere i Agder</span> venter på tilgang
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Brukt av lærere som ønsker stålkontroll på sin egen undervisning business
                  </p>
                </div>
              </div>
            </div>
            
            {/* Hero Illustration / Mockup */}
            <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[320px] lg:max-w-none lg:ml-auto flex justify-center">
              <div className="relative w-full max-w-[300px] aspect-[1/2] bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-3xl w-40 mx-auto z-20"></div>
                <div className="bg-slate-50 w-full h-full flex flex-col relative z-10">
                  <div className="bg-indigo-600 text-white pt-12 pb-6 px-6 rounded-b-3xl shadow-sm">
                    <p className="text-indigo-100 text-sm font-medium mb-1">Total inntjening</p>
                    <h3 className="text-3xl font-bold">kr 12 450</h3>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-4 mt-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 animate-fade-in-up">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-base leading-tight text-slate-900">Vellykket betaling</p>
                        <p className="text-xs sm:text-sm text-slate-500">Mattehjelp - Jonas (Vipps)</p>
                      </div>
                      <div className="ml-auto shrink-0 text-xs sm:text-base font-bold text-emerald-600">+450 kr</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 opacity-70">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-base leading-tight text-slate-900">Vellykket betaling</p>
                        <p className="text-xs sm:text-sm text-slate-500">Pianotime - Sofie (Kort)</p>
                      </div>
                      <div className="ml-auto shrink-0 text-xs sm:text-base font-bold text-emerald-600">+500 kr</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative blobs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-indigo-200 to-orange-100 rounded-full blur-3xl -z-10 opacity-60"></div>
            </div>
          </div>
        </section>

        <TeacherDashboardDemo onNavigate={onNavigate} />

        {/* 2. Problem/Agitation Section */}
        <section className="py-16 sm:py-24 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Administrasjon skal ikke ta mer tid enn selve undervisningen.
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mb-6">
                  <FileWarning className="h-7 w-7 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Fakturerings-marerittet</h3>
                <p className="text-slate-600 leading-relaxed">
                  Bruker du søndagskvelden på å sjekke bankutskrifter og sende purringer på Vipps?
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-6">
                  <MessageSquareWarning className="h-7 w-7 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">WhatsApp-kaoset</h3>
                <p className="text-slate-600 leading-relaxed">
                  Er avtaler og beskjeder spredt over Messenger, SMS og Instagram?
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-6">
                  <FileQuestion className="h-7 w-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">«Hva gjorde vi sist?»</h3>
                <p className="text-slate-600 leading-relaxed">
                  Sliter du med å holde oversikt over progresjonen til hver enkelt elev i et regneark som aldri fungerer på mobilen?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Solution/Benefits Section (Z-pattern) */}
        <section className="py-16 sm:py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
            
            {/* Benefit 1: Image Right */}
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                  <CreditCard className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Få betalt med ett klikk.</h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Integrert med Vipps og Stripe. Send faktura automatisk etter hver time. Du ser med en gang hvem som har betalt.
                </p>
              </div>
              <div className="flex-1 w-full max-w-md mx-auto">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 transform rotate-0 sm:rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <span className="font-semibold text-slate-900">Siste fakturaer</span>
                    <span className="text-sm text-indigo-600 font-medium">Se alle</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: 'Kari Nordmann', status: 'Betalt', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { name: 'Ola Hansen', status: 'Venter', color: 'text-amber-600', bg: 'bg-amber-50' },
                      { name: 'Ingrid Lien', status: 'Betalt', color: 'text-emerald-600', bg: 'bg-emerald-50' }
                    ].map((inv, i) => (
                      <div key={i} className="flex justify-between items-center gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium">
                            {inv.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{inv.name}</p>
                            <p className="text-xs text-slate-500">Gitarundervisning</p>
                          </div>
                        </div>
                        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${inv.bg} ${inv.color}`}>
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit 2: Image Left */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20">
              <div className="flex-1">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                  <CalendarIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">En smart kalender som forstår Norge.</h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Synkronisert med norske skoleferier. Trenger du å flytte en time? Kunden får beskjed med en gang, og du slipper back-and-forth meldinger.
                </p>
              </div>
              <div className="flex-1 w-full max-w-md mx-auto">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 transform rotate-0 sm:-rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-bold text-lg text-slate-900">Oktober 2026</span>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><ChevronDown className="h-4 w-4 rotate-90" /></div>
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><ChevronDown className="h-4 w-4 -rotate-90" /></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-indigo-50 border-l-4 border-indigo-600 p-3 rounded-r-lg">
                      <p className="text-xs text-indigo-600 font-bold mb-1">14:00 - 15:00</p>
                      <p className="font-medium text-slate-900">Matte R1 - Jonas</p>
                    </div>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r-lg">
                      <p className="text-xs text-orange-600 font-bold mb-1">16:30 - 17:30</p>
                      <p className="font-medium text-slate-900">Fysikk 1 - Sofie</p>
                    </div>
                    <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded-r-lg opacity-60">
                      <p className="text-xs text-slate-500 font-bold mb-1">Høstferie (Uke 40)</p>
                      <p className="font-medium text-slate-700">Ingen undervisning</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit 3: Image Right */}
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                  <MessageCircle className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Proffere kommunikasjon med elevene.</h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Send en 30-sekunders oppdatering etter hver time. Elever elsker å se fremgang, og fornøyde elever betyr lengre kundeforhold.
                </p>
              </div>
              <div className="flex-1 w-full max-w-md mx-auto">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 transform rotate-0 sm:rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-bold">M</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Mamma til Jonas</p>
                      <p className="text-xs text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none sm:ml-8 text-sm shadow-sm">
                      Hei! Dagens time gikk kjempebra. Jonas har virkelig knekt koden på algebra nå. Sender over faktura for timen.
                    </div>
                    <div className="bg-slate-100 text-slate-800 p-3 rounded-2xl rounded-tl-none sm:mr-8 text-sm">
                      Så fantastisk å høre! Tusen takk for hjelpen. Faktura er betalt via Vipps nå. 😊
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 4. Differentiation Section */}
        <section className="py-16 sm:py-24 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center">Endelig et verktøy som snakker ditt språk.</h2>
            
            <div className="space-y-6">
              {[
                {
                  title: "100% Norsk.",
                  desc: "Vi forstår norske skatteregler, skoleår og betalingsvaner."
                },
                {
                  title: "Enkelhet foran alt.",
                  desc: "Du trenger ikke være IT-ekspert. Hvis du kan bruke Facebook, kan du bruke TutorFlyt."
                },
                {
                  title: "Laget for solo-lærere.",
                  desc: "Vi er ikke et komplisert system for store skoler – vi er bygget for deg som jobber alene."
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 bg-slate-800/50 p-5 sm:p-6 rounded-2xl border border-slate-700">
                  <div className="shrink-0 mt-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">{item.title}</h3>
                    <p className="text-slate-300 text-base sm:text-lg">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. FAQ Section */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Ofte stilte spørsmål</h2>
            <div className="border-t border-slate-200">
              <AccordionItem 
                question="Hva koster det?" 
                answer={
                  <div className="space-y-3">
                    <p>TutorFlyt koster <span className="text-indigo-600 font-bold">149 kr per måned</span> etter gratis prøveperiode.</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>14 dager gratis prøveperiode.</li>
                      <li>Ingen bindingstid eller skjulte gebyrer.</li>
                      <li>Én pris for elever, timeplan, rapporter, meldinger og betalingsoversikt.</li>
                    </ul>
                    <p className="pt-2 border-t border-slate-100 text-sm text-slate-500 italic">
                      Abonnementet kan avsluttes når som helst.
                    </p>
                  </div>
                } 
              />
              <AccordionItem 
                question="Fungerer det på iPhone og Android?" 
                answer="Ja, TutorFlyt er bygget for å fungere perfekt i nettleseren på alle mobiler. En egen app er også under utvikling og vil bli presentert på et senere tidspunkt." 
              />
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
