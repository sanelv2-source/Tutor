import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface InviteStudentProps {
  tutorId: string;
  onInviteSuccess?: (email: string) => void;
}

const InviteStudent: React.FC<InviteStudentProps> = ({ tutorId, onInviteSuccess }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sender invitasjon...');

    try {
      // 1. Hent læreren som er logget inn (deg)
      const { data: { user: tutor } } = await supabase.auth.getUser();

      if (!tutor) {
        console.error("Ingen lærer logget inn");
        setStatus("Ingen lærer logget inn");
        return;
      }

      // Generer et tilfeldig passord for eleven
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const studentName = email.split('@')[0];

      // 2. Opprett eleven i Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: randomPassword,
        options: {
          data: {
            role: 'student',
            full_name: studentName // Lagres i metadata for enkel tilgang
          }
        }
      });

      if (authError) {
        console.error("Kunne ikke opprette Auth-bruker:", authError.message);
        setStatus("Feil: " + authError.message);
        return;
      }

      // 3. Lagre koblingen i 'students'-tabellen
      if (authData.user) {
        const { error: dbError } = await supabase
          .from('students')
          .insert([
            { 
              auth_id: authData.user.id,    // Kobler raden til elevens innlogging
              tutor_id: tutor.id,           // Kobler eleven til deg (læreren)
              email: email,
              full_name: studentName,       // Matcher kolonnen i SQL-en din
              status: 'pending'
            }
          ]);

        if (dbError) {
          console.error("Database-feil ved lagring av elev-rad:", dbError.message);
          setStatus("Auth-bruker opprettet, men kunne ikke lagre i students-tabellen.");
        } else {
          console.log("Suksess! Elev er nå registrert i systemet.");
          setStatus("Elev invitert og lagret!");
          if (onInviteSuccess) {
            onInviteSuccess(email);
          }
          setEmail('');
        }
      }
    } catch (err: any) {
      console.error('Invite error:', err);
      setStatus('En uventet feil oppstod.');
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
