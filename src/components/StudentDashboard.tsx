import React, { useState, useEffect } from 'react';
import { LogOut, Video, Calendar, CheckCircle, Clock, MessageSquare, ExternalLink, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import MyCalendar from './MyCalendar';
import StudentSidebar from './StudentSidebar';
import { ChatList } from './ChatList';
import { linkStudentProfileByEmail } from '../utils/studentLinking';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: string;
  student_id: string;
  tutor_id: string;
  attachment_path?: string | null;
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError && userError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }
      const authUserId = user?.id;
      if (!authUserId) throw new Error('Ikke logget inn');

      // Load the student row to ensure we have the correct student.id
      const { data: studentRow, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', authUserId)
        .single();
        
      if (studentError || !studentRow) {
        throw new Error('Fant ikke elevprofilen din.');
      }
      
      const actualStudentId = studentRow.id;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}-${Date.now()}.${fileExt}`;
      const filePath = `${authUserId}/submissions/${fileName}`;

      console.log('AUTH USER:', user);
      console.log('BUCKET NAME:', 'submissions');
      console.log('FILE PATH:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file, { upsert: false });
        
      console.error('UPLOAD ERROR:', uploadError);

      if (uploadError) {
        throw new Error(`Upload feilet: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from('submissions').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('assignments').update({ 
        status: 'submitted'
      }).eq('id', taskId);

      if (dbError) {
        console.error("DB error:", dbError);
        // Don't throw here, we might still be able to insert into submissions
      }

      if (actualStudentId && tutorId) {
        const { error: subError } = await supabase.from('submissions').insert({
          student_id: actualStudentId,
          tutor_id: tutorId,
          file_url: data.publicUrl,
          answer_text: '',
          status: 'pending',
          assignment_id: taskId
        });
        if (subError) {
          console.error("Submission insert error:", subError);
          throw new Error(`Klarte ikke lagre innleveringen: ${subError.message}`);
        }
      } else {
        throw new Error('Mangler elev- eller lærer-ID for å levere.');
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
  const [resources, setResources] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      await linkStudentProfileByEmail();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget inn');
      console.log('Auth user id:', user.id);

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, email, tutor_id')
        .eq('profile_id', user.id)
        .single();

      console.log('Loaded student row:', student);

      if (studentError || !student) {
        throw new Error('Fant ikke elevkobling.');
      }

      setStudentId(student.id);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          status,
          student_id,
          tutor_id,
          attachment_path,
          profiles!assignments_tutor_id_fkey (
            full_name
          )
        `)
        .eq('student_id', student.id);

      console.log('Assignments query result:', assignmentsData);
      console.log('Assignments query error:', assignmentsError);

      if (assignmentsData) {
        const sortedAssignments = (assignmentsData as any[]).sort((a, b) => {
          // Completed assignments at the bottom
          const aCompleted = a.status === 'submitted' || a.status === 'approved';
          const bCompleted = b.status === 'submitted' || b.status === 'approved';
          if (aCompleted && !bCompleted) return 1;
          if (!aCompleted && bCompleted) return -1;
          
          // Sort by due_date ascending (closest first)
          const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
          const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
          return dateA - dateB;
        });
        setAssignments(sortedAssignments);
      } else {
        setAssignments([]);
      }
      
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select(`
          *,
          resource_assignments!inner(student_id)
        `)
        .eq('resource_assignments.student_id', student.id)
        .order('created_at', { ascending: false });
        
      if (resourcesData) {
        setResources(resourcesData);
      } else {
        setResources([]);
      }

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          lesson_date,
          start_time,
          duration_minutes,
          is_recurring,
          student_name,
          tutor:profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('student_id', student.id)
        .order('lesson_date', { ascending: true });

      if (lessonsError) throw lessonsError;
      
      if (lessonsData) {
        setLessons(lessonsData);
      } else {
        setLessons([]);
      }

      const { data: vacationsData, error: vacationsError } = await supabase
        .from('tutor_vacation')
        .select(`
          id, 
          tutor_id, 
          vacation_date, 
          description,
          profiles!tutor_vacation_tutor_id_fkey(full_name)
        `)
        .eq('tutor_id', student.tutor_id);

      console.log('Student vacations fetch result:', vacationsData);
      console.log('Student vacations fetch error:', vacationsError);

      if (vacationsData) {
        setVacations(vacationsData);
      } else {
        setVacations([]);
      }
      
      const { data: tutorProfile } = await supabase
        .from('profiles')
        .select('meet_link')
        .eq('id', student.tutor_id)
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

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "Passordene er ikke like", type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: "Passordet må være minst 6 tegn", type: 'error' });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage({ text: "Passordet ble oppdatert!", type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Feil ved oppdatering av passord:", error);
      setPasswordMessage({ text: "Kunne ikke oppdatere passord: " + error.message, type: 'error' });
    } finally {
      setSavingPassword(false);
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
    setAssignments(prev => prev.map(a => a.id === taskId ? { ...a, status: 'submitted' } : a));
  };

  const renderContent = () => {
    if (activeTab === 'tasks') {
      return (
        <div className="p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dine oppgaver</h1>
          </div>
          
          {meetLink && (
            <div className="bg-blue-50 border border-blue-100 p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-blue-900 font-bold text-lg">Videoundervisning</h3>
                <p className="text-blue-700 text-sm">Bli med i timen din her.</p>
              </div>
              <a 
                href={meetLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Video className="w-5 h-5" />
                Bli med
              </a>
            </div>
          )}

          <div className="space-y-8">
            {assignments.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-500">Du har ingen oppgaver ennå. Ta det med ro!</p>
              </div>
            )}

            {assignments.filter(a => a.status !== 'submitted' && a.status !== 'approved').length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Kommende oppgaver
                </h3>
                {assignments.filter(a => a.status !== 'submitted' && a.status !== 'approved').map(assignment => (
                  <div key={assignment.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="text-lg font-bold text-gray-900 w-full sm:w-auto">{assignment.title}</h4>
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                          {assignment.status || 'Ny oppgave'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setAssignmentToDelete(assignment.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium self-end sm:self-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sm:hidden">Fjern</span>
                        <span className="hidden sm:inline">Fjern</span>
                      </button>
                    </div>
                    <p className="text-gray-600 mb-4 whitespace-pre-wrap">{assignment.description}</p>
                    
                    {assignment.attachment_path && (
                      <div className="mb-4">
                        <a 
                          href={supabase.storage.from('resources').getPublicUrl(assignment.attachment_path).data.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          Åpne vedlegg
                        </a>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">Sendt av: {assignment.profiles?.full_name || 'Lærer'}</span>
                      <div className="flex gap-6">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Frist: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('no-NO') : 'Ingen frist'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <SubmitAssignment 
                        taskId={assignment.id} 
                        tutorId={assignment.tutor_id}
                        studentId={studentId || undefined}
                        onComplete={(url) => handleAssignmentComplete(assignment.id, url)} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assignments.filter(a => a.status === 'submitted' || a.status === 'approved').length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Fullførte oppgaver
                </h3>
                {assignments.filter(a => a.status === 'submitted' || a.status === 'approved').map(assignment => (
                  <div key={assignment.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow opacity-80">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="text-lg font-bold text-gray-900 w-full sm:w-auto">{assignment.title}</h4>
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Fullført
                        </span>
                      </div>
                      <button 
                        onClick={() => setAssignmentToDelete(assignment.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium self-end sm:self-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sm:hidden">Fjern</span>
                        <span className="hidden sm:inline">Fjern</span>
                      </button>
                    </div>
                    <p className="text-gray-600 mb-4 whitespace-pre-wrap">{assignment.description}</p>
                    
                    {assignment.attachment_path && (
                      <div className="mb-4">
                        <a 
                          href={supabase.storage.from('resources').getPublicUrl(assignment.attachment_path).data.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          Åpne vedlegg
                        </a>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">Sendt av: {assignment.profiles?.full_name || 'Lærer'}</span>
                      <div className="flex gap-6">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Frist: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('no-NO') : 'Ingen frist'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    } else if (activeTab === 'calendar') {
      const assignmentEvents = assignments
        .filter(a => a.due_date)
        .map(a => ({
          title: a.title,
          date: a.due_date as string,
          type: 'deadline'
        }));
      const lessonEvents = lessons.map(l => {
        const tutorName = Array.isArray(l.tutor) ? l.tutor[0]?.full_name : l.tutor?.full_name;
        return {
          title: `Time med ${tutorName || 'lærer'}`,
          date: l.lesson_date,
          type: 'lesson',
          start_time: l.start_time,
          duration_minutes: l.duration_minutes
        };
      });
      const vacationEvents = vacations.map(v => ({
        title: `${v.profiles?.full_name || 'Lærer'} har fri`,
        date: v.vacation_date,
        type: 'vacation',
        description: v.description,
        tutor_name: v.profiles?.full_name || 'Lærer'
      }));
      const calendarEvents = [...assignmentEvents, ...lessonEvents, ...vacationEvents];
      return (
        <div className="p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Timeplan</h1>
          <MyCalendar events={calendarEvents} />
        </div>
      );
    } else if (activeTab === 'settings') {
      return (
        <div className="p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Innstillinger</h1>
          <div className="bg-white p-8 rounded-2xl border border-gray-100 max-w-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Endre passord</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nytt passord</label>
                <input 
                  type="password"
                  className="w-full p-3 border border-slate-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minst 6 tegn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Bekreft nytt passord</label>
                <input 
                  type="password"
                  className="w-full p-3 border border-slate-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Gjenta nytt passord"
                />
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {passwordMessage.text}
                </div>
              )}

              <button 
                onClick={handlePasswordUpdate}
                disabled={savingPassword || !newPassword || !confirmPassword}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-400 transition-colors mt-4"
              >
                {savingPassword ? 'Oppdaterer...' : 'Oppdater passord'}
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="p-4 sm:p-8">
          {activeTab === 'messages' ? (
            <ChatList />
          ) : activeTab === 'resources' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Ressurser</h1>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {resources.length === 0 ? (
                    <li className="p-12 text-center text-gray-500">
                      <p>Ingen ressurser er delt med deg enda.</p>
                    </li>
                  ) : (
                    resources.map((res) => {
                      const isFile = res.type === 'file';
                      const isVideo = !isFile && res.url && (res.url.includes('youtube') || res.url.includes('vimeo'));
                      const iconBg = isFile ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500';
                      const btnClass = isFile 
                        ? 'text-red-600 border-red-200 hover:bg-red-50' 
                        : 'text-blue-600 border-blue-200 hover:bg-blue-50';
                      const icon = isFile ? '📄' : (isVideo ? '🎥' : '🔗');
                      const dateStr = new Date(res.created_at).toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
                      
                      const fileUrl = isFile && res.file_path 
                        ? supabase.storage.from('resources').getPublicUrl(res.file_path).data.publicUrl 
                        : res.url;
                        
                      return (
                        <li key={res.id} className="p-6 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 ${iconBg} rounded-xl text-2xl shrink-0`}>
                              {icon}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-slate-900">{res.title}</p>
                              <p className="text-sm text-slate-500 mt-1">Delt: {dateStr}</p>
                            </div>
                          </div>
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`px-5 py-2.5 text-sm font-bold border rounded-xl transition-colors text-center ${btnClass}`}>
                            {isVideo ? 'Se video' : 'Åpne ressurs'}
                          </a>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
                {activeTab === 'uploads' && 'Mine Innleveringer'}
              </h1>
              <div className="bg-white p-8 sm:p-12 rounded-2xl border border-gray-100 text-center">
                <p className="text-gray-500">Dette området er under utvikling.</p>
              </div>
            </>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col md:flex-row">
      <StudentSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="flex-grow pb-10 overflow-y-auto w-full">
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
