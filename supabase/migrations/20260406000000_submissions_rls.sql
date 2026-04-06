-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can insert their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Tutors can view submissions for their assignments" ON public.submissions;

-- 1. Students can insert their own submissions
CREATE POLICY "Students can insert their own submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students WHERE profile_id = auth.uid()
  )
);

-- 2. Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students WHERE profile_id = auth.uid()
  )
);

-- 3. Tutors can view submissions for their own assignments
CREATE POLICY "Tutors can view submissions for their assignments"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  tutor_id = auth.uid()
);

-- Storage policies for submissions bucket
-- First ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can upload submissions" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read submissions" ON storage.objects;

-- Allow authenticated users to upload files to submissions
CREATE POLICY "Authenticated users can upload submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read files from submissions
CREATE POLICY "Authenticated users can read submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
);
