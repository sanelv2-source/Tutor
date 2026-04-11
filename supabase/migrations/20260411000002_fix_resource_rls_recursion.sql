-- Fix infinite recursion in RLS policies for resources
-- The issue is caused by complex nested subqueries creating circular dependencies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Students can read assigned resources v2" ON public.resources;
DROP POLICY IF EXISTS "Students can read their own assignments v2" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources" ON public.resource_assignments;

-- Create simpler, non-recursive policies

-- Students can read resources assigned to them (simplified)
CREATE POLICY "Students can read assigned resources v3" ON public.resources
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

-- Students can read their own assignments (simplified)
CREATE POLICY "Students can read their own assignments v3" ON public.resource_assignments
    FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT s.id FROM public.students s
            WHERE s.profile_id = auth.uid()
        )
    );

-- Tutors can view assignments for their resources (simplified)
CREATE POLICY "Tutors can view assignments for their resources v3" ON public.resource_assignments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_assignments.resource_id
            AND r.tutor_id = auth.uid()
        )
    );