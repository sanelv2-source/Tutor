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

import { supabase } from '../supabaseClient';

// FAQ Accordion Component
const AccordionItem = ({ question, answer }: { question: string, answer: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button 
        className="w-full py-6 flex justify-between items-center text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg font-medium text-slate-900">{question}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
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
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Lagre data i Supabase beta_applicants
      const { error: insertError } = await supabase
        .from('beta_applicants')
        .insert([{ 
          full_name: fullName, 
          email: email,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // 2. Send brukeren til Google Forms etter vellykket lagring
      window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSf7_8kcLRF1Qf4e5Z1Th82_FM2hbTcrQXUtL5WKitOWczZ9ww/viewform?usp=dialog";
    } catch (err: any) {
      console.error("Feil ved lagring:", err.message);
      setError("Det oppstod en feil. Vennligst prøv igjen senere.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <main>
        {/* 1. Hero Section */}
        <section className="pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Slutt å mase om betaling. <span className="text-indigo-600">Begynn å undervise.</span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Det enkle kontrollpanelet bygget for norske privatlærere. Automatiser fakturering, styr timeplanen og imponerer elevene – alt fra mobilen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <button 
                  onClick={() => onNavigate('signup')}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 text-base font-bold rounded-xl text-white bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Bli med og få (50% de tre første månedene)
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-500 font-medium">
                Gratis oppstart. Ingen kredittkort kreves.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
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
            <div className="relative mx-auto w-full max-w-[320px] lg:max-w-none lg:ml-auto flex justify-center">
              <div className="relative w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-3xl w-40 mx-auto z-20"></div>
                <div className="bg-slate-50 w-full h-full flex flex-col relative z-10">
                  <div className="bg-indigo-600 text-white pt-12 pb-6 px-6 rounded-b-3xl shadow-sm">
                    <p className="text-indigo-100 text-sm font-medium mb-1">Total inntjening</p>
                    <h3 className="text-3xl font-bold">kr 12 450</h3>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-4 mt-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 animate-fade-in-up">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Vellykket betaling</p>
                        <p className="text-sm text-slate-500">Mattehjelp - Jonas (Vipps)</p>
                      </div>
                      <div className="ml-auto font-bold text-emerald-600">+450 kr</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 opacity-70">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Vellykket betaling</p>
                        <p className="text-sm text-slate-500">Pianotime - Sofie (Kort)</p>
                      </div>
                      <div className="ml-auto font-bold text-emerald-600">+500 kr</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative blobs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-indigo-200 to-orange-100 rounded-full blur-3xl -z-10 opacity-60"></div>
            </div>
          </div>
        </section>

        {/* 2. Problem/Agitation Section */}
        <section className="py-24 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
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
        <section className="py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
            
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 transform rotate-2 hover:rotate-0 transition-transform duration-300">
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
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium">
                            {inv.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{inv.name}</p>
                            <p className="text-xs text-slate-500">Gitarundervisning</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${inv.bg} ${inv.color}`}>
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
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
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 transform rotate-2 hover:rotate-0 transition-transform duration-300">
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
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none ml-8 text-sm shadow-sm">
                      Hei! Dagens time gikk kjempebra. Jonas har virkelig knekt koden på algebra nå. Sender over faktura for timen.
                    </div>
                    <div className="bg-slate-100 text-slate-800 p-3 rounded-2xl rounded-tl-none mr-8 text-sm">
                      Så fantastisk å høre! Tusen takk for hjelpen. Faktura er betalt via Vipps nå. 😊
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 4. Differentiation Section */}
        <section className="py-24 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">Endelig et verktøy som snakker ditt språk.</h2>
            
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
                <div key={i} className="flex gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <div className="shrink-0 mt-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">{item.title}</h3>
                    <p className="text-slate-300 text-lg">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. FAQ Section */}
        <section className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Ofte stilte spørsmål</h2>
            <div className="border-t border-slate-200">
              <AccordionItem 
                question="Hva koster det?" 
                answer={
                  <div className="space-y-3">
                    <p>Vi har ulike faser for våre tidlige brukere:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><span className="font-bold text-slate-900">Closed Beta:</span> Helt gratis tilgang for inviterte beta-testere.</li>
                      <li><span className="font-bold text-slate-900">Open Beta:</span> Redusert pris på <span className="text-indigo-600 font-bold">99,-/mnd</span>.</li>
                      <li><span className="font-bold text-slate-900">Verv-en-venn:</span> Få en gratis måned dersom du inviterer 10 nye brukere som registrerer seg via din referal-link.</li>
                    </ul>
                    <p className="pt-2 border-t border-slate-100 text-sm text-slate-500 italic">
                      Ordinær pris uten rabatter eller tilbud er 148,-/mnd.
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

        {/* 6. Final CTA */}
        <section id="beta" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto bg-indigo-600 rounded-[2.5rem] p-10 sm:p-16 text-center shadow-2xl relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-indigo-700 rounded-full blur-3xl opacity-50"></div>
            
            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
                Søknad for Closed-Beta
              </h2>
              <p className="text-xl text-indigo-100 mb-10">
                Registrer deg under for å søke om plass i vår Closed Beta. 
                Når du har sendt inn navn og e-post, vil du bli sendt videre til en kort spørreundersøkelse.
              </p>
              
              <form onSubmit={handleSubscribe} className="flex flex-col gap-4 max-w-md mx-auto">
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ditt fulle navn" 
                  className="w-full px-6 py-4 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 text-lg placeholder:text-slate-400"
                />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Din e-postadresse" 
                  className="w-full px-6 py-4 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 text-lg placeholder:text-slate-400"
                />
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg transition-all shadow-lg active:scale-[0.98] disabled:opacity-70"
                >
                  {isSubmitting ? 'Sender...' : 'Søk her'}
                </button>
              </form>
              {error && (
                <p className="mt-4 text-red-200 text-sm font-medium animate-fade-in">
                  {error}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
