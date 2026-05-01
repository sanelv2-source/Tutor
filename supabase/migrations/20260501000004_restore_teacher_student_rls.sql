-- Restore app-critical teacher/student access after the security hardening pass.
--
-- The hardening enabled RLS on profiles/students and removed broad fallback
-- policies. The app needs these narrow relationship policies, and student
-- email checks must use auth.email() instead of querying auth.users from RLS.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Tutors can view their students profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students can view their tutor profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Tutors can view their students profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.profile_id = public.profiles.id
      AND s.tutor_id = auth.uid()
  )
);

CREATE POLICY "Students can view their tutor profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.profile_id = auth.uid()
      AND s.tutor_id = public.profiles.id
  )
);

-- Students
DROP POLICY IF EXISTS "Tutors can view their own students" ON public.students;
DROP POLICY IF EXISTS "Tutors can insert their own students" ON public.students;
DROP POLICY IF EXISTS "Tutors can update their own students" ON public.students;
DROP POLICY IF EXISTS "Tutors can delete their own students" ON public.students;
DROP POLICY IF EXISTS "Tutors can delete own students" ON public.students;
DROP POLICY IF EXISTS "Students can view their own student record" ON public.students;
DROP POLICY IF EXISTS "Students can update their own profile_id" ON public.students;
DROP POLICY IF EXISTS "Students can update their own profile_id and last_seen_at" ON public.students;
DROP POLICY IF EXISTS "Students can update their own profile_id during linking" ON public.students;
DROP POLICY IF EXISTS "Students can update their own last_seen_at" ON public.students;
DROP POLICY IF EXISTS "Students can link their own profile" ON public.students;
DROP POLICY IF EXISTS "Students can update their own student record" ON public.students;

CREATE POLICY "Tutors can view their own students"
ON public.students
FOR SELECT
TO authenticated
USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can insert their own students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can update their own students"
ON public.students
FOR UPDATE
TO authenticated
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can delete their own students"
ON public.students
FOR DELETE
TO authenticated
USING (tutor_id = auth.uid());

CREATE POLICY "Students can view their own student record"
ON public.students
FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
  OR lower(email) = lower(auth.email())
);

CREATE POLICY "Students can link their own profile"
ON public.students
FOR UPDATE
TO authenticated
USING (
  lower(email) = lower(auth.email())
  AND (profile_id IS NULL OR profile_id = auth.uid())
)
WITH CHECK (
  profile_id = auth.uid()
  AND lower(email) = lower(auth.email())
);

CREATE POLICY "Students can update their own student record"
ON public.students
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
