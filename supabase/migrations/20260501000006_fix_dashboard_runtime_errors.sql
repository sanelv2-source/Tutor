-- Fix runtime errors found while testing the tutor dashboard.

-- The dashboard reads and writes fixed lesson slots in faste_tider, but some
-- deployments never got the table.
CREATE TABLE IF NOT EXISTS public.faste_tider (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faste_tider_tutor_id ON public.faste_tider(tutor_id);
CREATE INDEX IF NOT EXISTS idx_faste_tider_date ON public.faste_tider(date);

ALTER TABLE public.faste_tider ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can manage own faste tider" ON public.faste_tider;
CREATE POLICY "Tutors can manage own faste tider"
ON public.faste_tider
FOR ALL
TO authenticated
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());

-- Some live databases have two FKs from submissions.assignment_id to
-- assignments.id, which makes PostgREST embedding ambiguous. Keep the standard
-- Supabase-generated name used by the current app migrations.
ALTER TABLE public.submissions
DROP CONSTRAINT IF EXISTS fk_submissions_assignments;
