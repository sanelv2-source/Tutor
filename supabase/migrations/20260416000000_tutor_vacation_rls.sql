-- Clear old RLS policies for tutor_vacation
DROP POLICY IF EXISTS "Lærere kan se egne ferier" ON public.tutor_vacation;
DROP POLICY IF EXISTS "Elever kan se lærerens ferie" ON public.tutor_vacation;

-- Policy 1: Teachers can see their own vacations
-- Simple rule: tutor_id matches the authenticated user's ID
CREATE POLICY "Lærere kan se egne ferier" 
ON public.tutor_vacation 
FOR SELECT 
TO authenticated 
USING (auth.uid() = tutor_id);

-- Policy 2: Students can see their tutor's vacations
-- Uses the students table linking to find the student's tutor_id
CREATE POLICY "Elever kan se lærerens ferie" 
ON public.tutor_vacation 
FOR SELECT 
TO authenticated 
USING (
  tutor_id IN (
    SELECT tutor_id FROM public.students 
    WHERE id = auth.uid()
  )
);

-- Ensure RLS is enabled on tutor_vacation table
ALTER TABLE public.tutor_vacation ENABLE ROW LEVEL SECURITY;
