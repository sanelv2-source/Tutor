-- Allow notifications between linked tutors and students without relying on
-- recursive RLS checks against public.students inside the policy itself.

CREATE OR REPLACE FUNCTION public.can_create_tutorflyt_notification(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    p_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.profile_id = p_user_id
        AND s.tutor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.profile_id = auth.uid()
        AND s.tutor_id = p_user_id
    );
$$;

REVOKE ALL ON FUNCTION public.can_create_tutorflyt_notification(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_create_tutorflyt_notification(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_create_tutorflyt_notification(uuid) TO authenticated;

DROP POLICY IF EXISTS "Allow notification inserts" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert related notifications" ON public.notifications;

CREATE POLICY "Users can insert related notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.can_create_tutorflyt_notification(user_id));
