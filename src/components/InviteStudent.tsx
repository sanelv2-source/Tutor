import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface InviteStudentProps {
  tutorId: string;
  onInviteSuccess?: (email: string) => void;
}

const InviteStudent: React.FC<InviteStudentProps> = ({ tutorId, onInviteSuccess }) => {
  const [email, setEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sender invitasjon...');

    try {
      // 1. Hent din egen ID (Læreren)
      const { data: { user: admin } } = await supabase.auth.getUser();
      console.log("Min ID som lærer:", admin?.id);

      if (!admin) {
        alert("Du må være logget inn som lærer!");
        setStatus("Ingen lærer logget inn");
        return;
      }

      // 2. Opprett eleven
      // Merk: supabase.auth.admin er normalt ikke tilgjengelig på klientsiden,
      // så vi bruker optional chaining for å unngå kræsj, og faller tilbake til signUp.
      let authError = null;
      if (supabase.auth.admin) {
        const { error } = await supabase.auth.admin.createUser({
          email: email,
          password: 'Password123!', // Vi setter et standardpassord de kan bytte
          email_confirm: true,       // Dette "bekrefter" dem automatisk
          user_metadata: { role: 'student', full_name: studentName }
        });
        authError = error;
      } else {
        authError = new Error("Admin API ikke tilgjengelig på klienten");
      }

      // Hvis admin-opprettelse feiler (pga rettigheter eller manglende API), prøv vanlig signUp:
      if (authError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: 'Password123!',
          options: { data: { role: 'student', full_name: studentName } }
        });
        if (signUpError) throw signUpError;
      }

      // 3. Lagre i tabellen - VIKTIG: Bruk din ID som tutor_id
      const { error: dbError } = await supabase
        .from('students')
        .insert([
          { 
            email: email,
            full_name: studentName,
            tutor_id: admin.id, // Dette er din ID fra profiles-tabellen
            status: 'active',
            subject: subject
          }
        ]);

      if (dbError) {
        console.error("Databasefeil:", dbError.message);
        alert("Kunne ikke lagre i tabell: " + dbError.message);
        setStatus("Kunne ikke lagre i tabell: " + dbError.message);
      } else {
        alert("Elev lagt til i listen!");
        setStatus("Elev lagt til i listen!");
        if (onInviteSuccess) {
          onInviteSuccess(email);
        }
        setEmail('');
        setStudentName('');
        setSubject('');
      }
    } catch (err: any) {
      console.error('Invite error:', err);
      setStatus('En uventet feil oppstod: ' + err.message);
    }
  };

  return (
    <form onSubmit={handleInvite} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <h3 className="font-bold text-lg text-slate-900 mb-2">Inviter ny elev</h3>
      <p className="text-sm text-slate-500 mb-4">Legg til en ny elev i oversikten din.</p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text" 
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Elevens fulle navn"
          className="flex-1 border border-slate-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          required
        />
        <input 
          type="text" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Fag (f.eks. Matematikk)"
          className="flex-1 border border-slate-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          required
        />
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="elev@eksempel.no"
          className="flex-1 border border-slate-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          required
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap">
          Legg til elev
        </button>
      </div>
      
      {status && (
        <p className={`text-sm mt-3 ${status.includes('feil') || status.includes('Kunne ikke') ? 'text-red-600' : 'text-emerald-600 font-medium'}`}>
          {status}
        </p>
      )}
    </form>
  );
};

export default InviteStudent;
