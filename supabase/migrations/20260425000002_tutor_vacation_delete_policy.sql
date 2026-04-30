-- Allow tutors to manage their own vacation days.
DROP POLICY IF EXISTS "Lærere kan legge inn egne ferier" ON public.tutor_vacation;
DROP POLICY IF EXISTS "Lærere kan oppdatere egne ferier" ON public.tutor_vacation;
DROP POLICY IF EXISTS "Lærere kan slette egne ferier" ON public.tutor_vacation;

CREATE POLICY "Lærere kan legge inn egne ferier"
ON public.tutor_vacation
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Lærere kan oppdatere egne ferier"
ON public.tutor_vacation
FOR UPDATE
TO authenticated
USING (auth.uid() = tutor_id)
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Lærere kan slette egne ferier"
ON public.tutor_vacation
FOR DELETE
TO authenticated
USING (auth.uid() = tutor_id);
