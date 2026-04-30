import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, LifeBuoy, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';

type SupportFeedbackProps = {
  role: 'student' | 'tutor';
};

const SupportFeedback: React.FC<SupportFeedbackProps> = ({ role }) => {
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || !trimmedMessage) {
      setStatus({ type: 'error', text: 'Fyll ut både tittel og beskrivelse.' });
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError && sessionError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }

      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Du må være logget inn for å sende supportmelding.');
      }

      const response = await fetch('/api/support-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role,
          category,
          subject: trimmedSubject,
          message: trimmedMessage,
          pageUrl: window.location.href,
          userAgent: window.navigator.userAgent,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke sende meldingen akkurat nå.');
      }

      setSubject('');
      setMessage('');
      setCategory('bug');
      setStatus({ type: 'success', text: 'Meldingen er sendt til support.' });
    } catch (error: any) {
      setStatus({ type: 'error', text: error.message || 'Noe gikk galt ved innsending.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Support</h1>
            <p className="text-sm text-slate-500">Send beskjed hvis noe ikke fungerer som det skal.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hva gjelder det?</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="bug">Feil på siden</option>
              <option value="account">Konto eller innlogging</option>
              <option value="payment">Betaling</option>
              <option value="idea">Forslag</option>
              <option value="other">Annet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tittel</label>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={140}
              placeholder="Kort oppsummering"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivelse</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={7}
              maxLength={4000}
              placeholder="Hva skjedde, og hva prøvde du å gjøre?"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          {status && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{status.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sender...' : 'Send til support'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SupportFeedback;
