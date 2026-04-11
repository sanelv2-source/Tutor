-- Add teacher_comment column to submissions table
ALTER TABLE public.submissions ADD COLUMN teacher_comment TEXT;

-- Update the status to use 'approved' and 'needs_revision' instead of 'approved' and 'rejected'
-- Note: 'approved' stays the same, 'rejected' becomes 'needs_revision'

-- Update existing 'rejected' statuses to 'needs_revision'
UPDATE public.submissions SET status = 'needs_revision' WHERE status = 'rejected';

-- Add policy for teachers to update submissions (for adding comments)
DROP POLICY IF EXISTS "Tutors can update submissions" ON public.submissions;
CREATE POLICY "Tutors can update submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (tutor_id = auth.uid())
WITH CHECK (tutor_id = auth.uid());