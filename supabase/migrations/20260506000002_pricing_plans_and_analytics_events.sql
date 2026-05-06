-- Pricing plans, internal analytics event coverage, and admin-safe RLS.
-- Existing TutorFlyt roles are tutor/student/admin; plan is tracked separately.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

UPDATE public.profiles
SET plan = CASE
  WHEN role = 'admin' THEN 'premium'
  WHEN plan IN ('free', 'start', 'pro', 'premium') THEN plan
  WHEN subscription_status = 'active' THEN 'pro'
  ELSE 'free'
END;

UPDATE public.profiles
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN plan SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'start', 'pro', 'premium'));

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_name_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_name_check
  CHECK (
    event_name IN (
      'page_view',
      'signup_completed',
      'onboarding_completed',
      'student_created',
      'lesson_created',
      'invoice_created',
      'calendar_connected',
      'subscription_started',
      'subscription_changed',
      'subscription_cancelled',
      'plan_limit_reached',
      'upgrade_clicked'
    )
  );

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view profiles for analytics" ON public.profiles;
CREATE POLICY "Admins can view profiles for analytics"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can insert internal analytics events" ON public.analytics_events;
CREATE POLICY "Clients can insert internal analytics events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND jsonb_typeof(metadata) = 'object'
  AND octet_length(metadata::text) <= 8192
);

DROP POLICY IF EXISTS "Admins can read internal analytics events" ON public.analytics_events;
CREATE POLICY "Admins can read internal analytics events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
