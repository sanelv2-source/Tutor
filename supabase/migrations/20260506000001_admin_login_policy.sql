-- Lock the admin surface to one known admin mailbox and force the temporary
-- bootstrap password to be changed before the admin dashboard can be used.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

UPDATE public.profiles
SET role = 'tutor'
WHERE role = 'admin'
  AND lower(trim(email)) <> 'info@tutorflyt.no';

INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  subscription_status,
  force_password_change
)
SELECT
  au.id,
  lower(trim(au.email)),
  COALESCE(au.raw_user_meta_data->>'full_name', 'Tutorflyt Admin'),
  'admin',
  'active',
  true
FROM auth.users au
WHERE lower(trim(au.email)) = 'info@tutorflyt.no'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = 'admin',
  subscription_status = 'active',
  force_password_change = CASE
    WHEN public.profiles.password_changed_at IS NULL THEN true
    ELSE public.profiles.force_password_change
  END;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.role = 'admin'
        AND lower(trim(p.email)) = 'info@tutorflyt.no'
        AND COALESCE(p.force_password_change, false) = false
      FROM public.profiles p
      WHERE p.id = user_id
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
