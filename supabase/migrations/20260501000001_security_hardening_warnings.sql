-- Security advisor hardening batch.
-- This migration tightens broad policies and locks function search paths.

-- Function search_path hardening and public EXECUTE cleanup.
DO $$
DECLARE
  fn regprocedure;
  fns regprocedure[] := ARRAY[
    to_regprocedure('public.set_updated_at()'),
    to_regprocedure('public.set_timestamp()'),
    to_regprocedure('public.send_invoice_email_v2()'),
    to_regprocedure('public.final_fix_handle_new_user()'),
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.link_student_profile()'),
    to_regprocedure('public.link_student_to_profile()'),
    to_regprocedure('public.link_student_profile_on_profile_insert()'),
    to_regprocedure('public.rls_auto_enable()'),
    to_regprocedure('public.update_updated_at_column()'),
    to_regprocedure('public.update_student_invitations_updated_at()'),
    to_regprocedure('public.handle_new_message()'),
    to_regprocedure('public.is_user_in_conversation(uuid)'),
    to_regprocedure('public.get_my_resources()'),
    to_regprocedure('public.is_tutorflyt_resource_owner(uuid)'),
    to_regprocedure('public.is_tutorflyt_student_record(uuid)'),
    to_regprocedure('public.is_tutorflyt_assigned_resource(uuid)'),
    to_regprocedure('public.accept_student_invitation(text, uuid)')
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, auth, storage, pg_temp', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    END IF;
  END LOOP;
END $$;

-- RLS helper functions are used by authenticated users through policies.
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_resource_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_student_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_assigned_resource(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_conversation(uuid) TO authenticated;

-- The public accept-invitation page now validates tokens through Netlify using
-- the service role. Authenticated users only need to read invitations addressed
-- to their own email, and tutors only need to read invitations they created.
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.student_invitations;
DROP POLICY IF EXISTS "Authenticated users can view addressed invitations" ON public.student_invitations;
CREATE POLICY "Authenticated users can view addressed invitations"
ON public.student_invitations
FOR SELECT
TO authenticated
USING (
  tutor_id = auth.uid()
  OR lower(email) = lower(auth.email())
);

-- Notifications are still client-created, but inserts must be for yourself or
-- for a linked tutor/student relationship. This removes WITH CHECK (true).
DROP POLICY IF EXISTS "Allow notification inserts" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert related notifications" ON public.notifications;
CREATE POLICY "Users can insert related notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.profile_id = public.notifications.user_id
      AND s.tutor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.profile_id = auth.uid()
      AND s.tutor_id = public.notifications.user_id
  )
);

-- Public buckets can still serve files by public URL, but clients should not
-- have broad SELECT policies that allow listing every object in a bucket.
DROP POLICY IF EXISTS "Authenticated users can read resources" ON storage.objects;
DROP POLICY IF EXISTS "Public can read resources" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;

DROP POLICY IF EXISTS "Users can read own resource objects" ON storage.objects;
CREATE POLICY "Users can read own resource objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources'
  AND owner = auth.uid()
);

DROP POLICY IF EXISTS "Users can read own avatar objects" ON storage.objects;
CREATE POLICY "Users can read own avatar objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
);
