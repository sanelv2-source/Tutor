import React, { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { StudentInviteEmail, MagicLinkEmail, TeacherWelcomeEmail } from '../emails/EmailTemplates';

export default function EmailPreview({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [activeTab, setActiveTab] = useState<'student' | 'magic' | 'teacher'>('student');

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('landing')}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">E-postmaler (Forhåndsvisning)</h1>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('student')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Elev-invitasjon
          </button>
          <button 
            onClick={() => setActiveTab('magic')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'magic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Magic Link
          </button>
          <button 
            onClick={() => setActiveTab('teacher')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Lærer-velkomst
          </button>
        </div>
      </header>

      <main className="p-8 flex justify-center">
        <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-4 text-sm text-slate-600">
            <div className="font-medium">Fra:</div>
            <div>TutorFlyt &lt;hei@tutorflyt.no&gt;</div>
          </div>
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-4 text-sm text-slate-600">
            <div className="font-medium">Emne:</div>
            <div className="font-bold text-slate-900">
              {activeTab === 'student' && 'Velkommen til din nye læringsportal!'}
              {activeTab === 'magic' && 'Logg inn på TutorFlyt'}
              {activeTab === 'teacher' && 'Velkommen til TutorFlyt! 🎉'}
            </div>
          </div>
          <div className="p-0">
            {activeTab === 'student' && <StudentInviteEmail />}
            {activeTab === 'magic' && <MagicLinkEmail />}
            {activeTab === 'teacher' && <TeacherWelcomeEmail />}
          </div>
        </div>
      </main>
    </div>
  );
}
