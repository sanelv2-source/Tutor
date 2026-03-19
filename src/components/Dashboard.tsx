import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  CreditCard, 
  MessageSquare, 
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Send,
  Smile,
  Meh,
  Frown,
  Link as LinkIcon,
  FileText,
  BookOpen,
  Video,
  Trash2,
  X
} from 'lucide-react';
import Logo from './Logo';
import InviteStudent from './InviteStudent';
import CalendarModal from './CalendarModal';
import PaymentWall from './PaymentWall';
import WelcomeGuide from './WelcomeGuide';
import { supabase } from '../supabaseClient';

export default function Dashboard({ onNavigate, user, onLogout }: { onNavigate: (page: string) => void, user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('rapporter');
  const [reportStatus, setReportStatus] = useState<'great' | 'good' | 'needs_focus'>('great');
  const [masteryLevel, setMasteryLevel] = useState(80);
  const [isSendingVipps, setIsSendingVipps] = useState<number | null>(null);
  
  const [profile, setProfile] = useState<{ name?: string, trial_ends_at: string, subscription_status: string, meet_link?: string } | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [meetLinkInput, setMeetLinkInput] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);

  const saveMeetLink = async (link: string) => {
    if (!authUserId) return;
    setIsSavingLink(true);
    const { error } = await supabase
      .from('profiles')
      .update({ meet_link: link })
      .eq('id', authUserId);
    setIsSavingLink(false);
    if (error) {
      console.error("Feil ved lagring av lenke:", error);
      showToast("Feil ved lagring av lenke");
    } else {
      showToast("Videolenke lagret!");
      setProfile(prev => prev ? { ...prev, meet_link: link } : null);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setAuthUserId(authUser.id);
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, trial_ends_at, subscription_status, meet_link')
            .eq('id', authUser.id)
            .single();
            
          if (data) {
            setProfile({
              name: data.full_name,
              trial_ends_at: data.trial_ends_at,
              subscription_status: data.subscription_status,
              meet_link: data.meet_link
            });
            if (data.meet_link) {
              setMeetLinkInput(data.meet_link);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchProfile();
  }, []);

  const isTrialExpired = profile && 
    profile.subscription_status !== 'active' && 
    new Date(profile.trial_ends_at) < new Date();
    
  const needsOnboarding = profile && !profile.name;

  // Mock data fjernet, starter med tomme lister
  const [students, setStudents] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'PDF' });
  const [resourceSource, setResourceSource] = useState<'link' | 'file'>('file');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const fetchStudents = React.useCallback(async () => {
    if (!authUserId) return;
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('tutor_id', authUserId);
      
    if (data) {
      setStudents(data.map(s => ({
        id: s.id,
        name: s.full_name || s.name,
        subject: s.subject || 'Fag: Ikke oppgitt',
        parent: s.parent_email ? 'Oppgitt' : 'Ikke oppgitt',
        phone: 'Ikke oppgitt',
        parentEmail: s.parent_email || s.email
      })));
    }
  }, [authUserId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    setDeleteConfirmModal({ isOpen: true, studentId, studentName });
  };

  const confirmDeleteStudent = async () => {
    if (!deleteConfirmModal) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteConfirmModal.studentId);
        
      if (error) throw error;
      
      // Oppdater state umiddelbart for at eleven skal forsvinne fra skjermen
      setStudents(prev => prev.filter(s => s.id.toString() !== deleteConfirmModal.studentId.toString()));
      
      showToast(`${deleteConfirmModal.studentName} er slettet.`);
      // Vi kan fortsatt kalle fetchStudents for å sikre at alt er synkronisert, 
      // men UI-et oppdateres umiddelbart takket være linjen over.
      fetchStudents();
    } catch (err: any) {
      console.error('Feil ved sletting av elev:', err);
      showToast(`Kunne ikke slette elev: ${err.message}`);
    } finally {
      setDeleteConfirmModal(null);
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean, studentId: string, studentName: string } | null>(null);
  const [newItemData, setNewItemData] = useState({ name: '', detail: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  const [taskModal, setTaskModal] = useState<{ isOpen: boolean, studentId: string, studentName: string } | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isSendingTask, setIsSendingTask] = useState(false);

  const sendTaskToStudent = async (studentId: string) => {
    if (!authUserId) return;
    setIsSendingTask(true);
    
    try {
      const { error } = await supabase
        .from('assignments')
        .insert([
          { 
            tutor_id: authUserId, 
            student_id: studentId, 
            title: taskTitle,
            description: taskContent,
            due_date: taskDueDate || null
          }
        ]);
        
      if (error) throw error;
      
      showToast("Oppgave sendt!");
      setTaskModal(null);
      setTaskTitle('');
      setTaskContent('');
      setTaskDueDate('');
    } catch (err: any) {
      console.error("Feil ved sending av oppgave:", err);
      showToast("Kunne ikke sende oppgave: " + err.message);
    } finally {
      setIsSendingTask(false);
    }
  };
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [calendarModal, setCalendarModal] = useState<{ isOpen: boolean, title: string, mode: 'faste_tider' | 'ferie' } | null>(null);

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (needsOnboarding && authUserId) {
    return <WelcomeGuide userId={authUserId} onComplete={(name) => setProfile({ ...profile, name })} />;
  }

  if (isTrialExpired) {
    return <PaymentWall onUpgrade={() => onNavigate('payment')} />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddAction = () => {
    if (activeTab === 'rapporter') {
      showToast('Bruk skjemaet under for å opprette en ny rapport.');
      return;
    }
    if (activeTab === 'ressurser') {
      showToast('Bruk skjemaet "Legg til ny ressurs" for å legge til filer eller lenker.');
      return;
    }
    setShowAddModal(true);
    setNewItemData({ name: '', detail: '', email: '' });
  };

  const handleSaveNewItem = async () => {
    if (!newItemData.name) return;
    
    if (activeTab === 'oversikt') {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('students')
          .insert([
            { 
              full_name: newItemData.name,
              subject: newItemData.detail || 'Nytt fag',
              email: newItemData.email || '',
              tutor_id: authUserId,
              status: 'active'
            }
          ]);
          
        if (error) throw error;
        
        showToast(newItemData.email ? `Invitasjon sendt til ${newItemData.email}!` : 'Elev lagt til!');
        fetchStudents();
      } catch (err: any) {
        console.error('Feil ved lagring av elev:', err);
        showToast(`Kunne ikke legge til elev: ${err.message}`);
      } finally {
        setIsSaving(false);
        setShowAddModal(false);
        setNewItemData({ name: '', detail: '', email: '' });
      }
    } else if (activeTab === 'timeplan') {
      setSchedule([...schedule, {
        id: Date.now(),
        time: newItemData.detail || '12:00 - 13:00',
        student: newItemData.name,
        subject: 'Ny time',
        status: 'upcoming',
        amount: 500
      }]);
      setShowAddModal(false);
      setNewItemData({ name: '', detail: '', email: '' });
      showToast('Time lagret!');
    } else if (activeTab === 'betaling') {
      setInvoices([{
        id: Date.now(),
        student: newItemData.name,
        amount: parseInt(newItemData.detail) || 500,
        date: new Date().toLocaleDateString('no-NB', { day: '2-digit', month: 'short' }),
        status: 'pending',
        method: 'Faktura'
      }, ...invoices]);
      setShowAddModal(false);
      setNewItemData({ name: '', detail: '', email: '' });
      showToast('Faktura opprettet!');
    }
  };

  const handleSendVippsRequest = async (sessionId: number) => {
    setIsSendingVipps(sessionId);
    
    const session = schedule.find(s => s.id === sessionId);
    const student = students.find(s => s.name === session?.student);
    
    if (!session || !student) {
      setIsSendingVipps(null);
      return;
    }

    try {
      const response = await fetch('/api/payment/vipps-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherName: user?.name || 'Lærer',
          amount: session.amount,
          phone: student.phone,
          parentEmail: student.parentEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Kunne ikke sende Vipps-krav');
      }

      // Update session status to 'pending_payment'
      setSchedule(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: 'pending_payment' } : s
      ));

      // Add to invoices
      const newInvoice = {
        id: Date.now(),
        student: student.name,
        amount: session.amount,
        date: new Date().toLocaleDateString('no-NB', { day: '2-digit', month: 'short' }),
        status: 'pending',
        method: 'Vipps'
      };
      setInvoices(prev => [newInvoice, ...prev]);

    } catch (error) {
      console.error('Error sending Vipps request:', error);
      showToast('Det oppstod en feil ved sending av Vipps-krav.');
    } finally {
      setIsSendingVipps(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans pb-16 md:pb-0">
      
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-20">
        <Logo iconSize="w-6 h-6 text-base" textSize="text-lg" />
        <button onClick={onLogout} className="p-2 text-slate-500 hover:text-slate-900">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <Logo iconSize="w-8 h-8 text-lg" textSize="text-xl" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('oversikt')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'oversikt' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Users className="h-5 w-5" />
            Elevoversikt
          </button>
          <button 
            onClick={() => setActiveTab('timeplan')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'timeplan' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <CalendarIcon className="h-5 w-5" />
            Timeplan
          </button>
          <button 
            onClick={() => setActiveTab('betaling')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'betaling' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <CreditCard className="h-5 w-5" />
            Betalingsstatus
          </button>
          <button 
            onClick={() => setActiveTab('rapporter')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'rapporter' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <MessageSquare className="h-5 w-5" />
            Progresjonsrapporter
          </button>
          <button 
            onClick={() => setActiveTab('ressurser')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'ressurser' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <BookOpen className="h-5 w-5" />
            Ressurser
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logg ut
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-2 z-30 pb-safe">
        <button 
          onClick={() => setActiveTab('oversikt')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'oversikt' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium">Elever</span>
        </button>
        <button 
          onClick={() => setActiveTab('timeplan')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'timeplan' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <CalendarIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium">Timeplan</span>
        </button>
        <button 
          onClick={() => setActiveTab('betaling')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'betaling' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Betaling</span>
        </button>
        <button 
          onClick={() => setActiveTab('rapporter')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'rapporter' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium">Rapporter</span>
        </button>
        <button 
          onClick={() => setActiveTab('ressurser')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'ressurser' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-[10px] font-medium">Ressurser</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 capitalize">
              {activeTab === 'oversikt' ? 'Dine elever' : activeTab}
            </h1>
            <p className="text-slate-500 mt-1">Velkommen tilbake, {user?.name?.split(' ')[0] || 'lærer'}! Her er oversikten din for i dag.</p>
          </div>
          {activeTab !== 'oversikt' && (
            <button 
              onClick={handleAddAction}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'timeplan' && 'Ny time'}
              {activeTab === 'betaling' && 'Ny faktura'}
              {activeTab === 'rapporter' && 'Ny rapport'}
              {activeTab === 'ressurser' && 'Ny ressurs'}
            </button>
          )}
        </div>

        {/* Tab Content: Elevoversikt */}
        {activeTab === 'oversikt' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                Din faste videolenke (f.eks. Google Meet, Zoom)
              </h3>
              <p className="text-sm text-slate-500 mb-4">Denne lenken vil vises for elevene dine når de logger inn i elevportalen.</p>
              <div className="flex gap-3">
                <input 
                  type="url" 
                  value={meetLinkInput}
                  onChange={(e) => setMeetLinkInput(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={() => saveMeetLink(meetLinkInput)}
                  disabled={isSavingLink}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSavingLink ? 'Lagrer...' : 'Lagre lenke'}
                </button>
              </div>
            </div>

            <InviteStudent 
              tutorId={user?.id || ''} 
              onInviteSuccess={(email) => {
                fetchStudents();
                showToast(`Invitasjon sendt til ${email}!`);
              }}
            />
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Søk etter elev..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p>Du har ingen elever enda.</p>
                    <p className="text-sm mt-1">Bruk skjemaet over for å invitere din første elev!</p>
                  </div>
                ) : (
                  students.map((student) => (
                    <div key={student.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{student.name}</h3>
                          <p className="text-sm text-slate-500">{student.subject}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end text-sm text-slate-600 gap-2">
                        <div className="flex flex-col sm:items-end">
                          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400"/> Forelder: {student.parent}</span>
                          <span className="flex items-center gap-2 mt-1"><MessageSquare className="h-4 w-4 text-slate-400"/> {student.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <button 
                            onClick={() => setTaskModal({ isOpen: true, studentId: student.id.toString(), studentName: student.name })}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            Send oppgave
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Slett elev"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Timeplan */}
        {activeTab === 'timeplan' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
                  Dagens timer (I dag)
                  <span className="text-sm font-medium text-indigo-600 cursor-pointer">Se hele uken</span>
                </h2>
                <div className="space-y-4">
                  {schedule.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <CalendarIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p>Du har ingen timer i dag.</p>
                      <p className="text-sm mt-1">Bruk "Sett opp faste tider" for å legge til timer i kalenderen.</p>
                    </div>
                  ) : (
                    schedule.map((session) => (
                      <div key={session.id} className={`p-4 rounded-xl border-l-4 flex items-center justify-between ${session.status === 'completed' || session.status === 'pending_payment' ? 'bg-slate-50 border-slate-300 opacity-70' : 'bg-indigo-50 border-indigo-600'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.status === 'completed' || session.status === 'pending_payment' ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                            {session.status === 'completed' || session.status === 'pending_payment' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className={`font-bold ${session.status === 'completed' || session.status === 'pending_payment' ? 'text-slate-700' : 'text-indigo-900'}`}>{session.time}</p>
                            <p className="text-sm text-slate-600">{session.student} • {session.subject}</p>
                            {session.status === 'pending_payment' && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                                Venter på betaling
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.status === 'upcoming' && (
                            <button 
                              onClick={() => showToast('Funksjon for å flytte timer kommer snart!')}
                              className="text-sm font-medium text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 bg-white transition-colors"
                            >
                              Flytt
                            </button>
                          )}
                          {session.status === 'completed' && (
                            <button 
                              onClick={() => handleSendVippsRequest(session.id)}
                              disabled={isSendingVipps === session.id}
                              className="text-sm font-medium text-white bg-[#ff5b24] hover:bg-[#e04a1a] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2"
                            >
                              {isSendingVipps === session.id ? 'Sender...' : 'Send Vipps-krav'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Hurtighandlinger</h2>
                <div className="space-y-3">
                  <button 
                    onClick={() => showToast('Google Kalender-integrasjon krever at du kobler til Google-kontoen din under Innstillinger. (Kommer snart)')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="font-medium text-slate-700">Synkroniser med Google Kalender</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                  <button 
                    onClick={() => {
                      setCalendarModal({
                        isOpen: true,
                        title: 'Sett opp faste tider',
                        mode: 'faste_tider'
                      });
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="font-medium text-slate-700">Sett opp faste tider</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/student/portal`;
                      navigator.clipboard.writeText(url);
                      showToast('Lenke til elevportal kopiert til utklippstavlen!');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-indigo-600" />
                      Kopier lenke til elevportal
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                  <button 
                    onClick={() => {
                      setCalendarModal({
                        isOpen: true,
                        title: 'Legg inn ferie/fravær',
                        mode: 'ferie'
                      });
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="font-medium text-slate-700">Legg inn ferie/fravær</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Betalingsstatus */}
        {activeTab === 'betaling' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-1">Inntjent denne måneden</p>
                <h3 className="text-3xl font-bold text-slate-900">kr 8 450</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-1">Utestående</p>
                <h3 className="text-3xl font-bold text-amber-600">kr 1 200</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-1">Betalt via Vipps</p>
                <h3 className="text-3xl font-bold text-emerald-600">85%</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Nylige fakturaer</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Elev</th>
                      <th className="px-6 py-4">Dato</th>
                      <th className="px-6 py-4">Beløp</th>
                      <th className="px-6 py-4">Metode</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Handling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <CreditCard className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                          <p>Ingen fakturaer å vise enda.</p>
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{inv.student}</td>
                          <td className="px-6 py-4 text-slate-500">{inv.date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{inv.amount} kr</td>
                          <td className="px-6 py-4 text-slate-500">{inv.method}</td>
                          <td className="px-6 py-4">
                            {inv.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Betalt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                <AlertCircle className="h-3.5 w-3.5" /> Venter
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {inv.status === 'pending' ? (
                              <button 
                                onClick={() => showToast(`Purring sendt til ${inv.student}`)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                Send purring
                              </button>
                            ) : (
                              <button 
                                onClick={() => showToast(`Kvittering lastet ned for ${inv.student}`)}
                                className="text-slate-400 hover:text-slate-600 font-medium"
                              >
                                Kvittering
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Progresjonsrapporter */}
        {activeTab === 'rapporter' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* Write Report */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Status på timen</h2>
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Velg elev</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                      {students.length === 0 ? (
                        <option value="">Ingen elever lagt til enda</option>
                      ) : (
                        <>
                          <option value="">Velg elev...</option>
                          {students.map(student => (
                            <option key={student.id} value={student.id}>{student.name} ({student.subject})</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Status / Smilefjes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dagens innsats</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        type="button"
                        onClick={() => setReportStatus('great')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${reportStatus === 'great' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200 text-slate-500'}`}
                      >
                        <Smile className="h-8 w-8 mb-1" />
                        <span className="text-xs font-bold">Veldig bra</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setReportStatus('good')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${reportStatus === 'good' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-200 text-slate-500'}`}
                      >
                        <Meh className="h-8 w-8 mb-1" />
                        <span className="text-xs font-bold">Bra</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setReportStatus('needs_focus')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${reportStatus === 'needs_focus' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-red-200 text-slate-500'}`}
                      >
                        <Frown className="h-8 w-8 mb-1" />
                        <span className="text-xs font-bold">Trenger fokus</span>
                      </button>
                    </div>
                  </div>

                  {/* Mestringshjul Input */}
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-sm font-medium text-slate-700">Mestring av nåværende emne</label>
                      <span className="text-sm font-bold text-indigo-600">{masteryLevel}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={masteryLevel}
                      onChange={(e) => setMasteryLevel(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <p className="text-xs text-slate-500 mt-1">F.eks. "Brøk: 80% mestret"</p>
                  </div>

                  {/* Lærerens kommentar */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hva var bra, og hva skal vi jobbe med?</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      placeholder="Eleven knakk koden på algebra i dag! Til neste gang må vi øve mer på..."
                    ></textarea>
                  </div>

                  {/* Lekser */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lekser til neste gang (Valgfritt)</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Gjør oppgave 3.14 til 3.20"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <LinkIcon className="h-4 w-4" />
                      Sendes som Magic Link
                    </div>
                    <button 
                      type="button" 
                      onClick={() => showToast('Rapport sendt! Eleven vil motta en SMS med lenke.')}
                      className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send rapport
                    </button>
                  </div>
                </form>
              </div>

              {/* Preview of Parent View */}
              <div className="flex flex-col gap-6">
                <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
                  
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Slik ser eleven det</h3>
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs font-medium text-slate-300">Magic Link</span>
                  </div>

                  <div className="bg-white text-slate-900 rounded-xl p-5 relative z-10">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="font-bold text-lg">
                          {selectedStudentId 
                            ? students.find(s => s.id === selectedStudentId)?.name || 'Elevens navn'
                            : 'Elevens navn'}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {selectedStudentId 
                            ? students.find(s => s.id === selectedStudentId)?.subject || 'Fag'
                            : 'Fag'} • {new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Smile className="h-7 w-7 text-emerald-600" />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mb-6">
                      {/* CSS Circular Progress (Mestringshjul) */}
                      <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <path
                            className="text-slate-100"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="text-indigo-600"
                            strokeDasharray={`${masteryLevel}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-sm font-bold">{masteryLevel}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Emne</p>
                        <p className="font-medium text-slate-900">Algebra & Ligninger</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lærerens kommentar</p>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {selectedStudentId 
                            ? students.find(s => s.id === selectedStudentId)?.name.split(' ')[0] || 'Eleven'
                            : 'Eleven'} knakk koden på algebra i dag! Til neste gang må vi øve mer på å sette prøve på svaret.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lekser</p>
                        <div className="text-sm text-slate-700 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                          Gjør oppgave 3.14 til 3.20
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automation Info */}
                <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Automatisering (Base44)
                  </h4>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    Når du trykker send, lagres dataene i databasen. En trigger sender automatisk en SMS med en unik, sikker "Magic Link" til eleven eller forelderen. På sikt kan dette også generere en PDF.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Content: Ressurser */}
        {activeTab === 'ressurser' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Ditt bibliotek</h3>
                  <span className="text-xs font-medium text-slate-500">{resources.length} filer delt av lærer</span>
                </div>
                
                <ul className="divide-y divide-slate-100">
                  {resources.length === 0 ? (
                    <li className="p-8 text-center text-slate-500">
                      <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p>Ingen ressurser lagt til enda.</p>
                      <p className="text-sm mt-1">Bruk skjemaet til høyre for å dele filer eller lenker.</p>
                    </li>
                  ) : (
                    resources.map((res) => {
                      const iconBg = res.color === 'red' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500';
                      const btnClass = res.color === 'red' 
                        ? 'text-red-600 border-red-200 hover:bg-red-50' 
                        : 'text-blue-600 border-blue-200 hover:bg-blue-50';
                        
                      return (
                        <li key={res.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 ${iconBg} rounded-lg text-xl`}>
                              {res.icon}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{res.title}</p>
                              <p className="text-xs text-slate-500">{res.date}</p>
                            </div>
                          </div>
                          <a href={res.url} target="_blank" rel="noopener noreferrer" className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${btnClass}`}>
                            {res.type === 'Video' ? 'Se video' : 'Åpne'}
                          </a>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Legg til ny ressurs</h2>
                <form 
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newResource.title) return;
                    if (resourceSource === 'link' && !newResource.url) return;
                    
                    const isVideo = newResource.url.includes('youtube') || newResource.url.includes('vimeo');
                    const newRes = {
                      id: Date.now(),
                      title: newResource.title,
                      type: resourceSource === 'file' ? 'PDF' : (isVideo ? 'Video' : 'Lenke'),
                      url: resourceSource === 'file' ? '#' : newResource.url,
                      date: 'Akkurat nå',
                      icon: resourceSource === 'file' ? '📄' : (isVideo ? '🎥' : '🔗'),
                      color: resourceSource === 'file' ? 'red' : 'blue'
                    };
                    
                    setResources([newRes, ...resources]);
                    setNewResource({ title: '', url: '', type: 'PDF' });
                    showToast('Ressurs lagt til!');
                  }}
                >
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="sourceType" 
                        checked={resourceSource === 'file'} 
                        onChange={() => setResourceSource('file')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Last opp fil
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="sourceType" 
                        checked={resourceSource === 'link'} 
                        onChange={() => setResourceSource('link')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Nettlenke
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tittel</label>
                    <input 
                      type="text"
                      value={newResource.title || ''}
                      onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={resourceSource === 'file' ? "F.eks. Gitar-skalaer_uke4.pdf" : "F.eks. Øvingsvideo"}
                      required
                    />
                  </div>

                  {resourceSource === 'link' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">URL (Lenke)</label>
                      <input 
                        type="url"
                        value={newResource.url || ''}
                        onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://..."
                        required={resourceSource === 'link'}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Velg fil</label>
                      <input 
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && !newResource.title) {
                            setNewResource({...newResource, title: file.name});
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        required={resourceSource === 'file'}
                      />
                    </div>
                  )}

                  <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors mt-2">
                    Legg til ressurs
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Task Modal */}
      {taskModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Send oppgave til {taskModal.studentName}</h3>
              <button onClick={() => setTaskModal(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tittel på oppgaven</label>
                <input 
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="f.eks. Matteinnlevering uke 12"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivelse / Instruksjoner</label>
                <textarea 
                  value={taskContent}
                  onChange={(e) => setTaskContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                  placeholder="Skriv inn instruksjoner her..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frist</label>
                <input 
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setTaskModal(null)}
                  className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={() => sendTaskToStudent(taskModal.studentId)}
                  disabled={!taskTitle.trim() || !taskContent.trim() || !taskDueDate || isSendingTask}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSendingTask ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send oppgave
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Slett elev
              </h3>
              <button 
                onClick={() => setDeleteConfirmModal(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                Er du sikker på at du vil slette eleven <strong>{deleteConfirmModal.studentName}</strong>? Denne handlingen kan ikke angres.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={confirmDeleteStudent}
                  className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
                >
                  Ja, slett elev
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === 'oversikt' && 'Legg til ny elev'}
                {activeTab === 'timeplan' && 'Legg til ny time'}
                {activeTab === 'betaling' && 'Opprett ny faktura'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {activeTab === 'oversikt' && 'Elevens navn'}
                  {activeTab === 'timeplan' && 'Elevens navn'}
                  {activeTab === 'betaling' && 'Elevens navn'}
                </label>
                <input 
                  type="text" 
                  value={newItemData.name || ''}
                  onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="F.eks. Ola Nordmann"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {activeTab === 'oversikt' && 'Fag / Emne'}
                  {activeTab === 'timeplan' && 'Tidspunkt'}
                  {activeTab === 'betaling' && 'Beløp (kr)'}
                </label>
                <input 
                  type="text" 
                  value={newItemData.detail || ''}
                  onChange={(e) => setNewItemData({...newItemData, detail: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={
                    activeTab === 'oversikt' ? 'F.eks. Matte R1' : 
                    activeTab === 'timeplan' ? 'F.eks. 14:00 - 15:00' : 
                    'F.eks. 500'
                  }
                />
              </div>
              {activeTab === 'oversikt' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    E-post (for invitasjon)
                  </label>
                  <input 
                    type="email" 
                    value={newItemData.email || ''}
                    onChange={(e) => setNewItemData({...newItemData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="F.eks. ola@eksempel.no"
                  />
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Avbryt
              </button>
              <button 
                onClick={handleSaveNewItem}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Lagrer...' : 'Lagre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {calendarModal && (
        <CalendarModal
          isOpen={calendarModal.isOpen}
          mode={calendarModal.mode}
          title={calendarModal.title}
          onClose={() => setCalendarModal(null)}
          onSave={(dates, time) => {
            if (calendarModal.mode === 'faste_tider') {
              showToast(`Faste tider lagret for ${dates.length} dager kl ${time}!`);
            } else {
              showToast(`Ferie/fravær registrert for ${dates.length} dager. Elevene får beskjed.`);
            }
            setCalendarModal(null);
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
