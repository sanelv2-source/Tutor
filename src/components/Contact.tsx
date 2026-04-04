import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import Logo from './Logo';
import Footer from './Footer';

export default function Contact({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Contact Info */}
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Kontakt oss</h1>
            <p className="text-lg text-slate-600 mb-8 max-w-md">
              Vi er her for å hjelpe deg. Ta kontakt hvis du har spørsmål om TutorFlyt, priser, eller trenger teknisk support.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Mail className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-slate-900">E-post</h3>
                  <p className="mt-1 text-slate-500">
                    <a href="mailto:info@tutorflyt.no" className="hover:text-indigo-600 transition-colors">info@tutorflyt.no</a>
                  </p>
                  <p className="text-sm text-slate-400 mt-1">Vi svarer vanligvis innen 24 timer.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Phone className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-slate-900">Telefon</h3>
                  <p className="mt-1 text-slate-500">
                    <a href="tel:+4712345678" className="hover:text-indigo-600 transition-colors">+47 12 34 56 78</a>
                  </p>
                  <p className="text-sm text-slate-400 mt-1">Man-Fre, 09:00 - 16:00</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <MapPin className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-slate-900">Kontor</h3>
                  <p className="mt-1 text-slate-500">
                    Teknologiveien 1<br />
                    4800 Arendal<br />
                    Norge
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send oss en melding</h2>
            
            {isSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                  <Send className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-emerald-900 mb-2">Melding sendt!</h3>
                <p className="text-emerald-700">
                  Takk for at du tok kontakt. Vi vil svare deg så fort som mulig.
                </p>
                <button 
                  onClick={() => setIsSent(false)}
                  className="mt-6 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Send en ny melding
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="first-name" className="block text-sm font-medium text-slate-700 mb-1">Fornavn</label>
                    <input type="text" id="first-name" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="last-name" className="block text-sm font-medium text-slate-700 mb-1">Etternavn</label>
                    <input type="text" id="last-name" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-postadresse</label>
                  <input type="email" id="email" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Melding</label>
                  <textarea id="message" rows={4} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"></textarea>
                </div>
                
                <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">
                  <Send className="h-4 w-4 mr-2" />
                  Send melding
                </button>
              </form>
            )}
          </div>
          
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
