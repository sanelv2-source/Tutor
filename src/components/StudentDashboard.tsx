import React, { useState, useEffect } from 'react';
import { LogOut, Video, Calendar, CheckCircle, Clock, MessageSquare, ExternalLink, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient'; // Pass på at banen til din supabase-klient er riktig
import { useNavigate } from 'react-router-dom';
import MyCalendar from './MyCalendar';
import StudentSidebar from './StudentSidebar';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
  tutor_id: string;
  is_task?: boolean;
  video_url?: string;
  is_completed?: boolean;
  submission_url?: string;
  profiles?: {
    full_name: string;
  };
}

const SubmitAssignment = ({ 
  taskId, 
  studentId,
  tutorId,
  onComplete 
}: { 
  taskId: string, 
  studentId: string,
  tutorId: string,
  onComplete: (url: string) => void 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      // 1. Lag et unikt filnavn (for å unngå at elever overskriver hverandres filer)
      const filEnding = file.name.split('.').pop();
      const filNavn = `${studentId}/${taskId}_${Date.now()}.${filEnding}`;

      // 2. Last opp til Supabase Storage (bruker 'submissions' bucket)
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filNavn, file);

      if (uploadError) throw uploadError;

      // 3. Hent den offentlige URL-en til filen
      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(filNavn);

      const publicUrl = urlData.publicUrl;

      // 4. Lagre alt i 'submissions'-tabellen
      const { error: dbError } = await supabase
        .from('submissions')
        .insert([{
          student_id: studentId,
          assignment_id: taskId,
          tutor_id: tutorId,
          file_url: publicUrl, // Her lagres lenken til bildet!
          status: 'sent'       // Dette gjør statusen GUL
        }]);

      if (dbError) throw dbError;

      // 5. Oppdater statusen på selve oppgaven også
      const { error: assignError } = await supabase
        .from('assignments')
        .update({ 
          status: 'sent',
          submission_url: publicUrl,
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (assignError) throw assignError;

      setMessage({ text: "Oppgaven er levert!", type: 'success' });
      onComplete(publicUrl);

    } catch (error: any) {
      console.error("Feil under innsending:", error.message);
      setMessage({ text: "Noe gikk galt: " + error.message, type: 'error' });
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="mt-2 p-3 border border-blue-100 bg-blue-50/30 rounded-xl">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
          Last opp svar (Bilde/PDF)
        </label>
        
        <input 
          type="file" 
          onChange={handleFileChange}
          className="block w-full text-[10px] text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-white file:text-blue-700 hover:file:bg-blue-50 cursor-pointer"
        />

        {file && (
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className={`w-full py-2 rounded-lg font-bold text-white text-xs transition-all shadow-sm ${
              uploading 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {uploading ? 'Sender inn... 🚀' : '🚀 Send inn svar'}
          </button>
        )}

        {message && (
          <p className={`text-[10px] font-bold mt-1 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
};

const JoinClassSection = ({ meet_link, video_url }: { meet_link: string | null, video_url: string | null }) => {
  return (
    <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
      <h2 className="text-xl font-bold mb-4">Bli med i timen</h2>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">
        {meet_link ? (
          <a 
            href={meet_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md"
          >
            🚀 Gå til nettmøte
          </a>
        ) : (
          <p className="text-gray-500 italic">Læreren din har ikke lagt til en møtelenke ennå.</p>
        )}
      </div>

      {/* SEKSJON: VIDEO FRA LÆRER */}
      {video_url ? (
        <div className="mt-4">
          <a 
            href={video_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02]"
          >
            <span className="text-2xl">▶</span> 
            Se video-gjennomgang fra læreren
          </a>
        </div>
      ) : (
        <p className="text-gray-400 text-sm mt-4 text-center italic">
          Ingen video delt for denne økten ennå.
        </p>
      )}
    </section>
  );
};

const StudentTaskList = ({ 
  assignments, 
  studentId,
  setAssignments,
  onOpenVideo,
  onDelete,
  onUploadSuccess
}: { 
  assignments: Assignment[], 
  studentId: string | null,
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>,
  onOpenVideo: (url: string) => void,
  onDelete: (id: string) => void,
  onUploadSuccess: (id: string, url: string) => void
}) => {
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  return (
    <div className="max-w-[800px] mx-auto space-y-3">
      {assignments.length > 0 ? (
        assignments.map((task) => {
          // Fargekoding basert på status (venstre kant)
          let borderClass = 'border-l-gray-300';
          if (task.is_completed) {
            if (task.status === 'Godkjent') borderClass = 'border-l-[#28a745]';
            else if (task.status === 'Ikke godkjent') borderClass = 'border-l-[#dc3545]';
            else if (task.status === 'sent' || task.status === 'Under godkjenning') borderClass = 'border-l-[#ffcc00]';
            else borderClass = 'border-l-[#ffcc00]';
          }

          return (
            <div 
              key={task.id} 
              className={`bg-white border-l-[5px] ${borderClass} p-4 md:p-5 rounded-lg shadow-[0_2px_5px_rgba(0,0,0,0.1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md`}
            >
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-bold text-sm md:text-base ${task.is_completed ? 'text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  {task.is_completed && (
                    <span className="text-[9px] uppercase tracking-[0.5px] font-bold text-gray-400">
                      — {task.status === 'sent' ? 'Under godkjenning' : (task.status || 'Under godkjenning')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <span>Frist: {task.due_date ? new Date(task.due_date).toLocaleDateString('no-NO') : '-'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                {!task.is_completed ? (
                  <div className="flex flex-col items-end gap-2 w-full">
                    <div className="flex items-center gap-2">
                      {task.video_url && (
                        <button 
                          onClick={() => onOpenVideo(task.video_url!)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Se video"
                        >
                          ▶
                        </button>
                      )}
                      <button 
                        onClick={() => setSubmittingTaskId(submittingTaskId === task.id ? null : task.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                      >
                        {submittingTaskId === task.id ? 'Lukk' : '🚀 Send inn svar'}
                      </button>
                      <button 
                        onClick={() => onDelete(task.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Slett"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {submittingTaskId === task.id && studentId && (
                      <div className="w-full min-w-[250px]">
                        <SubmitAssignment 
                          taskId={task.id} 
                          studentId={studentId}
                          tutorId={task.tutor_id}
                          onComplete={(url) => {
                            onUploadSuccess(task.id, url);
                            setSubmittingTaskId(null);
                          }} 
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {task.submission_url && (
                      <a 
                        href={task.submission_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 text-[10px] font-bold hover:underline uppercase tracking-wider"
                      >
                        Se bilde
                      </a>
                    )}
                    <button 
                      onClick={() => onDelete(task.id)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      title="Slett"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-10 text-center text-gray-400 italic bg-white rounded-xl border border-dashed border-gray-200">
          Ingen oppgaver lagt til ennå. Ta en kaffe! ☕
        </div>
      )}
    </div>
  );
};

const MyUploadsManager = ({ 
  assignments, 
  onRemoveSubmission 
}: { 
  assignments: Assignment[], 
  onRemoveSubmission: (id: string) => void 
}) => {
  const uploads = assignments.filter(a => a.submission_url);

  return (
    <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
      <h2 className="text-xl font-bold mb-4">Mine Innleveringer</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {uploads.length > 0 ? (
          uploads.map(a => (
            <div key={a.id} className="group relative border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 hover:shadow-md transition-all">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={a.submission_url} 
                  alt={a.title} 
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                  onClick={() => window.open(a.submission_url, '_blank')}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onRemoveSubmission(a.id)}
                    className="p-2 bg-white/90 text-red-500 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                    title="Fjern innlevering"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm text-gray-800 mb-1">{a.title}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                    Levert: {new Date(a.created_at).toLocaleDateString('no-NO')}
                  </span>
                  <button 
                    onClick={() => window.open(a.submission_url, '_blank')}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Åpne full størrelse
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-20 text-center">
            <div className="text-4xl mb-4 opacity-20">📤</div>
            <p className="text-gray-400 italic">Ingen innleveringer ennå. Oppgaver du leverer vil dukke opp her.</p>
          </div>
        )}
      </div>
    </section>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return;

    // 1. Finn først den korrekte ID-en og tutor_id fra 'students'-tabellen
    // Vi prøver først med user.id (som er standard i Supabase)
    let { data: studentRecord, error: studentError } = await supabase
      .from('students')
      .select('id, tutor_id')
      .eq('id', user.id)
      .single();

    // Hvis det feiler, prøv med e-post (fallback for eldre rader)
    if (studentError || !studentRecord) {
      const { data: fallbackRecord, error: fallbackError } = await supabase
        .from('students')
        .select('id, tutor_id')
        .eq('email', user.email)
        .single();
      
      if (fallbackError || !fallbackRecord) {
        console.error("Fant ikke eleven i students-tabellen:", fallbackError || "Ingen post funnet");
        return;
      }
      studentRecord = fallbackRecord;
    }

    setStudentId(studentRecord.id);

    // 2. Hent oppgaver ved å bruke ID-en fra tabellen
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*, profiles(full_name)')
      .eq('student_id', studentRecord.id)
      .order('created_at', { ascending: false });

    if (assignmentsData) {
      setAssignments(assignmentsData as Assignment[]);
    } else {
      setAssignments([]);
    }
    
    // 3. Hent videolenke fra læreren
    const { data: tutorProfile } = await supabase
      .from('profiles')
      .select('meet_link, video_url')
      .eq('id', studentRecord.tutor_id)
      .single();

    if (tutorProfile?.meet_link) {
      setMeetLink(tutorProfile.meet_link);
    }
    if (tutorProfile?.video_url) {
      setVideoUrl(tutorProfile.video_url);
    }
  };

  useEffect(() => {
    fetchData();

    // Lytt etter endringer i oppgaver i sanntid!
    const channel = supabase
      .channel('assignments-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'assignments' }, 
        () => {
          fetchData(); // Henter lista på nytt når noe endres
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    } else {
      console.error('Feil ved utlogging:', error.message);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    const id = assignmentToDelete;
    
    // Lukk modalen
    setAssignmentToDelete(null);

    // Oppdater state umiddelbart (optimistisk fjerning)
    setAssignments(prev => prev.filter(a => a.id !== id));

    // Slett fra databasen
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) {
      console.error('Feil ved sletting av oppgave:', error);
      // alert() fungerer heller ikke bra i iframe, så vi logger det bare, 
      // eller man kunne lagt til en feil-state.
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    // Optimistisk oppdatering
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, is_completed: completed } : a));

    const { error } = await supabase
      .from('assignments')
      .update({ is_completed: completed })
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) {
      console.error('Feil ved oppdatering av status:', error);
      // Rull tilbake ved feil
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, is_completed: !completed } : a));
    }
  };

  const handleUploadSuccess = (id: string, url: string) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, submission_url: url, is_completed: true } : a));
  };

  const handleRemoveSubmission = async (id: string) => {
    const assignment = assignments.find(a => a.id === id);
    if (!assignment || !assignment.submission_url || !studentId) return;

    // Ekstraher filstien fra URL-en (vi trenger mappen også, f.eks. "user-id/fil.jpg")
    // URL-en ser typisk ut som: .../homework-uploads/user-id/fil.jpg
    const urlParts = assignment.submission_url.split('homework-uploads/');
    if (urlParts.length < 2) return;
    const storagePath = urlParts[1];

    // Optimistisk fjerning i state
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, submission_url: undefined, is_completed: false } : a));

    try {
      // 1. Slett fra Storage
      const { error: storageError } = await supabase.storage
        .from('homework-uploads')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // 2. Fjern lenken fra databasen og sett is_completed til false
      const { error: dbError } = await supabase
        .from('assignments')
        .update({ submission_url: null, is_completed: false, status: 'Ikke sendt' })
        .eq('id', id)
        .eq('student_id', studentId);

      if (dbError) throw dbError;

      // 3. Slett også fra submissions-tabellen hvis den finnes
      await supabase
        .from('submissions')
        .delete()
        .eq('assignment_id', id)
        .eq('student_id', studentId);

      console.log("Innleveringen er slettet! 🗑️");
    } catch (error) {
      console.error('Feil ved fjerning av innlevering:', error);
      // Rull tilbake ved feil
      fetchData();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'tasks':
        return (
          <div className="space-y-8 p-4 md:p-8">
            <JoinClassSection meet_link={meetLink} video_url={videoUrl} />
            <section>
              <h1 className="text-2xl font-bold mb-6">Mine Oppgaver ✍️</h1>
              <StudentTaskList 
                assignments={[...assignments].sort((a, b) => {
                  if (a.is_completed && !b.is_completed) return 1;
                  if (!a.is_completed && b.is_completed) return -1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })}
                studentId={studentId}
                setAssignments={setAssignments}
                onOpenVideo={(url) => window.open(url, '_blank')}
                onDelete={setAssignmentToDelete}
                onUploadSuccess={handleUploadSuccess}
              />
            </section>
          </div>
        );
      case 'calendar':
        return (
          <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm m-4 md:m-8">
            <h2 className="text-xl font-bold mb-4">Din Timeplan</h2>
            <MyCalendar 
              events={assignments
                .filter(a => a.due_date)
                .map(a => ({
                  date: a.due_date,
                  title: a.title,
                  type: (a.is_task ? 'deadline' : 'booking') as 'deadline' | 'booking'
                }))
              } 
            />
          </section>
        );
      case 'uploads':
        return (
          <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6">Mine Innleveringer 🎓</h1>
            <MyUploadsManager 
              assignments={assignments} 
              onRemoveSubmission={handleRemoveSubmission} 
            />
          </div>
        );
      case 'messages':
        return (
          <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6">Meldinger 💬</h1>
            <div className="bg-white p-12 rounded-2xl border border-blue-100 shadow-sm text-center">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-gray-500">Kommer snart! Her vil du kunne chatte direkte med læreren din.</p>
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6">Ressurser 📚</h1>
            <div className="bg-white p-12 rounded-2xl border border-blue-100 shadow-sm text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-500">Her vil læreren din dele nyttige lenker og dokumenter.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      <StudentSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      <div className="flex-grow pb-10">
        <main className="max-w-4xl mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Custom Modal for sletting */}
      {assignmentToDelete && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div style={{ 
            backgroundColor: 'white', padding: '24px', borderRadius: '8px', 
            maxWidth: '400px', width: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Bekreft sletting</h3>
            <p style={{ color: '#334155', marginBottom: '20px' }}>Er du sikker på at du vil fjerne denne oppgaven?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setAssignmentToDelete(null)} 
                style={{ 
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', 
                  backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontWeight: 500 
                }}
              >
                Avbryt
              </button>
              <button 
                onClick={handleDeleteAssignment} 
                style={{ 
                  padding: '8px 16px', borderRadius: '6px', border: 'none', 
                  backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 'bold' 
                }}
              >
                Ja, fjern oppgave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
