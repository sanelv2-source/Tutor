import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Pass på at banen til din supabase-klient er riktig
import { useNavigate } from 'react-router-dom';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [meetLink, setMeetLink] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Hent innlogget bruker først
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Hent oppgaver
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('student_id', user.id) // Henter kun for denne eleven
        .order('created_at', { ascending: false });
        
      if (assignmentsData) setAssignments(assignmentsData);
      if (assignmentsError) console.error("Feil ved henting av oppgaver:", assignmentsError);

      // Hent videolenke (meet_link)
      if (user.email) {
        // 1. Hent tutor_id for denne eleven (fra students-tabellen)
        const { data: studentData } = await supabase
          .from('students')
          .select('tutor_id')
          .eq('email', user.email)
          .single();

        if (studentData?.tutor_id) {
          // 2. Hent meet_link fra den profilen (tutor-id'en)
          const { data: tutorProfile } = await supabase
            .from('profiles')
            .select('meet_link')
            .eq('id', studentData.tutor_id)
            .single();

          if (tutorProfile?.meet_link) {
            setMeetLink(tutorProfile.meet_link);
          }
        }
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    } else {
      console.error('Feil ved utlogging:', error.message);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
        <h1>Velkommen til din elevportal 🎓</h1>
        <button 
          onClick={handleLogout}
          style={{ padding: '10px 20px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Logg ut
        </button>
      </header>

      <main style={{ marginTop: '30px' }}>
        {meetLink && (
          <section style={{ backgroundColor: '#e0f2fe', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #bae6fd' }}>
            <h3 style={{ marginTop: 0, color: '#0369a1' }}>Videoundervisning</h3>
            <p style={{ color: '#0c4a6e', marginBottom: '15px' }}>Klikk på knappen under for å bli med i timen din.</p>
            <a 
              href={meetLink} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#0284c7', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}
            >
              Bli med i timen 📹
            </a>
          </section>
        )}

        <section style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
          <h3>Dine oppgaver og meldinger</h3>
          
          {assignments.length === 0 && (
            <p>Du har ingen oppgaver ennå. Ta det med ro!</p>
          )}

          {assignments.map(assignment => (
            <div key={assignment.id} style={{ border: '1px solid #ccc', margin: '15px 0', padding: '15px', borderRadius: '8px', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{assignment.title}</h4>
                <span style={{ 
                  padding: '4px 8px', 
                  backgroundColor: '#e0e7ff', 
                  color: '#4338ca', 
                  borderRadius: '9999px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold' 
                }}>
                  {assignment.status || 'Ny oppgave'}
                </span>
              </div>
              <p style={{ margin: '0 0 15px 0', whiteSpace: 'pre-wrap', color: '#334155' }}>{assignment.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Frist: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('no-NO') : 'Ingen frist'}</span>
                <span>Lagt til: {new Date(assignment.created_at).toLocaleDateString('no-NO')}</span>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
