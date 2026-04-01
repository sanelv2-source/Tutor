-- 1. Bulk SQL update that links students.profile_id to profiles.id where emails match and profile_id is null.
UPDATE students
SET profile_id = subquery.profile_id
FROM (
  SELECT DISTINCT ON (p.id) s.id as student_id, p.id as profile_id
  FROM students s
  JOIN profiles p ON lower(trim(s.email)) = lower(trim(p.email))
  WHERE s.profile_id IS NULL AND p.role = 'student'
  ORDER BY p.id, s.id ASC
) AS subquery
WHERE students.id = subquery.student_id;

-- 2. Add a unique partial index on students.profile_id where profile_id is not null.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_profile_id_unique 
ON students (profile_id) 
WHERE profile_id IS NOT NULL;

-- 3. Ensure a profile row is automatically created for every new auth user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'role'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Add a database trigger so when a new student profile is created, it automatically links to an existing students row with the same email if profile_id is null.
CREATE OR REPLACE FUNCTION public.link_student_profile()
RETURNS trigger AS $$
BEGIN
  IF new.role = 'student' THEN
    UPDATE public.students
    SET profile_id = new.id
    WHERE id = (
      SELECT id FROM public.students
      WHERE lower(trim(email)) = lower(trim(new.email))
        AND profile_id IS NULL
      LIMIT 1
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_or_updated ON public.profiles;
CREATE TRIGGER on_profile_created_or_updated
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_student_profile();

-- 5. Add a database trigger so when a new students row is created, it automatically links to an existing profile with the same email.
CREATE OR REPLACE FUNCTION public.link_student_to_profile()
RETURNS trigger AS $$
BEGIN
  IF new.profile_id IS NULL THEN
    new.profile_id := (
      SELECT id FROM public.profiles
      WHERE lower(trim(email)) = lower(trim(new.email))
        AND role = 'student'
      LIMIT 1
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created
  BEFORE INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.link_student_to_profile();

