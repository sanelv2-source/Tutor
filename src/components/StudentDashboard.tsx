import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Video, Calendar, CheckCircle, Clock, MessageSquare, ExternalLink, Upload, Trash2, TrendingUp, BarChart, FileText, Link as LinkIcon, X, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '../supabaseClient'; // Pass på at banen til din supabase-klient er riktig
import { useNavigate } from 'react-router-dom';
import MyCalendar from './MyCalendar';
import StudentSidebar from './StudentSidebar';
import ChatList from './ChatList';

// ---------- SAFETY HELPERS ----------
const safeDate = (d?: string) => {
  const date = d ? new Date(d) : null;
  return date && !isNaN(date.getTime())
    ? date.toLocaleDateString('no-NO')
    : 'Ugyldig dato';
};

const safeTime = (d?: string) => {
  const t = d ? new Date(d).getTime() : 0;
  return isNaN(t) ? 0 : t;
};

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

interface Report {
  id: string;
  tutor_id: string;
  student_id: string;
  status: 'great' | 'good' | 'needs_focus';
  mastery_level: number;
  comment: string;
  homework?: string;
  created_at: string;
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

      // 2. Last opp til Supabase Storage (bruker 'homework-uploads' bucket)
      const { error: uploadError } = await supabase.storage
        .from('homework-uploads')
        .upload(filNavn, file);

      if (uploadError) throw uploadError;

      // 3. Hent den offentlige URL-en til filen
      const { data: urlData } = supabase.storage
        .from('homework-uploads')
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
    <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm mb-8 transition-all">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-blue-600">📡</span> Bli med i timen
      </h2>
      
      <div className={`rounded-xl p-8 text-center transition-all ${
        meet_link 
          ? 'bg-blue-50 border-2 border-blue-200' 
          : 'bg-gray-50/50 border-2 border-dashed border-gray-200'
      }`}>
        {meet_link ? (
          <div className="space-y-3">
            <p className="text-blue-900 font-bold">Læreren din er klar! 🚀</p>
            <a 
              href={meet_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-10 py-4 rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <Video className="h-5 w-5" />
              GÅ TIL NETTMØTE NÅ
            </a>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-gray-500 italic font-medium">Læreren din har ikke lagt til en møtelenke ennå.</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2 font-bold">Venter på oppstart...</p>
          </div>
        )}
      </div>

      {/* SEKSJON: VIDEO FRA LÆRER (vises bare hvis den finnes) */}
      {video_url && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Video-gjennomgang</p>
          <a 
            href={video_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black shadow-md transition-all hover:shadow-xl transform hover:-translate-y-1"
          >
            <span className="text-xl">▶</span> 
            SE VIDEO FRA LÆREREN
          </a>
        </div>
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
                  <span>Frist: {safeDate(task.due_date)}</span>
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

const ProgressionSection = ({ reports, assignments }: { reports: Report[], assignments: Assignment[] }) => {
  const uploads = assignments.filter(a => a.submission_url);
  
  // Calculate average mastery if reports exist
  const avgMastery = reports.length > 0 
    ? Math.round(reports.reduce((acc, r) => acc + r.mastery_level, 0) / reports.length)
    : 0;

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gjennomsnittlig mestring</p>
            <p className="text-2xl font-bold text-gray-900">{avgMastery}%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fullførte oppgaver</p>
            <p className="text-2xl font-bold text-gray-900">{assignments.filter(a => a.is_completed).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Innleveringer</p>
            <p className="text-2xl font-bold text-gray-900">{uploads.length}</p>
          </div>
        </div>
      </div>

      {/* Mastery Chart */}
      {reports.length > 1 && (
        <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Mestringsutvikling
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...reports].reverse().map(r => ({
                date: safeDate(r.created_at),
                mestring: typeof r.mastery_level === 'number' ? r.mastery_level : 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 700, marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mestring" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Reports History */}
      <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <BarChart className="h-5 w-5 text-blue-600" />
          Progresjonsrapporter
        </h2>
        
        <div className="space-y-6">
          {reports.length > 0 ? (
            reports.map((report) => (
              <div key={report.id} className="border-l-4 border-blue-500 bg-blue-50/30 p-5 rounded-r-xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {safeDate(report.created_at)}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        {report.status === 'great' && '😊'}
                        {report.status === 'good' && '😐'}
                        {report.status === 'needs_focus' && '😕'}
                      </div>
                      <span className="font-bold text-gray-800">
                        {report.status === 'great' && 'Veldig bra innsats!'}
                        {report.status === 'good' && 'God innsats'}
                        {report.status === 'needs_focus' && 'Trenger mer fokus'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mestring</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${report.mastery_level}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{report.mastery_level}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lærerens kommentar</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{report.comment}</p>
                  </div>
                  {report.homework && (
                    <div className="pt-3 border-t border-blue-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lekser til neste gang</p>
                      <p className="text-sm text-gray-700 italic">"{report.homework}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="text-4xl mb-4 opacity-20">📊</div>
              <p className="text-gray-400 italic">Ingen rapporter er sendt ennå. Din lærer vil sende rapporter her etter timene.</p>
            </div>
          )}
        </div>
      </section>

      {/* Previous Submissions (Historical) */}
      <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          Historiske innleveringer
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.length > 0 ? (
            uploads.map(a => (
              <div key={a.id} className="group border border-gray-100 rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition-all">
                <div className="aspect-video relative overflow-hidden">
                  {a.submission_url && a.submission_url.startsWith('http') && (
                    <img 
                      src={a.submission_url} 
                      alt={a.title} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                      onClick={() => window.open(a.submission_url, '_blank')}
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-xs text-gray-800 mb-1 truncate">{a.title}</h3>
                  <p className="text-[10px] text-gray-400">
                    {safeDate(a.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-gray-400 italic">Ingen innleveringer ennå.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const MyUploadsManager = ({ assignments, onRemoveSubmission }: { assignments: Assignment[], onRemoveSubmission: (id: string) => void }) => {
  const uploads = assignments.filter(a => a.submission_url);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {uploads.length > 0 ? (
        uploads.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <div className="aspect-video relative overflow-hidden bg-gray-100">
              {a.submission_url && a.submission_url.startsWith('http') && (
                <img 
                  src={a.submission_url} 
                  alt={a.title} 
                  className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                  onClick={() => window.open(a.submission_url, '_blank')}
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onRemoveSubmission(a.id)}
                  className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                  title="Fjern innlevering"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-1">{a.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {safeDate(a.created_at)}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  a.status === 'Godkjent' ? 'bg-green-100 text-green-700' : 
                  a.status === 'Ikke godkjent' ? 'bg-red-100 text-red-700' : 
                  'bg-amber-100 text-amber-700'
                }`}>
                  {a.status || 'Sendt'}
                </span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <Upload className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Du har ikke sendt inn noen oppgaver ennå.</p>
          <p className="text-xs text-gray-400 mt-1">Dine innleveringer vil vises her når du laster dem opp.</p>
        </div>
      )}
    </div>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);

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
      const normalized = (assignmentsData || []).map((a: any) => ({
        ...a,
        profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
      }));
      const sorted = [...normalized].sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at));
      setAssignments(sorted as Assignment[]);
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

    // 4. Hent progresjonsrapporter
    const { data: reportsData } = await supabase
      .from('reports')
      .select('*')
      .eq('student_id', studentRecord.id)
      .order('created_at', { ascending: false });

    if (reportsData) {
      const sorted = [...reportsData].sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at));
      setReports(sorted as Report[]);
    }

    // 5. Hent ressurser fra læreren
    const { data: resourcesData } = await supabase
      .from('resources')
      .select('*')
      .eq('tutor_id', studentRecord.tutor_id)
      .order('created_at', { ascending: false });

    if (resourcesData) {
      setResources(resourcesData.map(res => ({
        id: res.id,
        title: res.title,
        url: res.url,
        type: res.type,
        date: safeDate(res.created_at),
        icon: res.type === 'Video' ? '🎥' : (res.type === 'PDF' ? '📄' : '🔗'),
        color: res.type === 'PDF' ? 'red' : 'blue'
      })));
    }
  };

  useEffect(() => {
    fetchData();

    // Lytter på oppgaver
    const assignmentChannel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchData())
      // NYTT: Lytter på profiler for å oppdatere møtelenke i sanntid!
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentChannel);
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
          <div className="p-4 md:p-8 max-w-3xl mx-auto">
            {/* Her er den! Plassert trygt over oppgavene */}
            <JoinClassSection meet_link={meetLink} video_url={videoUrl} />
            
            <section className="mt-10">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mine oppgaver ✍️</h1>
                <span className="bg-gray-200 text-gray-700 text-[10px] font-black px-3 py-1 rounded-full">
                  {assignments.filter(a => !a.is_completed).length} GJENSTÅR
                </span>
              </div>

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
      case 'progression':
        return (
          <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6">Min Progresjon 📊</h1>
            <ProgressionSection reports={reports} assignments={assignments} />
          </div>
        );
      case 'calendar':
        return (
          <div className="p-4 md:p-8">
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
          </div>
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
      case 'messages':
        return (
          <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6">Meldinger 💬</h1>
            <ChatList />
          </div>
        );
      case 'resources':
        return (
          <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6">Ressurser 📚</h1>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-blue-50 bg-blue-50/30">
                <h3 className="text-lg font-bold text-gray-900">Delt av din lærer</h3>
                <p className="text-sm text-gray-500">Her finner du nyttige dokumenter, videoer og lenker.</p>
              </div>
              
              <ul className="divide-y divide-gray-100">
                {resources.length === 0 ? (
                  <li className="p-12 text-center text-gray-500">
                    <div className="text-4xl mb-4 opacity-20">📚</div>
                    <p>Ingen ressurser er delt ennå.</p>
                  </li>
                ) : (
                  resources.map((res) => (
                    <li key={res.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${res.color === 'red' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                          {res.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{res.title}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{res.date} • {res.type}</p>
                        </div>
                      </div>
                      <a 
                        href={res.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`px-4 py-2 text-xs font-bold border rounded-lg transition-colors ${
                          res.color === 'red' 
                            ? 'text-red-600 border-red-200 hover:bg-red-50' 
                            : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {res.type === 'Video' ? 'Se video' : 'Åpne'}
                      </a>
                    </li>
                  ))
                )}
              </ul>
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
