-- Link existing lessons to students so reminder delivery can find student email.

DO $$
BEGIN
  IF to_regclass('public.lessons') IS NOT NULL AND to_regclass('public.students') IS NOT NULL THEN
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

    UPDATE public.lessons l
    SET student_id = s.id
    FROM public.students s
    WHERE l.student_id IS NULL
      AND l.tutor_id = s.tutor_id
      AND lower(trim(l.student_name)) = lower(trim(s.full_name));

    CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON public.lessons(student_id);
  END IF;
END $$;
