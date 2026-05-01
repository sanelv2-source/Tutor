-- Restore access policies needed by TutorFlyt app flows after security cleanup.
--
-- The security hardening migrations removed broad policies, but a few client
-- flows still need narrowly-scoped access for invitations, student tasks, and
-- files referenced by database rows.

-- Students accepting an invitation must be able to mark their own invitation
-- accepted after they have signed up/logged in with the invited email.
DROP POLICY IF EXISTS "Students can accept addressed invitations" ON public.student_invitations;
CREATE POLICY "Students can accept addressed invitations"
ON public.student_invitations
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND lower(email) = lower(auth.email())
)
WITH CHECK (
  lower(email) = lower(auth.email())
  AND status IN ('pending', 'accepted', 'expired')
);

-- The student dashboard has a remove action for the student's own assignments.
DROP POLICY IF EXISTS "Students can delete their assignments" ON public.assignments;
CREATE POLICY "Students can delete their assignments"
ON public.assignments
FOR DELETE
TO authenticated
USING (
  student_id IN (
    SELECT s.id
    FROM public.students s
    WHERE s.profile_id = auth.uid()
  )
);

-- Resource files can be attached to assignments or resource rows. Public URLs
-- are used in the UI, but authenticated SELECT policies are still needed for
-- projects/buckets that are not fully public or when Storage enforces object
-- access before serving known URLs.
DROP POLICY IF EXISTS "Assigned users can read resource objects" ON storage.objects;
CREATE POLICY "Assigned users can read resource objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.resources r
      WHERE r.file_path = storage.objects.name
        AND (
          r.tutor_id = auth.uid()
          OR public.is_tutorflyt_assigned_resource(r.id)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.students s ON s.id = a.student_id
      WHERE a.attachment_path = storage.objects.name
        AND (
          a.tutor_id = auth.uid()
          OR s.profile_id = auth.uid()
        )
    )
  )
);

-- Make submission file access match the submissions table access. The earlier
-- policy only matched tutor access through a public URL string; keep that path
-- but add exact object-name checks for both student and tutor.
DROP POLICY IF EXISTS "Users can read related submission objects" ON storage.objects;
CREATE POLICY "Users can read related submission objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.submissions sub
      JOIN public.students s ON s.id = sub.student_id
      WHERE (
          sub.file_url LIKE '%' || storage.objects.name
          OR sub.file_url LIKE '%' || replace(storage.objects.name, '/', '%2F')
        )
        AND (
          sub.tutor_id = auth.uid()
          OR s.profile_id = auth.uid()
        )
    )
  )
);

-- Keep avatars visible to signed-in users. The UI uses public avatar URLs in
-- profile surfaces, and restricting this to owner-only hides other users'
-- avatars in teacher/student views.
DROP POLICY IF EXISTS "Authenticated users can read avatar objects" ON storage.objects;
CREATE POLICY "Authenticated users can read avatar objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');
