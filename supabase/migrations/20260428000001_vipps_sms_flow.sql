ALTER TABLE students
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_phone TEXT,
  ADD COLUMN IF NOT EXISTS tutor_phone TEXT,
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT;

DROP POLICY IF EXISTS "Students can view own invoices" ON invoices;
CREATE POLICY "Students can view own invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.profile_id = auth.uid()
        AND (
          students.id = invoices.student_id
          OR (
            students.tutor_id = invoices.tutor_id
            AND students.full_name = invoices.student_name
          )
        )
    )
  );
