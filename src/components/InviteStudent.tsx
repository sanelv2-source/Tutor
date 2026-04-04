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
      const { data: { user: admin }, error: adminError } = await supabase.auth.getUser();
      if (adminError && adminError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }
      console.log("Min ID som lærer:", admin?.id);

      if (!admin) {
        setStatus("Ingen lærer logget inn");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 2. Sjekk om elev finnes
      console.log("Checking if student exists with email:", normalizedEmail, "and tutor_id:", admin.id);
      const { data: existingStudent, error: existingStudentError } = await supabase
        .from('students')
        .select('id')
        .eq('tutor_id', admin.id)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingStudentError) {
        console.error("Error checking existing student:", existingStudentError);
        throw existingStudentError;
      }
      console.log("Existing student result:", existingStudent);

      let studentId;

      if (existingStudent) {
        studentId = existingStudent.id;
        console.log("Using existing student ID:", studentId);
      } else {
        // Opprett elev
        console.log("Creating new student with:", {
          email: normalizedEmail,
          full_name: studentName,
          tutor_id: admin.id,
          status: 'active',
          subject: subject || ''
        });
        const { data: newStudent, error: studentError } = await supabase
          .from('students')
          .insert([{
            email: normalizedEmail,
            full_name: studentName,
            tutor_id: admin.id,
            status: 'active',
            subject: subject || '',
            profile_id: null
          }])
          .select()
          .single();

        if (studentError) {
          console.error("Error creating student:", studentError);
          throw new Error(`Kunne ikke opprette elev: ${studentError.message}`);
        }
        if (!newStudent) {
          console.error("No student returned after insert");
          throw new Error("Kunne ikke opprette elev: Ingen data returnert");
        }
        console.log("New student created:", newStudent);
        studentId = newStudent.id;
      }

      // 3. Check for existing pending invitation
      console.log("Checking for existing pending invitation for student:", studentId);
      const { data: existingInvite, error: existingInviteError } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInviteError) {
        console.error("Error checking existing invitation:", existingInviteError);
      }

      let token;

      if (existingInvite) {
        console.log("Reusing existing invitation:", existingInvite);
        token = existingInvite.token;
        
        // Update expires_at to give them another 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        await supabase
          .from('student_invitations')
          .update({ expires_at: expiresAt.toISOString() })
          .eq('id', existingInvite.id);
      } else {
        // 4. Opprett ny invitasjon
        const generateToken = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
          }
          // Fallback for non-secure contexts
          return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        };
        token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        console.log("Creating new invitation for student:", studentId, "with token:", token);
        const { data: newInvite, error: inviteError } = await supabase
          .from('student_invitations')
          .insert({
            student_id: studentId,
            tutor_id: admin.id,
            email: normalizedEmail,
            token,
            status: 'pending',
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();

        if (inviteError) {
          console.error("Error creating invitation:", inviteError);
          throw new Error(`Kunne ikke opprette invitasjon: ${inviteError.message}`);
        }
        console.log("New invitation created:", newInvite);
      }

      // 5. Send e-post via backend
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (sessionError.message.includes('Refresh Token')) {
          await supabase.auth.signOut().catch(() => {});
        }
        throw sessionError;
      }
      const jwt = sessionData.session?.access_token;

      const response = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          email: normalizedEmail,
          tutorName: admin.user_metadata?.full_name || "Læreren din",
          token
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kunne ikke sende e-post");
      }

      setStatus("Elev lagt til og invitasjon sendt!");
      alert("Elev lagt til og invitasjon sendt!"); // Viser en popup-beskjed
      
      if (onInviteSuccess) {
        onInviteSuccess(normalizedEmail);
      }
      setEmail('');
      setStudentName('');
      setSubject('');
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
