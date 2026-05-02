-- Restore app-critical RLS helpers after security advisor cleanup.
--
-- These functions are intentionally SECURITY DEFINER because the resources /
-- resource_assignments and messages policies use them to avoid recursive RLS
-- checks. They are still only executable by authenticated users.

CREATE OR REPLACE FUNCTION public.is_tutorflyt_resource_owner(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resources r
    WHERE r.id = p_resource_id
      AND r.tutor_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tutorflyt_student_record(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = p_student_id
      AND s.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tutorflyt_assigned_resource(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resource_assignments ra
    JOIN public.students s ON s.id = ra.student_id
    WHERE ra.resource_id = p_resource_id
      AND s.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_in_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.students s ON c.student_id = s.id
    WHERE c.id = conv_id
      AND (c.tutor_id = auth.uid() OR s.profile_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_tutorflyt_resource_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_tutorflyt_student_record(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_tutorflyt_assigned_resource(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_in_conversation(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_tutorflyt_resource_owner(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_tutorflyt_student_record(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_tutorflyt_assigned_resource(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_user_in_conversation(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.is_tutorflyt_resource_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_student_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_assigned_resource(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_conversation(uuid) TO authenticated;

-- Tutors need to open submissions that their students uploaded.
DROP POLICY IF EXISTS "Tutors can read student submission objects" ON storage.objects;
CREATE POLICY "Tutors can read student submission objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1
    FROM public.submissions sub
    WHERE sub.tutor_id = auth.uid()
      AND sub.file_url LIKE '%' || storage.objects.name
  )
);
