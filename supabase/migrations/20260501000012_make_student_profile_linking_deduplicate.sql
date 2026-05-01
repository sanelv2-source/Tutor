-- Make student profile linking tolerate duplicate pending student rows.
--
-- Some live data can contain multiple unlinked rows for the same tutor/e-mail
-- from earlier failed invite attempts. Linking every matching row to the same
-- profile would violate the tutor/profile unique index. Link only one row per
-- tutor; tutors can clean up duplicate unlinked rows separately.

CREATE OR REPLACE FUNCTION public.link_student_profile()
RETURNS trigger AS $$
BEGIN
  IF new.role = 'student' THEN
    WITH candidates AS (
      SELECT DISTINCT ON (s.tutor_id) s.id
      FROM public.students s
      WHERE lower(trim(s.email)) = lower(trim(new.email))
        AND s.profile_id IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.students existing
          WHERE existing.tutor_id = s.tutor_id
            AND existing.profile_id = new.id
        )
      ORDER BY s.tutor_id, s.created_at DESC NULLS LAST, s.id
    )
    UPDATE public.students s
    SET profile_id = new.id
    FROM candidates c
    WHERE s.id = c.id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS on_profile_created_or_updated ON public.profiles;
CREATE TRIGGER on_profile_created_or_updated
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_student_profile();

REVOKE ALL ON FUNCTION public.link_student_profile() FROM PUBLIC, anon;
