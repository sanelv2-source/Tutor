-- Resolve Supabase security advisor errors for public profiles/students.
-- Policies already exist; this enables RLS enforcement on the tables.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
