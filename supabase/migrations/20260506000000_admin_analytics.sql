-- Internal product analytics for the admin dashboard.
-- Events are intentionally low-detail and aggregated in the admin UI.

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
      FROM public.profiles p
      WHERE p.id = user_id
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_events_event_name_check'
      AND conrelid = 'public.analytics_events'::regclass
  ) THEN
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
          'subscription_started'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_events_metadata_object_check'
      AND conrelid = 'public.analytics_events'::regclass
  ) THEN
    ALTER TABLE public.analytics_events
      ADD CONSTRAINT analytics_events_metadata_object_check
      CHECK (jsonb_typeof(metadata) = 'object');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created_at
  ON public.analytics_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id_created_at
  ON public.analytics_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

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
