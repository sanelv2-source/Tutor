-- Scope student e-mail uniqueness to each tutor.
--
-- The app allows tutors to invite/manage their own students and checks for
-- existing students by (tutor_id, email). A global unique index on students.email
-- blocks inviting an address that already exists for another tutor or stale row.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_email_unique_idx'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students DROP CONSTRAINT students_email_unique_idx;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'idx_students_email_unique'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students DROP CONSTRAINT idx_students_email_unique;
  END IF;
END $$;

DROP INDEX IF EXISTS public.students_email_unique_idx;
DROP INDEX IF EXISTS public.idx_students_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_tutor_email_unique
ON public.students (tutor_id, lower(trim(email)))
WHERE email IS NOT NULL;
