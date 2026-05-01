-- Comprehensive fix for RLS policies - ensure only correct policies exist
-- Drop ALL old resource policies to prevent conflicts

-- Drop all old policies on resources table
DROP POLICY IF EXISTS "Tutors can manage their own resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v2" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v3" ON public.resources;

-- Drop all old policies on resource_assignments table
DROP POLICY IF EXISTS "Students can read their own assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v2" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v3" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can manage assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources v3" ON public.resource_assignments;

-- Recreate the correct policies

-- Students can read resources assigned to them
CREATE POLICY "Students can read assigned resources" ON public.resources
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.resource_assignments ra
            WHERE ra.resource_id = resources.id
            AND ra.student_id IN (
                SELECT s.id FROM public.students s
                WHERE s.profile_id = auth.uid()
            )
        )
    );

-- Students can read their own assignments
CREATE POLICY "Students can read their own assignments" ON public.resource_assignments
    FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.profile_id = auth.uid()
        )
    );

-- Tutors can manage their own resources (CREATE, UPDATE, DELETE)
CREATE POLICY "Tutors can manage their own resources" ON public.resources
    FOR ALL
    USING (auth.uid() = tutor_id)
    WITH CHECK (auth.uid() = tutor_id);

-- Tutors can manage assignments for their resources
CREATE POLICY "Tutors can manage assignments for their resources" ON public.resource_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_assignments.resource_id
            AND r.tutor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_assignments.resource_id
            AND r.tutor_id = auth.uid()
        )
    );
