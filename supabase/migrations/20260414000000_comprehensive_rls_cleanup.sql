-- COMPREHENSIVE RLS POLICY CLEANUP AND RESET
-- This migration removes ALL conflicting policies and establishes a clean, working set

-- ============================================================================
-- STEP 1: Drop ALL existing policies on resources table
-- ============================================================================
DROP POLICY IF EXISTS "Tutors can manage their own resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v2" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v3" ON public.resources;

-- ============================================================================
-- STEP 2: Drop ALL existing policies on resource_assignments table
-- ============================================================================
DROP POLICY IF EXISTS "Tutors can manage assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources v3" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v2" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v3" ON public.resource_assignments;

-- ============================================================================
-- STEP 3: Create clean, non-recursive resources policies
-- ============================================================================

-- Tutors can manage (CRUD) their own resources
CREATE POLICY "Tutors can manage their own resources" ON public.resources
    FOR ALL
    USING (auth.uid() = tutor_id)
    WITH CHECK (auth.uid() = tutor_id);

-- Students can read resources assigned to them
-- SIMPLE: Uses resource_assignments table directly without JOINs
CREATE POLICY "Students can read assigned resources" ON public.resources
    FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT ra.resource_id 
            FROM public.resource_assignments ra
            WHERE ra.student_id IN (
                SELECT s.id 
                FROM public.students s 
                WHERE s.profile_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- STEP 4: Create clean, non-recursive resource_assignments policies
-- ============================================================================

-- Students can read their own resource assignments
-- SIMPLE: Direct student_id check with subquery for students table
CREATE POLICY "Students can read their own assignments" ON public.resource_assignments
    FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT s.id 
            FROM public.students s 
            WHERE s.profile_id = auth.uid()
        )
    );

-- Tutors can manage (CRUD) resource assignments for their resources
-- SIMPLE: Uses resources table reference only, no circular dependencies
CREATE POLICY "Tutors can manage assignments for their resources" ON public.resource_assignments
    FOR ALL
    USING (
        resource_id IN (
            SELECT r.id 
            FROM public.resources r 
            WHERE r.tutor_id = auth.uid()
        )
    )
    WITH CHECK (
        resource_id IN (
            SELECT r.id 
            FROM public.resources r 
            WHERE r.tutor_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource_id ON public.resource_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_student_id ON public.resource_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_resources_tutor_id ON public.resources(tutor_id);