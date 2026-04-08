-- Migration: Deposit system for dumpster bookings
-- Adds deposit tracking, Stripe payment method storage, and T&C acceptance to jobs table

-- Deposit columns on jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS deposit_amount decimal DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'none'
    CHECK (deposit_status IN ('none', 'pending', 'charged', 'refunded', 'forfeited')),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_setup_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Index for finding jobs with pending deposits (operator dashboard)
CREATE INDEX IF NOT EXISTS idx_jobs_deposit_status ON jobs(operator_id, deposit_status)
  WHERE deposit_status != 'none';
