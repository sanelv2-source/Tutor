import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, FileText, MessageCircle, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  link: string;
  isNext?: boolean;
}

interface Message {
  id: string;
  sender: 'tutor' | 'client';
  text: string;
  time: string;
}

export default function ClientPortal({ portalId }: { portalId: string }) {
  const [rescheduleStatus, setRescheduleStatus] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [now, setNow] = useState(new Date());

  // Update time every minute to check if we are within 5 minutes of the next lesson
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Mock data
  const nextLesson: Lesson = {
    id: '1',
    title: 'Matematikk 1T - Algebra',
    date: 'I dag',
    time: '15:00',
    duration: '60 min',
    link: 'https://meet.google.com/abc-defg-hij',
    isNext: true,
  };

  const upcomingLessons: Lesson[] = [
    {
      id: '2',
      title: 'Matematikk 1T - Funksjoner',
      date: '12. Mars 2026',
      time: '16:00',
      duration: '60 min',
      link: 'https://meet.google.com/abc-defg-hij',
    },
    {
      id: '3',
      title: 'Matematikk 1T - Geometri',
      date: '19. Mars 2026',
      time: '16:00',
      duration: '60 min',
      link: 'https://meet.google.com/abc-defg-hij',
    },
  ];

  const resources = [
    { id: 1, title: 'Gitar-skalaer_uke4.pdf', type: 'PDF', url: '#', date: 'Lagt til i går', icon: '📄', color: 'red' },
    { id: 2, title: 'Øvingsvideo - Akustisk', type: 'Video', url: '#', date: '8. okt', icon: '🎥', color: 'blue' }
  ];

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'tutor', text: 'Hei! Husk å se over oppgavesettet før timen i dag.', time: '09:00' },
    { id: '2', sender: 'client', text: 'Skal gjøre det! Sliter litt med oppgave 4.', time: '10:30' },
    { id: '3', sender: 'tutor', text: 'Ingen problem, vi går gjennom den sammen.', time: '10:45' },
  ]);

  // Check if we are within 5 minutes of the next lesson
  // For demo purposes, we'll just parse the time roughly, assuming today.
  const isWithin5Minutes = () => {
    // Mock logic: let's just make it active if it's "I dag" and time is close.
    // To make the demo look good, we'll just return true if the user wants to see it light up.
    // In a real app, you'd parse `nextLesson.time` and compare with `now`.
    return true; 
  };

  const handleReschedule = async (lessonId: string) => {
    setRescheduleStatus('Sender forespørsel...');
    try {
      const response = await fetch('/api/portal/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalId, lessonId }),
      });
      
      if (response.ok) {
        setRescheduleStatus('Forespørsel sendt!');
        setTimeout(() => setRescheduleStatus(null), 3000);
      } else {
        setRescheduleStatus('Kunne ikke sende forespørsel.');
        setTimeout(() => setRescheduleStatus(null), 3000);
      }
    } catch (e) {
      setRescheduleStatus('En feil oppstod.');
      setTimeout(() => setRescheduleStatus(null), 3000);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'client',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, newMessage]);
    setMessageText('');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-xl font-bold text-slate-900">TutorFlyt</span>
            <span className="ml-2 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">Elevportal</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-medium">
              E
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Next Lesson Card */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Neste time</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {nextLesson.date}
                      </span>
                      <span className="text-sm text-slate-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {nextLesson.time} ({nextLesson.duration})
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{nextLesson.title}</h3>
                    <p className="text-slate-500 mt-1">Lærer: Ola Nordmann</p>
                  </div>
                  
                  <div className="w-full sm:w-auto flex-shrink-0">
                    <a 
                      href={nextLesson.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full sm:w-auto flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isWithin5Minutes() 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 animate-pulse' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                      onClick={(e) => !isWithin5Minutes() && e.preventDefault()}
                    >
                      <Video className="w-5 h-5 mr-2" />
                      Bli med i timen
                    </a>
                    {isWithin5Minutes() && (
                      <p className="text-xs text-center text-indigo-600 mt-2 font-medium">Timen starter snart!</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Upcoming Bookings */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Kommende timer</h2>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {upcomingLessons.map((lesson) => (
                    <li key={lesson.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex flex-col items-center justify-center text-indigo-600 flex-shrink-0">
                          <span className="text-xs font-semibold uppercase">{lesson.date.split('.')[0]}</span>
                          <span className="text-sm font-bold">{lesson.date.split(' ')[1]?.substring(0,3) || 'Mar'}</span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-slate-900">{lesson.title}</h4>
                          <div className="flex items-center text-sm text-slate-500 mt-1 space-x-3">
                            <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {lesson.time}</span>
                            <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {lesson.duration}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => handleReschedule(lesson.id)}
                          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          Endre tid
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {rescheduleStatus && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-sm text-slate-600">
                    {rescheduleStatus === 'Forespørsel sendt!' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                    ) : rescheduleStatus.includes('feil') ? (
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    )}
                    {rescheduleStatus}
                  </div>
                )}
              </div>
            </section>

            {/* Resources / Ditt bibliotek */}
            <section>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Ditt bibliotek</h3>
                  <span className="text-xs font-medium text-slate-500">{resources.length} filer delt av lærer</span>
                </div>
                
                <ul className="divide-y divide-slate-100">
                  {resources.map((res) => {
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
                  })}
                </ul>
              </div>
            </section>

          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-1">
            
            {/* Chat Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px] sticky top-24">
              <div className="p-4 border-b border-slate-200 flex items-center space-x-3 bg-slate-50 rounded-t-2xl">
                <div className="relative">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                    ON
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ola Nordmann</h3>
                  <p className="text-xs text-slate-500">Din lærer • Pålogget</p>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.sender === 'client' 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${msg.sender === 'client' ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Skriv en melding..."
                    className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button 
                    type="submit"
                    disabled={!messageText.trim()}
                    className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
