import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  ClipboardList,
  FileText,
  Send,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { readApiJson } from '../utils/api';

type AssistantTask = 'lesson_plan' | 'exercises' | 'summary' | 'message';

type StudentOption = {
  id: string;
  name?: string;
  full_name?: string;
  subject?: string;
};

type AIAssistantProps = {
  students: StudentOption[];
  teacherName?: string;
};

const assistantTasks: Array<{
  id: AssistantTask;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  detailsLabel: string;
  detailsPlaceholder: string;
}> = [
  {
    id: 'lesson_plan',
    label: 'Lag undervisningsplan',
    icon: CalendarDays,
    detailsLabel: 'Mål og rammer',
    detailsPlaceholder: 'F.eks. 60 minutter, lineære funksjoner, eleven trenger tydelige eksempler og litt repetisjon.',
  },
  {
    id: 'exercises',
    label: 'Lag øvingsoppgaver',
    icon: ClipboardList,
    detailsLabel: 'Oppgavetype',
    detailsPlaceholder: 'F.eks. 8 oppgaver om brøk, fra lett til vanskelig, med fasit og én utfordring.',
  },
  {
    id: 'summary',
    label: 'Skriv timeoppsummering',
    icon: FileText,
    detailsLabel: 'Notater fra timen',
    detailsPlaceholder: 'F.eks. jobbet med prosentregning, bra innsats, må øve mer på tekstoppgaver, lekse side 42.',
  },
  {
    id: 'message',
    label: 'Skriv melding til elev',
    icon: Send,
    detailsLabel: 'Meldingsinnhold',
    detailsPlaceholder: 'F.eks. minn eleven på leksen, gi ros for innsats, og avtal hva vi starter med neste time.',
  },
];

const toneOptions = [
  'Vennlig og profesjonell',
  'Kort og tydelig',
  'Motiverende',
  'Formell',
];

const getStudentName = (student?: StudentOption) => student?.full_name || student?.name || '';

const AIAssistant: React.FC<AIAssistantProps> = ({ students, teacherName }) => {
  const [task, setTask] = useState<AssistantTask>('lesson_plan');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [duration, setDuration] = useState('');
  const [tone, setTone] = useState(toneOptions[0]);
  const [details, setDetails] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedTask = useMemo(
    () => assistantTasks.find((item) => item.id === task) || assistantTasks[0],
    [task],
  );

  useEffect(() => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return;

    setStudentName(getStudentName(student));
    setSubject(student.subject || '');
  }, [studentId, students]);

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!subject.trim() && !details.trim()) {
      setStatus({ type: 'error', text: 'Skriv inn fag, emne eller litt kontekst først.' });
      return;
    }

    setIsGenerating(true);
    setStatus(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError && sessionError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }

      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Du må være logget inn for å bruke AI-assistenten.');
      }

      const response = await fetch('/api/ai/teacher-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task,
          studentName: studentName.trim(),
          subject: subject.trim(),
          level: level.trim(),
          duration: duration.trim(),
          tone,
          details: details.trim(),
          teacherName,
        }),
      });

      const data = await readApiJson<{ content: string }>(response, 'Kunne ikke generere AI-utkast.');
      setResult(data.content || '');
      setStatus({ type: 'success', text: 'Utkastet er klart.' });
    } catch (error: any) {
      setStatus({ type: 'error', text: error.message || 'Noe gikk galt ved generering.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setStatus({ type: 'success', text: 'Kopiert til utklippstavlen.' });
    } catch {
      setStatus({ type: 'error', text: 'Kunne ikke kopiere teksten automatisk.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">AI-assistent</h2>
          <p className="text-sm text-slate-500">Velg oppgave og fyll inn kontekst.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {assistantTasks.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === task;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTask(item.id)}
                className={`flex min-h-20 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold leading-snug">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Elev</label>
                <select
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Ingen valgt</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {getStudentName(student)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Elevnavn</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  placeholder="F.eks. Nora"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fag eller emne</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="F.eks. Matte R1"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nivå</label>
                <input
                  type="text"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  placeholder="F.eks. 10. trinn"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Varighet</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  placeholder="F.eks. 60 minutter"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {toneOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{selectedTask.detailsLabel}</label>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={8}
                maxLength={4000}
                placeholder={selectedTask.detailsPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>

            {status && (
              <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{status.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:hover:bg-indigo-600 transition-colors sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? 'Genererer...' : 'Generer'}
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 flex min-h-[420px] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Resultat</h3>
              <button
                type="button"
                onClick={copyResult}
                disabled={!result}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ClipboardCopy className="h-4 w-4" />
                Kopier
              </button>
            </div>

            <div className="mt-4 flex-1 rounded-xl bg-slate-50 border border-slate-200 p-4 overflow-auto">
              {result ? (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800">{result}</pre>
              ) : (
                <div className="flex h-full min-h-72 items-center justify-center text-center text-sm text-slate-400">
                  <span>Resultatet vises her.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
