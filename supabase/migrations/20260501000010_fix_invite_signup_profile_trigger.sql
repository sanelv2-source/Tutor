-- Keep invite signup from failing inside the auth user trigger.
--
-- Supabase Auth reports "Database error saving new user" when any trigger on
-- auth.users or profiles throws. Student invite signup creates a student
-- profile, then links existing tutor/student relationship rows by e-mail. That
-- linking must be conflict-safe now that students can belong to multiple tutors.

CREATE OR REPLACE FUNCTION public.link_student_profile()
RETURNS trigger AS $$
BEGIN
  IF new.role = 'student' THEN
    UPDATE public.students s
    SET profile_id = new.id
    WHERE lower(trim(s.email)) = lower(trim(new.email))
      AND s.profile_id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.students existing
        WHERE existing.tutor_id = s.tutor_id
          AND existing.profile_id = new.id
      );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'tutor');

  IF requested_role NOT IN ('tutor', 'student', 'admin') THEN
    requested_role := 'tutor';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''),
      NULLIF(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    requested_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    role = COALESCE(public.profiles.role, EXCLUDED.role);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created_or_updated ON public.profiles;
CREATE TRIGGER on_profile_created_or_updated
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_student_profile();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_student_profile() FROM PUBLIC, anon;
