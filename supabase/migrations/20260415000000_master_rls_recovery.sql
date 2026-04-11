-- ============================================================================
-- MASTER RLS POLICY RECOVERY - Complete Fix for All Conflicts
-- ============================================================================
-- This migration COMPLETELY REMOVES all conflicting RLS policies and establishes
-- a single, clean, non-recursive set that works with all new features.

-- ============================================================================
-- PHASE 1: NUCLEAR CLEANUP - Remove ALL versions of conflicting policies
-- ============================================================================

-- Assignments table - Remove ALL policies and rebuild clean
DROP POLICY IF EXISTS "Tutors can view their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can insert their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can update their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can delete their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can update their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can view own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can insert own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can update own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view own assignments" ON public.assignments;

-- Resources table - Remove ALL versions
DROP POLICY IF EXISTS "Tutors can manage their own resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v2" ON public.resources;
DROP POLICY IF EXISTS "Students can read assigned resources v3" ON public.resources;

-- Resource Assignments table - Remove ALL versions
DROP POLICY IF EXISTS "Tutors can manage assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources" ON public.resource_assignments;
DROP POLICY IF EXISTS "Tutors can view assignments for their resources v3" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v2" ON public.resource_assignments;
DROP POLICY IF EXISTS "Students can read their own assignments v3" ON public.resource_assignments;

-- ============================================================================
-- PHASE 2: BUILD CLEAN RLS POLICIES - Assignments
-- ============================================================================

-- Teachers can view/insert/update/delete their own assignments
CREATE POLICY "Teachers manage own assignments"
    ON public.assignments FOR ALL
    USING (tutor_id = auth.uid())
    WITH CHECK (tutor_id = auth.uid());

-- Students can view their own assignments (using simple subquery)
CREATE POLICY "Students view their assignments"
    ON public.assignments FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM public.students 
            WHERE profile_id = auth.uid()
        )
    );

-- Students can update their own assignments (for status changes)
CREATE POLICY "Students update their assignments"
    ON public.assignments FOR UPDATE
    USING (
        student_id IN (
            SELECT id FROM public.students 
            WHERE profile_id = auth.uid()
        )
    );

-- ============================================================================
-- PHASE 3: BUILD CLEAN RLS POLICIES - Resources
-- ============================================================================

-- Teachers manage their own resources
CREATE POLICY "Teachers manage own resources"
    ON public.resources FOR ALL
    USING (auth.uid() = tutor_id)
    WITH CHECK (auth.uid() = tutor_id);

-- Students view resources assigned to them (simple IN subquery)
CREATE POLICY "Students view assigned resources"
    ON public.resources FOR SELECT
    USING (
        id IN (
            SELECT resource_id FROM public.resource_assignments
            WHERE student_id IN (
                SELECT id FROM public.students 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- PHASE 4: BUILD CLEAN RLS POLICIES - Resource Assignments
-- ============================================================================

-- Students view their resource assignments
CREATE POLICY "Students view resource assignments"
    ON public.resource_assignments FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM public.students 
            WHERE profile_id = auth.uid()
        )
    );

-- Teachers manage resource assignments for their resources
CREATE POLICY "Teachers manage resource assignments"
    ON public.resource_assignments FOR ALL
    USING (
        resource_id IN (
            SELECT id FROM public.resources 
            WHERE tutor_id = auth.uid()
        )
    )
    WITH CHECK (
        resource_id IN (
            SELECT id FROM public.resources 
            WHERE tutor_id = auth.uid()
        )
    );

-- ============================================================================
-- PHASE 5: PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON public.assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tutor_id ON public.assignments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_resources_tutor_id ON public.resources(tutor_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_student_id ON public.resource_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource_id ON public.resource_assignments(resource_id);