-- Create resources table
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'link')),
    file_path TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT file_requires_path CHECK (type = 'link' OR (type = 'file' AND file_path IS NOT NULL)),
    CONSTRAINT link_requires_url CHECK (type = 'file' OR (type = 'link' AND url IS NOT NULL))
);

-- Create resource_assignments table
CREATE TABLE IF NOT EXISTS public.resource_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resource_id, student_id)
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
-- Tutors can manage their own resources
CREATE POLICY "Tutors can manage their own resources" ON public.resources
    FOR ALL
    USING (auth.uid() = tutor_id)
    WITH CHECK (auth.uid() = tutor_id);

-- Students can read resources assigned to them
CREATE POLICY "Students can read assigned resources" ON public.resources
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.resource_assignments ra
            JOIN public.students s ON ra.student_id = s.id
            WHERE ra.resource_id = public.resources.id
            AND s.profile_id = auth.uid()
        )
    );

-- RLS Policies for resource_assignments
-- Tutors can manage assignments for their resources
CREATE POLICY "Tutors can manage assignments for their resources" ON public.resource_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_assignments.resource_id
            AND r.tutor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_assignments.resource_id
            AND r.tutor_id = auth.uid()
        )
    );

-- Students can read their own assignments
CREATE POLICY "Students can read their own assignments" ON public.resource_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = resource_assignments.student_id
            AND s.profile_id = auth.uid()
        )
    );

-- Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Tutors can upload resources" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'resources' AND auth.role() = 'authenticated');

CREATE POLICY "Tutors can update their resources" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'resources' AND auth.uid() = owner);

CREATE POLICY "Tutors can delete their resources" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'resources' AND auth.uid() = owner);

CREATE POLICY "Tutors can read their resources" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'resources' AND auth.uid() = owner);

CREATE POLICY "Authenticated users can read resources" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'resources' AND auth.role() = 'authenticated');
