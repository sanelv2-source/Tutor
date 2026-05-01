-- Support students being connected to multiple tutors.
--
-- A row in public.students represents a tutor/student relationship. The same
-- student profile or e-mail can therefore appear for multiple tutors, but each
-- tutor should only have one row for that student.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_profile_id_unique_idx'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students DROP CONSTRAINT students_profile_id_unique_idx;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'idx_students_profile_id_unique'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students DROP CONSTRAINT idx_students_profile_id_unique;
  END IF;
END $$;

DROP INDEX IF EXISTS public.students_profile_id_unique_idx;
DROP INDEX IF EXISTS public.idx_students_profile_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_tutor_profile_unique
ON public.students (tutor_id, profile_id)
WHERE profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.link_student_profile()
RETURNS trigger AS $$
BEGIN
  IF new.role = 'student' THEN
    UPDATE public.students
    SET profile_id = new.id
    WHERE lower(trim(email)) = lower(trim(new.email))
      AND profile_id IS NULL;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.link_student_to_profile()
RETURNS trigger AS $$
BEGIN
  IF new.profile_id IS NULL THEN
    new.profile_id := (
      SELECT id
      FROM public.profiles
      WHERE lower(trim(email)) = lower(trim(new.email))
        AND role = 'student'
      LIMIT 1
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION public.link_student_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_student_to_profile() FROM PUBLIC, anon;
