import React from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function Unauthorized({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Ingen tilgang</h1>
        <p className="text-slate-600 mb-8">
          Du har ikke riktig rolle for å se denne siden. Vennligst logg inn med en annen konto eller gå tilbake til forsiden.
        </p>
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tilbake til forsiden
        </button>
      </div>
    </div>
  );
}
