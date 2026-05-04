import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, CreditCard, FileText, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

type StudentDetailModalProps = {
  student: any;
  lessons: any[];
  invoices: any[];
  onClose: () => void;
  onToast: (message: string) => void;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Ikke satt';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('no-NO');
};

const isPaid = (invoice: any) => {
  const status = String(invoice?.status || '').toLowerCase();
  return status === 'paid' || status === 'betalt';
};

export default function StudentDetailModal({ student, lessons, invoices, onClose, onToast }: StudentDetailModalProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const studentLessons = useMemo(() => {
    return lessons
      .filter(lesson =>
        lesson.student_id === student.id ||
        String(lesson.student_name || '').trim().toLowerCase() === String(student.full_name || student.name || '').trim().toLowerCase()
      )
      .sort((a, b) => String(b.lesson_date || '').localeCompare(String(a.lesson_date || '')));
  }, [lessons, student]);

  const studentInvoices = useMemo(() => {
    return invoices
      .filter(invoice =>
        invoice.student_id === student.id ||
        String(invoice.student_name || invoice.student || '').trim().toLowerCase() === String(student.full_name || student.name || '').trim().toLowerCase()
      )
      .sort((a, b) => String(b.due_date || b.created_at || '').localeCompare(String(a.due_date || a.created_at || '')));
  }, [invoices, student]);

  const paymentSummary = useMemo(() => {
    return studentInvoices.reduce((summary, invoice) => {
      const amount = Number(invoice.amount || 0);
      if (isPaid(invoice)) summary.paid += amount;
      else summary.pending += amount;
      return summary;
    }, { paid: 0, pending: 0 });
  }, [studentInvoices]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('student_notes')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Could not fetch student notes:', error);
      return;
    }

    setNotes(data || []);
  };

  useEffect(() => {
    fetchNotes();
  }, [student.id]);

  const saveNote = async () => {
    if (!noteText.trim()) return;

    setIsSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('student_notes')
      .insert({
        tutor_id: user?.id,
        student_id: student.id,
        note: noteText.trim(),
      });

    setIsSavingNote(false);

    if (error) {
      onToast(`Kunne ikke lagre notat: ${error.message}`);
      return;
    }

    setNoteText('');
    onToast('Notat lagret');
    fetchNotes();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{student.name || student.full_name}</h2>
            <p className="text-sm text-slate-500">{student.subject || 'Fag ikke satt'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-600">Innbetalt</p>
              <p className="mt-1 text-2xl font-black text-emerald-700">{paymentSummary.paid.toLocaleString('no-NO')} kr</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-600">Utestående</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{paymentSummary.pending.toLocaleString('no-NO')} kr</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Timer</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{studentLessons.length}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Notater</h3>
              </div>

              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={5}
                placeholder="Skriv et internt notat..."
                className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={saveNote}
                disabled={isSavingNote || !noteText.trim()}
                className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSavingNote ? 'Lagrer...' : 'Lagre notat'}
              </button>

              <div className="mt-5 space-y-3">
                {notes.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Ingen notater enda.</p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{note.note}</p>
                      <p className="mt-2 text-xs text-slate-400">{new Date(note.created_at).toLocaleString('no-NO')}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900">Timehistorikk</h3>
                </div>

                <div className="space-y-3">
                  {studentLessons.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Ingen timer registrert.</p>
                  ) : (
                    studentLessons.slice(0, 12).map(lesson => (
                      <div key={lesson.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                        <div>
                          <p className="font-semibold text-slate-900">{formatDate(lesson.lesson_date)} kl. {String(lesson.start_time || '').slice(0, 5)}</p>
                          <p className="text-sm text-slate-500">{lesson.duration_minutes || 60} min</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${String(lesson.status || '').toLowerCase().includes('full') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {lesson.status || 'Planlagt'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  <h3 className="font-bold text-slate-900">Betalinger</h3>
                </div>

                <div className="space-y-3">
                  {studentInvoices.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Ingen fakturaer registrert.</p>
                  ) : (
                    studentInvoices.slice(0, 12).map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                        <div>
                          <p className="font-semibold text-slate-900">{Number(invoice.amount || 0).toLocaleString('no-NO')} kr</p>
                          <p className="text-sm text-slate-500">{formatDate(invoice.due_date || invoice.created_at)}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${isPaid(invoice) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isPaid(invoice) && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {isPaid(invoice) ? 'Betalt' : (invoice.status === 'draft' ? 'Utkast' : 'Venter')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
