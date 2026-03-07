import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import Logo from './Logo';

export default function Dashboard({ onNavigate, user, onLogout }: { onNavigate: (page: string) => void, user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('rapporter');
  const [reportStatus, setReportStatus] = useState<'great' | 'good' | 'needs_focus'>('great');
  const [masteryLevel, setMasteryLevel] = useState(80);
  const [isSendingVipps, setIsSendingVipps] = useState<number | null>(null);

  // Mock data
  const [students, setStudents] = useState([
    { id: 1, name: 'Jonas Berg', subject: 'Matte R1', parent: 'Kari Berg', phone: '987 65 432', parentEmail: 'sanelv2@gmail.com' },
    { id: 2, name: 'Sofie Lien', subject: 'Fysikk 1', parent: 'Ola Lien', phone: '456 78 901', parentEmail: 'sanelv2@gmail.com' },
    { id: 3, name: 'Emil Hansen', subject: 'Gitar', parent: 'Ingrid Hansen', phone: '123 45 678', parentEmail: 'sanelv2@gmail.com' },
  ]);

  const [schedule, setSchedule] = useState([
    { id: 1, time: '14:00 - 15:00', student: 'Jonas Berg', subject: 'Matte R1', status: 'upcoming', amount: 450 },
    { id: 2, time: '16:30 - 17:30', student: 'Sofie Lien', subject: 'Fysikk 1', status: 'upcoming', amount: 500 },
    { id: 3, time: '18:00 - 19:00', student: 'Emil Hansen', subject: 'Gitar', status: 'completed', amount: 400 },
  ]);

  const [invoices, setInvoices] = useState([
    { id: 1, student: 'Jonas Berg', amount: 450, date: '12. Okt', status: 'paid', method: 'Vipps' },
    { id: 2, student: 'Sofie Lien', amount: 500, date: '10. Okt', status: 'pending', method: 'Faktura' },
    { id: 3, student: 'Emil Hansen', amount: 400, date: '05. Okt', status: 'paid', method: 'Vipps' },
  ]);

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
      alert('Det oppstod en feil ved sending av Vipps-krav.');
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
          <button className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'oversikt' && 'Legg til elev'}
            {activeTab === 'timeplan' && 'Ny time'}
            {activeTab === 'betaling' && 'Ny faktura'}
            {activeTab === 'rapporter' && 'Ny rapport'}
          </button>
        </div>

        {/* Tab Content: Elevoversikt */}
        {activeTab === 'oversikt' && (
          <div className="space-y-6">
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
                {students.map((student) => (
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
                    <div className="flex flex-col sm:items-end text-sm text-slate-600">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400"/> Forelder: {student.parent}</span>
                      <span className="flex items-center gap-2 mt-1"><MessageSquare className="h-4 w-4 text-slate-400"/> {student.phone}</span>
                    </div>
                  </div>
                ))}
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
                  {schedule.map((session) => (
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
                          <button className="text-sm font-medium text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 bg-white transition-colors">
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
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Hurtighandlinger</h2>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left">
                    <span className="font-medium text-slate-700">Synkroniser med Google Kalender</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left">
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
                    {invoices.map((inv) => (
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
                            <button className="text-indigo-600 hover:text-indigo-800 font-medium">Send purring</button>
                          ) : (
                            <button className="text-slate-400 hover:text-slate-600 font-medium">Kvittering</button>
                          )}
                        </td>
                      </tr>
                    ))}
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
                    <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option>Jonas Berg (Matte R1)</option>
                      <option>Sofie Lien (Fysikk 1)</option>
                      <option>Emil Hansen (Gitar)</option>
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
                      placeholder="Jonas knakk koden på algebra i dag! Til neste gang må vi øve mer på..."
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
                    <button type="button" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
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
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Slik ser foreldrene det</h3>
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs font-medium text-slate-300">Magic Link</span>
                  </div>

                  <div className="bg-white text-slate-900 rounded-xl p-5 relative z-10">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="font-bold text-lg">Jonas Berg</h4>
                        <p className="text-sm text-slate-500">Matte R1 • 14. Okt</p>
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
                          Jonas knakk koden på algebra i dag! Til neste gang må vi øve mer på å sette prøve på svaret.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lekser</p>
                        <p className="text-sm text-slate-700 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                          Gjør oppgave 3.14 til 3.20
                        </p>
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
                    Når du trykker send, lagres dataene i databasen. En trigger sender automatisk en SMS med en unik, sikker "Magic Link" til forelderen. På sikt kan dette også generere en PDF.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
