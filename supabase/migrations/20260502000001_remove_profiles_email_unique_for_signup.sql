-- Do not let stale public.profiles e-mail rows block Auth signup.
--
-- Supabase Auth already enforces user e-mail uniqueness. A separate unique
-- constraint on public.profiles.email can break invited-student signup when a
-- profile row exists from older linking attempts but no auth.users row exists.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS public.profiles_email_key;

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
ON public.profiles (lower(trim(email)))
WHERE email IS NOT NULL;

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
  EXCEPTION WHEN others THEN
    RAISE WARNING 'handle_new_user profile sync skipped for auth user %, email %: %', new.id, new.email, SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
