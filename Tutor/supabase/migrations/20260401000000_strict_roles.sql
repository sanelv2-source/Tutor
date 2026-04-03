-- Add role to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text CHECK (role IN ('tutor', 'student', 'admin'));
    END IF;
END $$;

-- Add profile_id to students if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'profile_id') THEN
        ALTER TABLE public.students ADD COLUMN profile_id uuid REFERENCES public.profiles(id);
    END IF;
END $$;

-- Create index for profile_id on students
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);

-- Update RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on profiles if any to recreate them cleanly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Tutors can view their students profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Tutors can view profiles of students linked to them
CREATE POLICY "Tutors can view their students profiles" 
    ON public.profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.students 
            WHERE students.profile_id = profiles.id 
            AND students.tutor_id = auth.uid()
        )
    );

-- Update RLS policies for students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can view their own students" ON public.students;
DROP POLICY IF EXISTS "Tutors can insert their own students" ON public.students;
DROP POLICY IF EXISTS "Tutors can update their own students" ON public.students;
DROP POLICY IF EXISTS "Tutors can delete their own students" ON public.students;
DROP POLICY IF EXISTS "Students can view their own student record" ON public.students;
DROP POLICY IF EXISTS "Students can update their own profile_id" ON public.students;

CREATE POLICY "Tutors can view their own students" 
    ON public.students FOR SELECT 
    USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can insert their own students" 
    ON public.students FOR INSERT 
    WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can update their own students" 
    ON public.students FOR UPDATE 
    USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can delete their own students" 
    ON public.students FOR DELETE 
    USING (tutor_id = auth.uid());

CREATE POLICY "Students can view their own student record" 
    ON public.students FOR SELECT 
    USING (profile_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Students can update their own profile_id" 
    ON public.students FOR UPDATE 
    USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    WITH CHECK (profile_id = auth.uid());

-- Update RLS policies for assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can view their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can insert their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can update their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Tutors can delete their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can update their own assignments" ON public.assignments;

CREATE POLICY "Tutors can view their assignments" 
    ON public.assignments FOR SELECT 
    USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can insert their assignments" 
    ON public.assignments FOR INSERT 
    WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can update their assignments" 
    ON public.assignments FOR UPDATE 
    USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can delete their assignments" 
    ON public.assignments FOR DELETE 
    USING (tutor_id = auth.uid());

CREATE POLICY "Students can view their own assignments" 
    ON public.assignments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.students 
            WHERE students.id = assignments.student_id 
            AND students.profile_id = auth.uid()
        )
    );

CREATE POLICY "Students can update their own assignments" 
    ON public.assignments FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.students 
            WHERE students.id = assignments.student_id 
            AND students.profile_id = auth.uid()
        )
    );
