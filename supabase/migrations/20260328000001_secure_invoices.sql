-- 1. Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Update invoices table
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_provider TEXT NOT NULL,
  provider_order_id TEXT UNIQUE NOT NULL,
  provider_reference TEXT,
  provider_redirect_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_invoice_payments_updated_at ON invoice_payments;
CREATE TRIGGER update_invoice_payments_updated_at
  BEFORE UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tutor_id ON invoices(tutor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_provider_order_id ON invoice_payments(provider_order_id);

-- 5. Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for invoices
DROP POLICY IF EXISTS "Tutors can view own invoices" ON invoices;
CREATE POLICY "Tutors can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = tutor_id);

DROP POLICY IF EXISTS "Tutors can insert own invoices" ON invoices;
CREATE POLICY "Tutors can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = tutor_id);

DROP POLICY IF EXISTS "Tutors can update own invoices" ON invoices;
CREATE POLICY "Tutors can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = tutor_id);

DROP POLICY IF EXISTS "Tutors can delete own invoices" ON invoices;
CREATE POLICY "Tutors can delete own invoices" ON invoices
  FOR DELETE USING (auth.uid() = tutor_id);

-- 7. RLS Policies for invoice_payments
-- Tutors can read payments for their own invoices
DROP POLICY IF EXISTS "Tutors can view payments for own invoices" ON invoice_payments;
CREATE POLICY "Tutors can view payments for own invoices" ON invoice_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_payments.invoice_id 
      AND invoices.tutor_id = auth.uid()
    )
  );
-- No insert/update/delete policies for invoice_payments. 
-- Only the backend (Service Role) can mutate this table.
