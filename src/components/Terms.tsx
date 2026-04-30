import React from 'react';
import Footer from './Footer';

export default function Terms({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Bruksvilkår</h1>
          
          <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
            <p>
              Sist oppdatert: {new Date().toLocaleDateString('no-NB')}
            </p>
            
            <p>
              Disse bruksvilkårene regulerer bruken av plattformen Tutorflyt. Ved å opprette en konto eller bruke tjenesten godtar brukeren disse vilkårene.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Om Tutorflyt</h2>
            <p>
              Tutorflyt er en digital administrasjonsplattform for privatlærere som ønsker bedre oversikt over egne elever, timer, kommunikasjon, fakturering og betaling.
            </p>
            <p>
              Tutorflyt er ikke en markedsplass, formidlingstjeneste eller bookingplattform. Privatlærere bruker plattformen for elevforhold de selv har etablert utenfor Tutorflyt.
            </p>
            <p>
              Tutorflyt er ikke arbeidsgiver for lærere, selger ikke undervisningstimer på vegne av lærere og er ikke ansvarlig for det faglige innholdet i undervisningen.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. Brukerkonto</h2>
            <p>
              For å bruke Tutorflyt må brukeren opprette en konto.
            </p>
            <p>
              Brukeren forplikter seg til å:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>oppgi korrekt og oppdatert informasjon</li>
              <li>holde passord og innloggingsinformasjon konfidensiell</li>
              <li>ikke overføre kontoen til andre personer</li>
              <li>varsle Tutorflyt dersom kontoen brukes uautorisert</li>
            </ul>
            <p>
              Tutorflyt kan suspendere eller avslutte kontoer som bryter vilkårene.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Roller på plattformen</h2>
            <p>
              Plattformen har to hovedtyper brukere:
            </p>
            
            <h3 className="text-lg font-medium text-slate-900 mt-6 mb-3">Privatlærere</h3>
            <p>
              Privatlærere bruker Tutorflyt til å administrere egne undervisningsavtaler og elever. Læreren er selv ansvarlig for:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>faglig innhold og kvalitet på undervisningen</li>
              <li>korrekt informasjon om kompetanse og erfaring</li>
              <li>avtaler med elever eller foresatte, inkludert pris, tidspunkt og avbestillingsregler</li>
              <li>overholdelse av gjeldende lover og skatteregler</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-900 mt-6 mb-3">Elever / foresatte</h3>
            <p>
              Elever eller foresatte kan få tilgang til deler av plattformen når en privatlærer inviterer dem. De er ansvarlige for:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>å gi korrekt kontakt- og betalingsinformasjon til læreren</li>
              <li>betaling for avtalte timer</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. Avtaler og gjennomføring av timer</h2>
            <p>
              Undervisningstimer avtales direkte mellom lærer og elev eller foresatt utenfor Tutorflyt. Plattformen kan brukes til å registrere, følge opp og administrere timer som allerede er avtalt mellom partene.
            </p>
            <p>
              Læreren er ansvarlig for å:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>møte til avtalt tid</li>
              <li>levere undervisningstjenesten som avtalt</li>
            </ul>
            <p>
              Eleven eller foresatte er ansvarlige for å:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>møte til avtalt tid</li>
              <li>gi nødvendig informasjon for gjennomføring av undervisningen</li>
            </ul>
            <p>
              Tutorflyt er ikke ansvarlig for uenigheter mellom lærer og elev knyttet til undervisningens innhold eller kvalitet.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Betaling</h2>
            <p>
              Tutorflyt kan hjelpe læreren med å opprette, sende eller vise betalingsinformasjon for avtalte undervisningstimer, for eksempel via Vipps eller andre betalingsløsninger.
            </p>
            <p>
              Betaling gjelder avtalen mellom lærer og elev eller foresatt. Med mindre annet er tydelig oppgitt, er læreren betalingsmottaker og ansvarlig for pris, levering av undervisningstjenesten, kvittering, skatt og eventuell oppfølging av betalingen.
            </p>
            <p>
              Tutorflyt kan kreve betaling fra læreren for bruk av plattformen eller tilknyttede funksjoner.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">6. Avbestilling og refusjon</h2>
            <p>
              Regler for avbestilling, endring av tidspunkt og refusjon avtales direkte mellom læreren og eleven eller foresatte.
            </p>
            <p>
              Tutorflyt avgjør ikke om en undervisningstime skal refunderes, flyttes eller erstattes. Slike spørsmål håndteres av læreren i tråd med avtalen mellom partene.
            </p>
            <p>
              Eventuelle betalingsgebyrer fra tredjeparts betalingsleverandører kan være underlagt egne vilkår.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">7. Ansvarsbegrensning</h2>
            <p>
              Tutorflyt fungerer kun som en teknologisk plattform.
            </p>
            <p>
              Tutorflyt er ikke ansvarlig for:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>kvaliteten på undervisningen</li>
              <li>faglige resultater</li>
              <li>konflikter mellom lærer og elev</li>
              <li>tap som oppstår som følge av avtaler mellom brukere</li>
            </ul>
            <p>
              Bruk av plattformen skjer på eget ansvar.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">8. Misbruk av plattformen</h2>
            <p>
              Det er ikke tillatt å bruke plattformen til:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>ulovlige aktiviteter</li>
              <li>trakassering eller misbruk av andre brukere</li>
              <li>publisering av falsk eller misvisende informasjon</li>
            </ul>
            <p>
              Tutorflyt kan suspendere eller avslutte kontoer ved brudd på disse reglene.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">9. Personvern</h2>
            <p>
              Tutorflyt behandler personopplysninger i henhold til gjeldende personvernlovgivning og plattformens personvernerklæring.
            </p>
            <p>
              Personopplysninger brukes kun for å levere og forbedre tjenesten.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">10. Endringer i vilkårene</h2>
            <p>
              Tutorflyt kan oppdatere disse bruksvilkårene ved behov.
            </p>
            <p>
              Ved vesentlige endringer vil brukere bli informert gjennom plattformen eller via e-post.
            </p>
            <p>
              Videre bruk av tjenesten etter oppdatering innebærer aksept av de nye vilkårene.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">11. Gjeldende lov</h2>
            <p>
              Disse vilkårene er underlagt norsk lov.
            </p>
            <p>
              Eventuelle tvister skal behandles av norske domstoler.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">12. Kontakt</h2>
            <p>
              Spørsmål om bruksvilkårene kan rettes til:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
              <p className="font-medium text-slate-900 mb-1">Tutorflyt</p>
              <p>E-post: <a href="mailto:info@tutorflyt.no" className="text-indigo-600 hover:underline">info@tutorflyt.no</a></p>
              <p>Nettside: <a href="https://tutorflyt.no" className="text-indigo-600 hover:underline">tutorflyt.no</a></p>
            </div>
          </div>
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
