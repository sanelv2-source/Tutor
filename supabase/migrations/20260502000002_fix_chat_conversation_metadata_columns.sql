-- Existing projects may already have public.conversations from an older schema.
-- The chat UI and handle_new_message trigger both depend on these metadata
-- columns, so add them idempotently before messages are sent.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message text,
  ADD COLUMN IF NOT EXISTS tutor_unread_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS student_unread_count integer DEFAULT 0;

UPDATE public.conversations
SET
  tutor_unread_count = COALESCE(tutor_unread_count, 0),
  student_unread_count = COALESCE(student_unread_count, 0);

ALTER TABLE public.conversations
  ALTER COLUMN tutor_unread_count SET DEFAULT 0,
  ALTER COLUMN student_unread_count SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  conv_tutor_id uuid;
BEGIN
  SELECT tutor_id
  INTO conv_tutor_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message = NEW.body,
    updated_at = now(),
    tutor_unread_count = CASE
      WHEN NEW.sender_id <> conv_tutor_id THEN COALESCE(tutor_unread_count, 0) + 1
      ELSE COALESCE(tutor_unread_count, 0)
    END,
    student_unread_count = CASE
      WHEN NEW.sender_id = conv_tutor_id THEN COALESCE(student_unread_count, 0) + 1
      ELSE COALESCE(student_unread_count, 0)
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;
