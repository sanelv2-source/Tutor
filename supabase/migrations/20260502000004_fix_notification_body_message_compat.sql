-- Some deployed databases still have the legacy notifications.message column
-- marked NOT NULL. The app now writes body and message for compatibility, but
-- message should remain nullable so older body-only clients do not fail.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS message text;

UPDATE public.notifications
SET
  body = COALESCE(body, message),
  message = COALESCE(message, body)
WHERE body IS NULL OR message IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN message DROP NOT NULL;
