import React, { useState, useEffect } from 'react';
import { LogOut, Video, Calendar, CheckCircle, Clock, MessageSquare, ExternalLink, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import MyCalendar from './MyCalendar';
import StudentSidebar from './StudentSidebar';
import { ChatList } from './ChatList';

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

const SubmitAssignment = ({ taskId, tutorId, studentId, onComplete }: { taskId: string, tutorId?: string, studentId?: string, onComplete: (url: string) => void }) => {
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const authUserId = user?.id;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}-${Date.now()}.${fileExt}`;
      const filePath = authUserId ? `${authUserId}/submissions/${fileName}` : `submissions/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('homework-uploads').upload(filePath, file);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload feilet: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from('homework-uploads').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('assignments').update({ 
        submission_url: data.publicUrl,
        is_completed: true,
        completed_at: new Date().toISOString()
      }).eq('id', taskId);

      if (dbError) {
        console.error("DB error:", dbError);
        // Don't throw here, we might still be able to insert into submissions
      }

      if (studentId && tutorId) {
        const { error: subError } = await supabase.from('submissions').insert({
          student_id: studentId,
          tutor_id: tutorId,
          answer_text: data.publicUrl,
          status: 'pending',
          assignment_id: taskId
        });
        if (subError) {
          console.error("DB error inserting submission:", subError);
          if (dbError) {
            throw new Error(`Database feilet: ${dbError.message || subError.message}`);
          }
        }
      } else if (dbError) {
        throw new Error(`Database feilet: ${dbError.message}`);
      }

      onComplete(data.publicUrl);
    } catch (error: any) {
      console.error("Full error:", error);
      setMessage({ text: error.message || 'Noe gikk galt ved opplasting.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2 p-3 border border-blue-100 bg-blue-50/30 rounded-xl">
      <input type="file" onChange={handleFileChange} className="block w-full text-[10px] text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-white file:text-blue-700 hover:file:bg-blue-50 cursor-pointer" />
      {file && (
        <button onClick={handleSubmit} disabled={uploading} className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-all shadow-sm">
          {uploading ? 'Sender inn... 🚀' : '🚀 Send inn svar'}
        </button>
      )}
      {message && <p className={`mt-2 text-xs ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{message.text}</p>}
    </div>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) return;

      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id, tutor_id, profile_id')
        .eq('email', user.email)
        .single();

      if (studentError || !studentRecord) {
        console.error("Fant ikke eleven i students-tabellen:", studentError);
        return;
      }
      
      if (!studentRecord.profile_id) {
        await supabase.from('students').update({ profile_id: user.id }).eq('id', studentRecord.id);
      }

      setStudentId(studentRecord.id);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*, profiles(full_name)')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });

      if (assignmentsData) {
        setAssignments(assignmentsData as any[]);
      } else {
        setAssignments([]);
      }
      
      const { data: tutorProfile } = await supabase
        .from('profiles')
        .select('meet_link')
        .eq('id', studentRecord.tutor_id)
        .single();

      if (tutorProfile?.meet_link) {
        setMeetLink(tutorProfile.meet_link);
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

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    const id = assignmentToDelete;
    
    setAssignmentToDelete(null);
    setAssignments(prev => prev.filter(a => a.id !== id));

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Feil ved sletting av oppgave:', error);
    }
  };

  const handleAssignmentComplete = (taskId: string, url: string) => {
    setAssignments(prev => prev.map(a => a.id === taskId ? { ...a, is_completed: true, submission_url: url } : a));
  };

  const renderContent = () => {
    if (activeTab === 'tasks') {
      return (
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dine oppgaver</h1>
          </div>
          
          {meetLink && (
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-blue-900 font-bold text-lg">Videoundervisning</h3>
                <p className="text-blue-700 text-sm">Bli med i timen din her.</p>
              </div>
              <a 
                href={meetLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Video className="w-5 h-5" />
                Bli med
              </a>
            </div>
          )}

          <div className="space-y-4">
            {assignments.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-500">Du har ingen oppgaver ennå. Ta det med ro!</p>
              </div>
            )}

            {assignments.map(assignment => (
              <div key={assignment.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-bold text-gray-900">{assignment.title}</h4>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                      {assignment.status || 'Ny oppgave'}
                    </span>
                    {assignment.is_completed && (
                      <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Fullført
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setAssignmentToDelete(assignment.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Fjern
                  </button>
                </div>
                <p className="text-gray-600 mb-4 whitespace-pre-wrap">{assignment.description}</p>
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Sendt av: {assignment.profiles?.full_name || 'Lærer'}</span>
                  <div className="flex gap-6">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Frist: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('no-NO') : 'Ingen frist'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Lagt til: {new Date(assignment.created_at).toLocaleDateString('no-NO')}</span>
                  </div>
                </div>

                {!assignment.is_completed && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <SubmitAssignment 
                      taskId={assignment.id} 
                      tutorId={assignment.tutor_id}
                      studentId={studentId || undefined}
                      onComplete={(url) => handleAssignmentComplete(assignment.id, url)} 
                    />
                  </div>
                )}
                
                {assignment.is_completed && assignment.submission_url && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a href={assignment.submission_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                      <ExternalLink className="w-4 h-4" /> Se innlevering
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (activeTab === 'calendar') {
      const calendarEvents = assignments.map(a => ({
        title: a.title,
        date: a.due_date || a.created_at,
        type: a.due_date ? 'deadline' : 'task'
      }));
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Timeplan</h1>
          <MyCalendar events={calendarEvents} />
        </div>
      );
    } else {
      return (
        <div className="p-8">
          {activeTab === 'messages' ? (
            <ChatList />
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-8">
                {activeTab === 'resources' && 'Ressurser'}
                {activeTab === 'uploads' && 'Mine Innleveringer'}
              </h1>
              <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
                <p className="text-gray-500">Dette området er under utvikling.</p>
              </div>
            </>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      <StudentSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="flex-grow pb-10 overflow-y-auto">
        <main className="max-w-4xl mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Custom Modal for sletting */}
      {assignmentToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Bekreft sletting</h3>
            <p className="text-slate-600 mb-6">Er du sikker på at du vil fjerne denne oppgaven?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setAssignmentToDelete(null)} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button 
                onClick={handleDeleteAssignment} 
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
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
