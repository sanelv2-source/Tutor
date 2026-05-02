-- Fix RLS policies that referenced auth.users directly.
--
-- Authenticated client queries cannot read auth.users, so policies that query
-- that table fail with "permission denied for table users". Supabase exposes the
-- current user's email safely through auth.email().

DROP POLICY IF EXISTS "Students can view their own student record" ON public.students;
CREATE POLICY "Students can view their own student record"
ON public.students
FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
  OR lower(email) = lower(auth.email())
);

DROP POLICY IF EXISTS "Students can update their own profile_id" ON public.students;
CREATE POLICY "Students can update their own profile_id"
ON public.students
FOR UPDATE
TO authenticated
USING (
  lower(email) = lower(auth.email())
)
WITH CHECK (
  profile_id = auth.uid()
);

DROP POLICY IF EXISTS "Students can update their own profile_id during linking" ON public.students;
CREATE POLICY "Students can update their own profile_id during linking"
ON public.students
FOR UPDATE
TO authenticated
USING (
  lower(email) = lower(auth.email())
)
WITH CHECK (
  profile_id = auth.uid()
);
