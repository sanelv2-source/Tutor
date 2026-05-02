import React from 'react';
import Footer from './Footer';

export default function Privacy({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Personvernerklæring</h1>
          
          <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
            <p>
              Sist oppdatert: {new Date().toLocaleDateString('no-NB')}
            </p>
            
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Informasjon vi samler inn</h2>
            <p>
              Vi samler inn informasjon du gir oss direkte når du registrerer deg eller bruker Tutorflyt, inkludert navn, e-postadresse, innloggingsinformasjon og profilopplysninger.
            </p>
            <p>
              Når en privatlærer bruker plattformen, kan læreren legge inn informasjon om egne elever eller foresatte, undervisningstimer, meldinger, oppgaver, rapporter og betalingsstatus. Elever eller foresatte får bare tilgang når læreren inviterer dem eller deler relevant informasjon.
            </p>
            <p>
              Tutorflyt tilbyr ikke booking av undervisningstimer. Opplysninger om timer og betalinger brukes for å administrere avtaler som allerede er inngått mellom læreren og eleven eller foresatte.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. Hvordan vi bruker informasjonen</h2>
            <p>
              Vi bruker informasjonen vi samler inn til å:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Tilby, vedlikeholde og forbedre administrasjonsverktøyene i Tutorflyt</li>
              <li>Vise og sende informasjon om timer, betalinger, meldinger og rapporter</li>
              <li>Håndtere betalingsflyt og betalingsstatus når læreren bruker integrerte betalingsløsninger</li>
              <li>Sende tekniske varsler, oppdateringer og sikkerhetsmeldinger</li>
              <li>Svare på dine kommentarer, spørsmål og forespørsler</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Deling av informasjon</h2>
            <p>
              Vi deler ikke personopplysninger med tredjeparter med mindre det er nødvendig for å levere tjenesten, for eksempel drift, e-postutsending, sikkerhet eller betalingsbehandling via leverandører som Vipps eller Stripe, eller når vi er lovpålagt å gjøre det.
            </p>
            <p>
              Betalingsleverandører kan behandle betalingsopplysninger etter egne vilkår. Tutorflyt lagrer ikke fullstendige kortdetaljer.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. Dine rettigheter</h2>
            <p>
              Du har rett til å be om innsyn i, retting av eller sletting av dine personopplysninger. Kontakt oss hvis du ønsker å utøve disse rettighetene.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Kontakt oss</h2>
            <p>
              Hvis du har spørsmål om denne personvernerklæringen, vennligst kontakt oss.
            </p>
          </div>
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
