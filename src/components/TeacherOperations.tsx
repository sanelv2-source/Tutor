import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, FileText, Save, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { readApiJson } from '../utils/api';

type TeacherOperationsProps = {
  authUserId: string | null;
  students: any[];
  onToast: (message: string) => void;
};

type TeacherSettings = {
  lesson_reminders_enabled: boolean;
  lesson_reminder_hours: number;
};

type TeacherTerms = {
  id?: string;
  title: string;
  cancellation_notice_hours: number;
  payment_due_days: number;
  content: string;
};

const defaultSettings: TeacherSettings = {
  lesson_reminders_enabled: true,
  lesson_reminder_hours: 24,
};

const defaultTerms: TeacherTerms = {
  title: 'Vilkår for privatundervisning',
  cancellation_notice_hours: 24,
  payment_due_days: 7,
  content:
    'Avbestilling må skje senest 24 timer før avtalt time. Timer som avbestilles senere kan faktureres.\n\nBetaling skjer etter fullført time, med forfall etter 7 dager dersom annet ikke er avtalt.\n\nEleven møter forberedt til timen. Lærer gir beskjed så tidlig som mulig ved sykdom eller behov for å flytte time.',
};

const isSchemaMissingError = (error: any) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return /schema cache|Could not find .* table|relation .* does not exist|Could not find .* column|column .* does not exist/i.test(message);
};

export default function TeacherOperations({ authUserId, students, onToast }: TeacherOperationsProps) {
  const [settings, setSettings] = useState<TeacherSettings>(defaultSettings);
  const [terms, setTerms] = useState<TeacherTerms>(defaultTerms);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [isSendingTerms, setIsSendingTerms] = useState(false);

  const getSettingsStorageKey = () => `teacher_settings_${authUserId}`;
  const getTermsStorageKey = () => `teacher_terms_${authUserId}`;

  const loadLocalSettings = () => {
    try {
      const saved = window.localStorage.getItem(getSettingsStorageKey());
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : null;
    } catch {
      return null;
    }
  };

  const loadLocalTerms = () => {
    try {
      const saved = window.localStorage.getItem(getTermsStorageKey());
      return saved ? { ...defaultTerms, ...JSON.parse(saved) } : null;
    } catch {
      return null;
    }
  };

  const saveLocalSettings = (nextSettings: TeacherSettings) => {
    window.localStorage.setItem(getSettingsStorageKey(), JSON.stringify(nextSettings));
  };

  const saveLocalTerms = (nextTerms: TeacherTerms) => {
    const { id, ...termsWithoutId } = nextTerms;
    window.localStorage.setItem(getTermsStorageKey(), JSON.stringify(termsWithoutId));
  };

  useEffect(() => {
    const fetchOperationsData = async () => {
      if (!authUserId) return;
      setIsLoading(true);

      const localSettings = loadLocalSettings();
      const localTerms = loadLocalTerms();
      if (localSettings) setSettings(localSettings);
      if (localTerms) setTerms(localTerms);

      const [{ data: settingsData, error: settingsError }, { data: termsData, error: termsError }] = await Promise.all([
        supabase
          .from('teacher_settings')
          .select('lesson_reminders_enabled, lesson_reminder_hours')
          .eq('tutor_id', authUserId)
          .maybeSingle(),
        supabase
          .from('teacher_terms')
          .select('id, title, cancellation_notice_hours, payment_due_days, content')
          .eq('tutor_id', authUserId)
          .eq('is_default', true)
          .maybeSingle(),
      ]);

      if (settingsError && !isSchemaMissingError(settingsError)) {
        console.error('Could not fetch teacher settings:', settingsError);
      }

      if (termsError && !isSchemaMissingError(termsError)) {
        console.error('Could not fetch teacher terms:', termsError);
      }

      if (settingsData) {
        setSettings({
          lesson_reminders_enabled: Boolean(settingsData.lesson_reminders_enabled),
          lesson_reminder_hours: Number(settingsData.lesson_reminder_hours || 24),
        });
      }

      if (termsData) {
        setTerms({
          id: termsData.id,
          title: termsData.title || defaultTerms.title,
          cancellation_notice_hours: Number(termsData.cancellation_notice_hours || 24),
          payment_due_days: Number(termsData.payment_due_days || 7),
          content: termsData.content || defaultTerms.content,
        });
      }

      setIsLoading(false);
    };

    fetchOperationsData();
  }, [authUserId]);

  const saveSettings = async () => {
    if (!authUserId) return;
    setIsSavingSettings(true);

    const { error } = await supabase
      .from('teacher_settings')
      .upsert({
        tutor_id: authUserId,
        lesson_reminders_enabled: settings.lesson_reminders_enabled,
        lesson_reminder_hours: Number(settings.lesson_reminder_hours) || 24,
      }, { onConflict: 'tutor_id' });

    setIsSavingSettings(false);

    if (error) {
      if (isSchemaMissingError(error)) {
        saveLocalSettings(settings);
        onToast('Påminnelser lagret lokalt. Kjør Supabase-migrasjonen for automatisk utsending.');
        return;
      }

      onToast(`Kunne ikke lagre påminnelser: ${error.message}`);
      return;
    }

    onToast('Påminnelser lagret');
  };

  const saveTerms = async () => {
    if (!authUserId) return false;
    setIsSavingTerms(true);

    const payload = {
      tutor_id: authUserId,
      title: terms.title || defaultTerms.title,
      cancellation_notice_hours: Number(terms.cancellation_notice_hours) || 24,
      payment_due_days: Number(terms.payment_due_days) || 7,
      content: terms.content || defaultTerms.content,
      is_default: true,
    };

    const query = terms.id
      ? supabase.from('teacher_terms').update(payload).eq('id', terms.id).select('id').single()
      : supabase.from('teacher_terms').insert(payload).select('id').single();

    const { data, error } = await query;
    setIsSavingTerms(false);

    if (error) {
      if (isSchemaMissingError(error)) {
        saveLocalTerms(terms);
        onToast('Vilkår lagret lokalt. Kjør Supabase-migrasjonen for skylagring.');
        return true;
      }

      onToast(`Kunne ikke lagre vilkår: ${error.message}`);
      return false;
    }

    if (data?.id) setTerms(prev => ({ ...prev, id: data.id }));
    onToast('Vilkår lagret');
    return true;
  };

  const sendTerms = async () => {
    if (!selectedStudentId) {
      onToast('Velg en elev først');
      return;
    }

    setIsSendingTerms(true);

    try {
      if (!terms.id) {
        await saveTerms();
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;
      const response = await fetch('/api/student/terms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          termsId: terms.id,
          terms: {
            title: terms.title,
            cancellation_notice_hours: Number(terms.cancellation_notice_hours) || 24,
            payment_due_days: Number(terms.payment_due_days) || 7,
            content: terms.content,
          },
        }),
      });

      await readApiJson(response, 'Kunne ikke sende vilkår');
      onToast('Vilkår sendt');
    } catch (error: any) {
      onToast(error.message || 'Kunne ikke sende vilkår');
    } finally {
      setIsSendingTerms(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Laster drift...
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Timepåminnelser</h2>
              <p className="text-sm text-slate-500">Sendes automatisk til elev eller foresatt.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="font-medium text-slate-700">Aktiv</span>
              <input
                type="checkbox"
                checked={settings.lesson_reminders_enabled}
                onChange={(event) => setSettings(prev => ({ ...prev, lesson_reminders_enabled: event.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-400">Tid før time</label>
              <select
                value={settings.lesson_reminder_hours}
                onChange={(event) => setSettings(prev => ({ ...prev, lesson_reminder_hours: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={2}>2 timer</option>
                <option value={12}>12 timer</option>
                <option value={24}>24 timer</option>
                <option value={48}>48 timer</option>
              </select>
            </div>

            <button
              onClick={saveSettings}
              disabled={isSavingSettings}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSavingSettings ? 'Lagrer...' : 'Lagre påminnelser'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Send vilkår</h2>
              <p className="text-sm text-slate-500">Bruker teksten til høyre.</p>
            </div>
          </div>

          <div className="space-y-4">
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Velg elev...</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name || student.full_name}
                </option>
              ))}
            </select>

            <button
              onClick={sendTerms}
              disabled={isSendingTerms || !selectedStudentId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSendingTerms ? 'Sender...' : 'Send til elev'}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Avbestilling og vilkår</h2>
              <p className="text-sm text-slate-500">Standardtekst for nye elever.</p>
            </div>
          </div>
          <button
            onClick={saveTerms}
            disabled={isSavingTerms}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSavingTerms ? 'Lagrer...' : 'Lagre vilkår'}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">Tittel</label>
            <input
              value={terms.title}
              onChange={(event) => setTerms(prev => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-400">Avbestilling</label>
              <input
                type="number"
                min={0}
                value={terms.cancellation_notice_hours}
                onChange={(event) => setTerms(prev => ({ ...prev, cancellation_notice_hours: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-400">Forfall</label>
              <input
                type="number"
                min={0}
                value={terms.payment_due_days}
                onChange={(event) => setTerms(prev => ({ ...prev, payment_due_days: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-bold uppercase text-slate-400">Tekst</label>
          <textarea
            rows={12}
            value={terms.content}
            onChange={(event) => setTerms(prev => ({ ...prev, content: event.target.value }))}
            className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>
    </div>
  );
}
