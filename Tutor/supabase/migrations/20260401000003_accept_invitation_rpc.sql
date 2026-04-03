-- Function to accept an invitation securely
CREATE OR REPLACE FUNCTION accept_student_invitation(invitation_token text, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inv_record RECORD;
BEGIN
    -- Find the pending invitation
    SELECT * INTO inv_record 
    FROM public.student_invitations 
    WHERE token = invitation_token AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    IF inv_record.expires_at < now() THEN
        UPDATE public.student_invitations SET status = 'expired' WHERE id = inv_record.id;
        RAISE EXCEPTION 'Invitation has expired';
    END IF;

    -- Update the invitation status
    UPDATE public.student_invitations 
    SET status = 'accepted', accepted_at = now() 
    WHERE id = inv_record.id;

    -- Link the student to the profile
    UPDATE public.students 
    SET profile_id = new_user_id 
    WHERE id = inv_record.student_id;

    RETURN true;
END;
$$;
