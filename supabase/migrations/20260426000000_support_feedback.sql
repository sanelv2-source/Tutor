-- Store support and bug feedback sent from tutor/student dashboards.
CREATE TABLE IF NOT EXISTS public.support_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  user_name TEXT,
  user_email TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.support_feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_support_feedback_user_id ON public.support_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_support_feedback_created_at ON public.support_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_feedback_status ON public.support_feedback(status);

ALTER TABLE public.support_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create support feedback" ON public.support_feedback;
CREATE POLICY "Users can create support feedback"
ON public.support_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read their own support feedback" ON public.support_feedback;
CREATE POLICY "Users can read their own support feedback"
ON public.support_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
