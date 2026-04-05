-- Ensure foreign key from assignments.tutor_id to profiles.id exists
ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_tutor_id_fkey;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_tutor_id_fkey 
  FOREIGN KEY (tutor_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Ensure foreign key from assignments.student_id to students.id exists
ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_student_id_fkey;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_student_id_fkey 
  FOREIGN KEY (student_id) 
  REFERENCES public.students(id) 
  ON DELETE CASCADE;

-- Fix RLS for students
DROP POLICY IF EXISTS "Students can view their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view own assignments" ON public.assignments;

CREATE POLICY "Students can view their own assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE profile_id = auth.uid()
  )
);
