-- Break the RLS cycle between resources and resource_assignments.
-- The helper functions run as SECURITY DEFINER so policy checks can look up
-- ownership/assignment rows without triggering the other table's RLS policy.

CREATE OR REPLACE FUNCTION public.is_tutorflyt_resource_owner(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
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
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resource_assignments ra
    JOIN public.students s ON s.id = ra.student_id
    WHERE ra.resource_id = p_resource_id
      AND s.profile_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_tutorflyt_resource_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_tutorflyt_student_record(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_tutorflyt_assigned_resource(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_resource_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_student_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tutorflyt_assigned_resource(uuid) TO authenticated;

DROP POLICY IF EXISTS "Tutors can manage their own resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v2" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v3" ON public.resources;
DROP POLICY IF EXISTS "Teachers manage own resources" ON public.resources;
DROP POLICY IF EXISTS "Students view assigned resources" ON public.resources;

DROP POLICY IF EXISTS "Tutors can manage assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources v3" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v2" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v3" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students view resource assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Teachers manage resource assignments" ON public.resource_assignments;

CREATE POLICY "Teachers manage own resources"
  ON public.resources FOR ALL
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Students view assigned resources"
  ON public.resources FOR SELECT
  USING (public.is_tutorflyt_assigned_resource(id));

CREATE POLICY "Students view resource assignments"
  ON public.resource_assignments FOR SELECT
  USING (public.is_tutorflyt_student_record(student_id));

CREATE POLICY "Teachers manage resource assignments"
  ON public.resource_assignments FOR ALL
  USING (public.is_tutorflyt_resource_owner(resource_id))
  WITH CHECK (public.is_tutorflyt_resource_owner(resource_id));

CREATE INDEX IF NOT EXISTS idx_resources_tutor_id ON public.resources(tutor_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_student_id ON public.resource_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource_id ON public.resource_assignments(resource_id);
