-- Fix student update policies to maintain both linking functionality and last_seen_at updates

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Students can update their own profile_id and last_seen_at" ON public.students;

-- Recreate the correct policies

-- Students can update their profile_id during linking (original functionality)
CREATE POLICY "Students can update their own profile_id during linking"
    ON public.students FOR UPDATE
    USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    WITH CHECK (profile_id = auth.uid());

-- Students can update their last_seen_at when logging in
CREATE POLICY "Students can update their own last_seen_at"
    ON public.students FOR UPDATE
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());