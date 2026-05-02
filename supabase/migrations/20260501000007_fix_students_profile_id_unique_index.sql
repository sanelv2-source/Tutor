-- Fix unique index on students.profile_id.
--
-- Multiple invited students can have profile_id = NULL until they accept an
-- invitation. A non-partial unique index treats all NULLs as conflicting in the
-- affected live database, which breaks inviting more than one unregistered
-- student. Keep uniqueness only for linked student profiles.

DROP INDEX IF EXISTS public.students_profile_id_unique_idx;
DROP INDEX IF EXISTS public.idx_students_profile_id_unique;

CREATE UNIQUE INDEX idx_students_profile_id_unique
ON public.students (profile_id)
WHERE profile_id IS NOT NULL;
