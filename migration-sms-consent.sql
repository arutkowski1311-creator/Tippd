-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: SMS Consent Fields
-- Adds consent tracking to customers table per TCPA/carrier requirements
-- Run in Supabase SQL Editor after migration-v7-exceptions-inspections.sql
-- ═══════════════════════════════════════════════════════════════

alter table customers
  add column if not exists sms_consent boolean default false,
  add column if not exists sms_consent_at timestamptz,
  add column if not exists sms_consent_source text
    check (sms_consent_source in ('booking_form', 'portal_signup', 'driver_onboarding', 'manual')),
  add column if not exists sms_opted_out_at timestamptz;

-- Index for fast opt-out checks before sending SMS
create index if not exists idx_customers_sms_consent
  on customers(operator_id, sms_consent, sms_opted_out_at);
