import React, { useState } from 'react';
import { Sparkles, ArrowRight, User, BookOpen, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Logo from './Logo';

interface WelcomeGuideProps {
  userId: string;
  onComplete: (name: string) => void;
}

export default function WelcomeGuide({ userId, onComplete }: WelcomeGuideProps) {
  const [step, setStep] = useState(1);
  const [tutorName, setTutorName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (step === 1) {
      if (!tutorName.trim()) return;
      setStep(2);
    } else {
      if (!studentName.trim()) return;
      setIsLoading(true);
      try {
        // Oppdaterer profil med navn
        await supabase
          .from('profiles')
          .update({ name: tutorName })
          .eq('id', userId);

        // Forsøker å legge til elev i students-tabellen
        await supabase
          .from('students')
          .insert([
            { 
              tutor_id: userId, 
              name: studentName, 
              subject: subject || 'Generelt', 
              email: email || null,
              parent_email: email || null 
            }
          ]);

        onComplete(tutorName);
      } catch (error) {
        console.error('Error saving onboarding data:', error);
        // Vi lar dem gå videre selv om elev-lagringen feiler (f.eks. hvis tabellen ikke finnes enda)
        onComplete(tutorName);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 font-sans relative">
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8">
        <Logo iconSize="w-10 h-10 text-2xl" textSize="text-xl" />
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
            {step === 1 ? <Sparkles className="w-8 h-8" /> : <User className="w-8 h-8" />}
          </div>
        </div>

        {step === 1 ? (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Velkommen til TutorFlyt!</h2>
            <p className="text-slate-600 text-center mb-8">
              La oss gjøre undervisningshverdagen din enklere. Hva heter du?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ditt fulle navn</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={tutorName}
                    onChange={(e) => setTutorName(e.target.value)}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                    placeholder="F.eks. Ola Nordmann"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!tutorName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                Neste steg
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Legg til din første elev</h2>
            <p className="text-slate-600 text-center mb-8">
              Du kan alltids endre dette eller legge til flere senere.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Elevens navn</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                    placeholder="F.eks. Kari Hansen"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fag (valgfritt)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                    placeholder="F.eks. Matte R1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-post til elev/foresatt (valgfritt)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-3 bg-slate-50 border outline-none transition-colors"
                    placeholder="epost@eksempel.no"
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Tilbake
                </button>
                <button
                  onClick={handleNext}
                  disabled={!studentName.trim() || isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Lagrer...' : 'Fullfør'}
                  {!isLoading && <CheckCircle2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
