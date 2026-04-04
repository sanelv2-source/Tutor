import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Footer from './Footer';

interface TermsOfSaleProps {
  onNavigate: (page: string) => void;
}

const TermsOfSale: React.FC<TermsOfSaleProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til forsiden
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Salgsvilkår</h1>
            
            <div className="prose prose-blue max-w-none text-gray-600 space-y-8">
              <section>
                <p className="text-sm text-gray-500 mb-4">Sist oppdatert: {new Date().toLocaleDateString('no-NO')}</p>
                <p>
                  Disse salgsvilkårene gjelder for alt salg av tjenester og abonnementer fra Tutorflyt til forbrukere. 
                  Vilkårene utgjør sammen med din bestilling, bekreftet gjennom en ordrebekreftelse, det samlede 
                  avtalegrunnlaget for kjøpet.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Parter</h2>
                <p>
                  <strong>Selger:</strong> Tutorflyt (heretter benevnt som "vi", "oss" eller "Tutorflyt")<br />
                  <strong>E-post:</strong> info@tutorflyt.no<br />
                  <strong>Organisasjonsnummer:</strong> 937 317 336
                </p>
                <p className="mt-4">
                  <strong>Kjøper:</strong> Den personen som foretar bestillingen (heretter benevnt som "du", "deg", "kjøperen" eller "kunden").
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Betaling</h2>
                <p>
                  Betaling skjer via de betalingsløsningene som tilbys på plattformen (f.eks. Stripe, Vipps). 
                  Ved kjøp av abonnement vil betalingen trekkes automatisk forskuddsvis for hver avtaleperiode 
                  (f.eks. månedlig eller årlig) inntil abonnementet sies opp.
                </p>
                <p className="mt-2">
                  Alle priser er oppgitt i norske kroner (NOK) og inkluderer merverdiavgift (MVA) der dette er gjeldende. 
                  Totalprisen for kjøpet vil fremkomme før bestillingen bekreftes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Levering</h2>
                <p>
                  Levering av tjenesten (tilgang til Tutorflyt-plattformen) skjer umiddelbart etter at betalingen er 
                  bekreftet. Du vil motta en ordrebekreftelse på e-post, og tjenesten er tilgjengelig så snart du 
                  logger inn på din brukerkonto.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Angrerett</h2>
                <p>
                  Som forbruker har du 14 dagers angrerett etter angrerettloven. Angrefristen løper fra den dagen 
                  avtalen om tjenesten ble inngått.
                </p>
                <p className="mt-2">
                  <strong>Unntak fra angreretten:</strong> Dersom du uttrykkelig har samtykket til at leveringen av 
                  tjenesten (f.eks. bruk av plattformen) begynner før angrefristen utløper, og du har erkjent at 
                  angreretten dermed går tapt, gjelder ikke angreretten etter at tjenesten er levert.
                </p>
                <p className="mt-2">
                  For å benytte angreretten må du gi oss tydelig beskjed før angrefristen utløper. Dette kan gjøres 
                  ved å sende en e-post til info@tutorflyt.no.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Retur og oppsigelse</h2>
                <p>
                  Da Tutorflyt leverer digitale tjenester og abonnementer, gjelder ikke tradisjonell retur av fysiske varer. 
                  Abonnementer løper til de sies opp av kunden.
                </p>
                <p className="mt-2">
                  Du kan når som helst si opp ditt abonnement via kontoinnstillingene dine. Oppsigelsen vil gjelde fra 
                  utløpet av den inneværende betalingsperioden. Det gis ikke refusjon for allerede innbetalte beløp 
                  for påbegynte perioder, med mindre annet følger av lov.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Reklamasjonshåndtering</h2>
                <p>
                  Dersom det foreligger en mangel ved tjenesten, må du innen rimelig tid etter at du oppdaget eller 
                  burde ha oppdaget mangelen, gi oss melding om at du vil påberope deg mangelen (reklamasjon).
                </p>
                <p className="mt-2">
                  Reklamasjoner kan rettes til oss på e-post: info@tutorflyt.no. Vi vil forsøke å rette opp i 
                  eventuelle feil eller mangler så raskt som mulig.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Konfliktløsning</h2>
                <p>
                  Klager rettes til selger innen rimelig tid. Partene skal forsøke å løse eventuelle tvister i minnelighet. 
                  Dersom dette ikke lykkes, kan du ta kontakt med Forbrukertilsynet for mekling. Forbrukertilsynet er 
                  tilgjengelig på telefon 23 400 600 eller www.forbrukertilsynet.no.
                </p>
                <p className="mt-2">
                  Europa-Kommisjonens klageportal kan også brukes hvis du ønsker å inngi en klage. Det er særlig 
                  relevant hvis du er forbruker bosatt i et annet EU/EØS-land. Klagen inngis her: http://ec.europa.eu/odr.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default TermsOfSale;
