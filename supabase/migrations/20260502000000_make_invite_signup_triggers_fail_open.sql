-- Prevent database triggers from blocking Supabase Auth signup.
--
-- Auth surfaces trigger failures as "Database error saving new user". The app
-- can finish invitation linking after signup, so profile/student linking should
-- be best-effort and must never abort auth.users inserts.

CREATE OR REPLACE FUNCTION public.link_student_profile()
RETURNS trigger AS $$
BEGIN
  IF new.role = 'student' THEN
    BEGIN
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
        ORDER BY s.tutor_id, s.id
      )
      UPDATE public.students s
      SET profile_id = new.id
      FROM candidates c
      WHERE s.id = c.id;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'link_student_profile skipped for profile %, email %: %', new.id, new.email, SQLERRM;
    END;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role text;
  fallback_name text;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'tutor');

  IF requested_role NOT IN ('tutor', 'student', 'admin') THEN
    requested_role := 'tutor';
  END IF;

  fallback_name := COALESCE(
    NULLIF(new.raw_user_meta_data->>'full_name', ''),
    NULLIF(new.raw_user_meta_data->>'name', ''),
    split_part(new.email, '@', 1)
  );

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new.id, new.email, fallback_name, requested_role)
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      role = COALESCE(public.profiles.role, EXCLUDED.role);
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.profiles
    SET
      id = new.id,
      full_name = COALESCE(public.profiles.full_name, fallback_name),
      role = COALESCE(public.profiles.role, requested_role)
    WHERE lower(trim(email)) = lower(trim(new.email));
  WHEN others THEN
    RAISE WARNING 'handle_new_user profile sync skipped for auth user %, email %: %', new.id, new.email, SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_link_student_profile_on_profile_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.link_student_profile_on_profile_insert();

DROP TRIGGER IF EXISTS on_profile_created_or_updated ON public.profiles;
CREATE TRIGGER on_profile_created_or_updated
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_student_profile();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_student_profile() FROM PUBLIC, anon;
