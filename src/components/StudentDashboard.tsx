import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Pass på at banen til din supabase-klient er riktig
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  content: string;
  created_at: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetLink, setMeetLink] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Hent innlogget bruker først
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Hent oppgaver
      const { data: tasksData, error: tasksError } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', user.id) // Henter kun for denne eleven
        .order('created_at', { ascending: false });
        
      if (tasksData) setTasks(tasksData);
      if (tasksError) console.error("Feil ved henting av oppgaver:", tasksError);

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
          
          {tasks.length === 0 && (
            <p>Her vil oppgavene fra læreren din dukke opp etter hvert.</p>
          )}

          {tasks.map(task => (
            <div key={task.id} style={{ border: '1px solid #ccc', margin: '15px 0', padding: '15px', borderRadius: '8px', backgroundColor: 'white' }}>
              <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }}>{task.content}</p>
              <small style={{ color: '#666' }}>{new Date(task.created_at).toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
