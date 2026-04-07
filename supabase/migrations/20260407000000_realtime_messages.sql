-- Ensure messages table is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

-- Create a robust security definer function for checking conversation access
CREATE OR REPLACE FUNCTION public.is_user_in_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.students s ON c.student_id = s.id
    WHERE c.id = conv_id
    AND (c.tutor_id = auth.uid() OR s.profile_id = auth.uid())
  );
$$;

-- Update the SELECT policy to use the new function (more reliable for Realtime)
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING ( public.is_user_in_conversation(conversation_id) );
