import React, { useState } from 'react';

interface InviteStudentProps {
  tutorId: string;
}

const InviteStudent: React.FC<InviteStudentProps> = ({ tutorId }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sender invitasjon...');

    try {
      // Trigger e-post via backend API
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, tutorId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Kunne ikke sende invitasjon');
      }

      setStatus('Invitasjon sendt til ' + email + '!');
      setEmail('');
    } catch (err) {
      setStatus('Noe gikk galt: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <form onSubmit={sendInvitation} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <h3 className="font-bold text-lg text-slate-900 mb-2">Inviter ny elev</h3>
      <p className="text-sm text-slate-500 mb-4">Send en magisk lenke til eleven slik at de kan logge inn på sin portal.</p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="elev@eksempel.no"
          className="flex-1 border border-slate-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          required
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap">
          Send invitasjon
        </button>
      </div>
      
      {status && (
        <p className={`text-sm mt-3 ${status.includes('gikk galt') ? 'text-red-600' : 'text-emerald-600 font-medium'}`}>
          {status}
        </p>
      )}
    </form>
  );
};

export default InviteStudent;
