-- Teacher operations: reminders, terms, notes, and lesson/invoice linking.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.teacher_settings (
  tutor_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_reminders_enabled boolean NOT NULL DEFAULT true,
  lesson_reminder_hours integer NOT NULL DEFAULT 24 CHECK (lesson_reminder_hours BETWEEN 1 AND 168),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.teacher_settings (tutor_id)
SELECT id
FROM public.profiles
WHERE role = 'tutor'
ON CONFLICT (tutor_id) DO NOTHING;

DROP TRIGGER IF EXISTS set_teacher_settings_updated_at ON public.teacher_settings;
CREATE TRIGGER set_teacher_settings_updated_at
  BEFORE UPDATE ON public.teacher_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.teacher_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Vilkår for privatundervisning',
  cancellation_notice_hours integer NOT NULL DEFAULT 24 CHECK (cancellation_notice_hours BETWEEN 0 AND 168),
  payment_due_days integer NOT NULL DEFAULT 7 CHECK (payment_due_days BETWEEN 0 AND 60),
  content text NOT NULL DEFAULT 'Avbestilling må skje senest 24 timer før avtalt time. Timer som avbestilles senere kan faktureres. Betaling skjer etter fullført time, med forfall etter 7 dager dersom annet ikke er avtalt.',
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_terms_default
  ON public.teacher_terms(tutor_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_teacher_terms_tutor_id ON public.teacher_terms(tutor_id);

DROP TRIGGER IF EXISTS set_teacher_terms_updated_at ON public.teacher_terms;
CREATE TRIGGER set_teacher_terms_updated_at
  BEFORE UPDATE ON public.teacher_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_id uuid NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_tutor_student
  ON public.student_notes(tutor_id, student_id, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.lessons') IS NOT NULL THEN
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS completed_at timestamptz;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS reminder_last_error text;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS invoice_id uuid;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2);
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS private_notes text;
    CREATE INDEX IF NOT EXISTS idx_lessons_reminder_lookup
      ON public.lessons(tutor_id, lesson_date, start_time)
      WHERE reminder_sent_at IS NULL;
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS lesson_id uuid;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_from_lesson boolean NOT NULL DEFAULT false;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS request_sent_at timestamptz;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tutor_phone text;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_link text;
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS student_id uuid;
    CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_lesson_id ON public.invoices(lesson_id);
  END IF;
END $$;

ALTER TABLE public.teacher_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can manage own teacher settings" ON public.teacher_settings;
CREATE POLICY "Tutors can manage own teacher settings"
ON public.teacher_settings
FOR ALL
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());

DROP POLICY IF EXISTS "Tutors can manage own terms" ON public.teacher_terms;
CREATE POLICY "Tutors can manage own terms"
ON public.teacher_terms
FOR ALL
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());

DROP POLICY IF EXISTS "Tutors can manage own student notes" ON public.student_notes;
CREATE POLICY "Tutors can manage own student notes"
ON public.student_notes
FOR ALL
USING (tutor_id = auth.uid())
WITH CHECK (
  tutor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_notes.student_id
      AND s.tutor_id = auth.uid()
  )
);
