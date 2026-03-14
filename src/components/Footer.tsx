import React from 'react';
import Logo from './Logo';

export default function Footer({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="mb-4">
              <Logo iconSize="w-8 h-8" textSize="text-2xl" />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Det enkle kontrollpanelet bygget for norske privatlærere.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Produkt</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-indigo-600 transition-colors">Slik fungerer det</button></li>
              <li><button onClick={() => onNavigate('pricing')} className="hover:text-indigo-600 transition-colors">Priser</button></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Selskap</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><button onClick={() => onNavigate('about')} className="hover:text-indigo-600 transition-colors">Vår historie</button></li>
              <li><button onClick={() => onNavigate('contact')} className="hover:text-indigo-600 transition-colors">Kontakt</button></li>
              <li><button onClick={() => onNavigate('emails')} className="hover:text-indigo-600 transition-colors">E-postmaler (Demo)</button></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Juridisk</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><button onClick={() => onNavigate('privacy')} className="hover:text-indigo-600 transition-colors">Personvern</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-indigo-600 transition-colors">Bruksvilkår</button></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} TutorFlyt. Med enerett.
          </p>
        </div>
      </div>
    </footer>
  );
}
