-- Add profile_id to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    last_message TEXT,
    tutor_unread_count INTEGER DEFAULT 0,
    student_unread_count INTEGER DEFAULT 0,
    UNIQUE(tutor_id, student_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_tutor_id ON public.conversations(tutor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Tutors can view their own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = tutor_id);

CREATE POLICY "Students can view their own conversations"
    ON public.conversations FOR SELECT
    USING (
        auth.uid() IN (
            SELECT profile_id FROM public.students WHERE id = student_id
        )
    );

CREATE POLICY "Tutors can insert conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Students can insert conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT profile_id FROM public.students WHERE id = student_id
        )
    );

CREATE POLICY "Tutors can update their own conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = tutor_id);

CREATE POLICY "Students can update their own conversations"
    ON public.conversations FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT profile_id FROM public.students WHERE id = student_id
        )
    );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE tutor_id = auth.uid() OR student_id IN (
                SELECT id FROM public.students WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE tutor_id = auth.uid() OR student_id IN (
                SELECT id FROM public.students WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update messages (e.g., mark as read)"
    ON public.messages FOR UPDATE
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE tutor_id = auth.uid() OR student_id IN (
                SELECT id FROM public.students WHERE profile_id = auth.uid()
            )
        )
    );

-- Function to update conversation last_message_at and updated_at
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    conv_tutor_id UUID;
BEGIN
    SELECT tutor_id INTO conv_tutor_id FROM public.conversations WHERE id = NEW.conversation_id;

    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message = NEW.body,
        updated_at = NOW(),
        tutor_unread_count = CASE WHEN NEW.sender_id != conv_tutor_id THEN tutor_unread_count + 1 ELSE tutor_unread_count END,
        student_unread_count = CASE WHEN NEW.sender_id = conv_tutor_id THEN student_unread_count + 1 ELSE student_unread_count END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
