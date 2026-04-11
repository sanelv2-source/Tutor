-- Improve RLS policies for better resource access

-- Drop the old complex policy on resources
DROP POLICY IF EXISTS "Students can read assigned resources" ON public.resources;

-- Create a simpler, more reliable policy that students can query
CREATE POLICY "Students can read assigned resources v2" ON public.resources
    FOR SELECT
    TO authenticated
    USING (
        -- Allow if student has a resource_assignment for this resource
        id IN (
            SELECT resource_id FROM public.resource_assignments ra
            WHERE ra.student_id IN (
                SELECT id FROM public.students 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- Ensure students can also read from resource_assignments table
DROP POLICY IF EXISTS "Students can read their own assignments" ON public.resource_assignments;

CREATE POLICY "Students can read their own assignments v2" ON public.resource_assignments
    FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students 
            WHERE profile_id = auth.uid()
        )
    );

-- Add a policy to allow teachers to read resource_assignments for their resources
DROP POLICY IF EXISTS "Tutors can view assignments for their resources" ON public.resource_assignments;

CREATE POLICY "Tutors can view assignments for their resources" ON public.resource_assignments
    FOR SELECT
    TO authenticated
    USING (
        resource_id IN (
            SELECT id FROM public.resources 
            WHERE tutor_id = auth.uid()
        )
    );