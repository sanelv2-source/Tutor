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

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
