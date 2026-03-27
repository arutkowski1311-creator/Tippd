-- ═══════════════════════════════════════════════════════════════
-- Weight Tracking at Dump — captures scale ticket data
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Add weight fields to jobs if not already present
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dump_weight_lbs integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dump_ticket_photo text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS weight_overage_lbs integer DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS weight_overage_charge decimal DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dump_cost decimal DEFAULT 0;
