-- Create student_invitations table
CREATE TABLE public.student_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_student_invitations_token ON public.student_invitations(token);
CREATE UNIQUE INDEX idx_student_invitations_pending_student ON public.student_invitations(student_id) WHERE status = 'pending';

-- RLS
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;

-- Tutors can view invitations they created
CREATE POLICY "Tutors can view their own invitations" 
    ON public.student_invitations FOR SELECT 
    USING (tutor_id = auth.uid());

-- Tutors can insert invitations
CREATE POLICY "Tutors can insert invitations" 
    ON public.student_invitations FOR INSERT 
    WITH CHECK (tutor_id = auth.uid());

-- Tutors can update their own invitations (e.g., cancel)
CREATE POLICY "Tutors can update their own invitations" 
    ON public.student_invitations FOR UPDATE 
    USING (tutor_id = auth.uid());

-- Anyone can view an invitation by token (needed for the accept page before login)
CREATE POLICY "Anyone can view invitation by token"
    ON public.student_invitations FOR SELECT
    USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_student_invitations_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_invitations_updated_at
    BEFORE UPDATE ON public.student_invitations
    FOR EACH ROW EXECUTE FUNCTION update_student_invitations_updated_at();
