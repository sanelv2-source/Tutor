-- Additional Supabase security advisor cleanup.
-- Uses live metadata so manually-created policies/functions are handled too.

-- Remove direct caller access to SECURITY DEFINER functions. Trigger functions
-- and auth hooks can still run as triggers; helper functions used by RLS are
-- converted to SECURITY INVOKER before revoking direct execution.
DO $$
DECLARE
  fn regprocedure;
  fns regprocedure[] := ARRAY[
    to_regprocedure('public.is_tutorflyt_resource_owner(uuid)'),
    to_regprocedure('public.is_tutorflyt_student_record(uuid)'),
    to_regprocedure('public.is_tutorflyt_assigned_resource(uuid)'),
    to_regprocedure('public.is_user_in_conversation(uuid)')
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', fn);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  fn regprocedure;
  fns regprocedure[] := ARRAY[
    to_regprocedure('public.accept_student_invitation(text, uuid)'),
    to_regprocedure('public.final_fix_handle_new_user()'),
    to_regprocedure('public.get_my_resources()'),
    to_regprocedure('public.handle_new_message()'),
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.is_tutorflyt_assigned_resource(uuid)'),
    to_regprocedure('public.is_tutorflyt_resource_owner(uuid)'),
    to_regprocedure('public.is_tutorflyt_student_record(uuid)'),
    to_regprocedure('public.is_user_in_conversation(uuid)'),
    to_regprocedure('public.link_student_profile()'),
    to_regprocedure('public.link_student_profile_on_profile_insert()'),
    to_regprocedure('public.link_student_to_profile()'),
    to_regprocedure('public.rls_auto_enable()')
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    END IF;
  END LOOP;
END $$;

-- Drop public bucket SELECT policies that allow broad listing. Public buckets
-- can still serve known public URLs; this removes list/read-all policies.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('SELECT', 'ALL')
      AND (
        qual ILIKE '%bucket_id%avatars%'
        OR qual ILIKE '%bucket_id%resources%'
        OR qual ILIKE '%bucket_id%submissions%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Re-add narrow storage policies needed by the app.
CREATE POLICY "Users can upload own submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
  AND owner = auth.uid()
);

CREATE POLICY "Owners can read resource objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources'
  AND owner = auth.uid()
);

CREATE POLICY "Owners can read avatar objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
);

-- Drop overly permissive true policies reported by the advisor.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('beta_applicants', 'reports', 'students', 'submissions')
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Conservative replacements for common app paths.
DROP POLICY IF EXISTS "Tutors can insert own reports" ON public.reports;
CREATE POLICY "Tutors can insert own reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.tutor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tutors can read own reports" ON public.reports;
CREATE POLICY "Tutors can read own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.tutor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tutors can update own submissions" ON public.submissions;
CREATE POLICY "Tutors can update own submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());

DROP POLICY IF EXISTS "Tutors can delete own students" ON public.students;
CREATE POLICY "Tutors can delete own students"
ON public.students
FOR DELETE
TO authenticated
USING (tutor_id = auth.uid());
