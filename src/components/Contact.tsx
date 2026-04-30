import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import Footer from './Footer';

export default function Contact({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = `${formData.get('firstName') || ''} ${formData.get('lastName') || ''}`.trim();
    const email = String(formData.get('email') || '');
    const message = String(formData.get('message') || '');
    const subject = encodeURIComponent('Kontakt fra tutorflyt.no');
    const body = encodeURIComponent(`Navn: ${name}\nE-post: ${email}\n\n${message}`);

    window.location.href = `mailto:info@tutorflyt.no?subject=${subject}&body=${body}`;
    setIsSent(true);
    e.currentTarget.reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Kontakt Tutorflyt</h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              Har du spørsmål om Tutorflyt, priser eller teknisk support? Send oss en melding, så svarer vi så fort vi kan.
            </p>
            <a href="mailto:info@tutorflyt.no" className="mt-6 inline-flex items-center gap-3 text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
              <Mail className="h-5 w-5" />
              info@tutorflyt.no
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send oss en melding</h2>
            
            {isSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                  <Send className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-emerald-900 mb-2">Melding sendt!</h3>
                <p className="text-emerald-700">
                  E-postprogrammet ditt er åpnet med meldingen ferdig utfylt. Send e-posten derfra, så svarer vi så fort som mulig.
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
                    <input type="text" id="first-name" name="firstName" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="last-name" className="block text-sm font-medium text-slate-700 mb-1">Etternavn</label>
                    <input type="text" id="last-name" name="lastName" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-postadresse</label>
                  <input type="email" id="email" name="email" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Melding</label>
                  <textarea id="message" name="message" rows={4} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"></textarea>
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
