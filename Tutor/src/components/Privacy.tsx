import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
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
              Vi samler inn informasjon du gir oss direkte når du registrerer deg for en konto, inkludert navn, e-postadresse og betalingsinformasjon.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. Hvordan vi bruker informasjonen</h2>
            <p>
              Vi bruker informasjonen vi samler inn til å:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Tilby, vedlikeholde og forbedre våre tjenester</li>
              <li>Behandle transaksjoner og sende relaterte opplysninger</li>
              <li>Sende tekniske varsler, oppdateringer og sikkerhetsmeldinger</li>
              <li>Svare på dine kommentarer, spørsmål og forespørsler</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Deling av informasjon</h2>
            <p>
              Vi deler ikke din personlige informasjon med tredjeparter, bortsett fra når det er nødvendig for å tilby våre tjenester (for eksempel betalingsbehandling via Stripe) eller for å overholde loven.
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
