-- Create vacations table for teacher vacation/holiday events
CREATE TABLE IF NOT EXISTS public.vacations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tutor_id, date)
);

-- Enable RLS
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vacations
-- Tutors can manage their own vacations
CREATE POLICY "Tutors can manage their own vacations" ON public.vacations
    FOR ALL
    USING (auth.uid() = tutor_id)
    WITH CHECK (auth.uid() = tutor_id);

-- Students can read vacations from their tutor
CREATE POLICY "Students can read their tutor's vacations" ON public.vacations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.profile_id = auth.uid()
            AND s.tutor_id = vacations.tutor_id
        )
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vacations_tutor_id ON public.vacations(tutor_id);
CREATE INDEX IF NOT EXISTS idx_vacations_date ON public.vacations(date);