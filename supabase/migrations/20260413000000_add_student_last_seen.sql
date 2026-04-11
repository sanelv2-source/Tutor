-- Add last_seen_at field to students table for notifications tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'last_seen_at') THEN
        ALTER TABLE public.students ADD COLUMN last_seen_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create index for better performance on last_seen_at queries
CREATE INDEX IF NOT EXISTS idx_students_last_seen_at ON public.students(last_seen_at);

-- Update RLS policy to allow students to update their own last_seen_at
DROP POLICY IF EXISTS "Students can update their own profile_id" ON public.students;

CREATE POLICY "Students can update their own profile_id and last_seen_at" ON public.students
    FOR UPDATE
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());