CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    answer_text TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure foreign keys exist if the table was already created
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_student_id_fkey') THEN
        ALTER TABLE public.submissions ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_report_id_fkey') THEN
        ALTER TABLE public.submissions ADD CONSTRAINT submissions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_assignment_id_fkey') THEN
        ALTER TABLE public.submissions ADD CONSTRAINT submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_tutor_id_fkey') THEN
        ALTER TABLE public.submissions ADD CONSTRAINT submissions_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Students can insert their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Tutors can view submissions for their assignments" ON public.submissions;

-- 1. Students can insert their own submissions
CREATE POLICY "Students can insert their own submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students WHERE profile_id = auth.uid()
  )
);

-- 2. Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE profile_id = auth.uid()
  )
);

-- 3. Tutors can view submissions where tutor_id = auth.uid()
CREATE POLICY "Tutors can view submissions for their assignments"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  tutor_id = auth.uid()
);
