-- ═══════════════════════════════════════════════════════════════
-- TIPPD — Add document numbers to quotes & invoices
-- Run this in Supabase SQL Editor after the base schema
-- ═══════════════════════════════════════════════════════════════

-- Quote numbers (E1000, E1001, ... with optional -R1 revision suffix)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_number ON quotes(operator_id, quote_number);

-- Invoice numbers (P1000, P1001, ...)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(operator_id, invoice_number);
