-- ═══════════════════════════════════════════════════════════════
-- TIPPD Migration: Add 30yd support, update Metro Waste, add transfer stations
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Add 30yd to dumpster size constraint ───
ALTER TABLE dumpsters DROP CONSTRAINT IF EXISTS dumpsters_size_check;
ALTER TABLE dumpsters ADD CONSTRAINT dumpsters_size_check CHECK (size IN ('10yd', '20yd', '30yd'));

-- ─── 2. Add 30yd to booking_funnel_events ───
ALTER TABLE booking_funnel_events DROP CONSTRAINT IF EXISTS booking_funnel_events_job_size_check;
ALTER TABLE booking_funnel_events ADD CONSTRAINT booking_funnel_events_job_size_check CHECK (job_size IN ('10yd', '20yd', '30yd'));

-- ─── 3. Add base_rate_30yd and overage columns to operators ───
ALTER TABLE operators ADD COLUMN IF NOT EXISTS base_rate_30yd decimal DEFAULT 500.00;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS weight_included_10yd decimal DEFAULT 4000;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS weight_included_20yd decimal DEFAULT 8000;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS weight_included_30yd decimal DEFAULT 8000;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS overage_rate_per_ton decimal DEFAULT 150.00;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS yard_address text;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS yard_lat decimal;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS yard_lng decimal;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS service_radius_miles integer DEFAULT 30;

-- ─── 4. Update Metro Waste operator ───
UPDATE operators
SET
  name = 'Metro Waste',
  phone = '(908) 725-0456',
  address = '1 Drake Street, Bound Brook, NJ 08805',
  yard_address = '1 Drake Street, Bound Brook, NJ 08805',
  yard_lat = 40.5683,
  yard_lng = -74.5384,
  service_area_description = 'Central New Jersey — Branchburg, Bridgewater, Somerville, Hillsborough and surrounding areas within 30 miles',
  primary_color = '#1B3A6B',
  accent_color = '#6DB33F',
  base_rate_10yd = 550.00,
  base_rate_20yd = 750.00,
  base_rate_30yd = 850.00,
  weight_included_10yd = 4000,
  weight_included_20yd = 4000,
  weight_included_30yd = 4000,
  overage_rate_per_ton = 150.00,
  standard_rental_days = 7,
  daily_overage_rate = 25.00
WHERE slug = 'metro-waste' OR name LIKE '%Metro%'
  OR id = 'd216a6c0-d75d-4f87-a258-e8f0a6ce1328';

-- ─── 5. Clear old dump locations and add real NJ transfer stations ───
DELETE FROM dump_locations WHERE operator_id = 'd216a6c0-d75d-4f87-a258-e8f0a6ce1328';

INSERT INTO dump_locations (operator_id, name, address, lat, lng, cost_per_ton, estimated_wait_minutes, is_active) VALUES
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'Bridgewater Resources, Inc.', '15 Polhemus Lane, Bridgewater, NJ 08807', 40.5580, -74.5432, 85.00, 20, true),
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'RSNJ, LLC - Middlesex', '92 Baekeland Ave, Middlesex, NJ 08846', 40.5724, -74.4935, 82.00, 25, true),
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'RSNJ, LLC - So. Plainfield (Harmich)', '11 Harmich Rd, South Plainfield, NJ 07080', 40.5650, -74.4150, 80.00, 30, true),
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'RSNJ, LLC - So. Plainfield (Roosevelt)', '2101 Roosevelt Ave, South Plainfield, NJ 07080', 40.5700, -74.4200, 80.00, 25, true),
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'Hunterdon County Utilities Authority', 'Petticoat Lane, Flemington, NJ 08822', 40.5127, -74.8590, 78.00, 15, true),
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'RSNJ, LLC - New Brunswick', '5 Industrial Drive, New Brunswick, NJ 08901', 40.4862, -74.4518, 82.00, 35, true),
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'Plainfield City Transfer', 'Rock Ave, Plainfield, NJ 07060', 40.6200, -74.4100, 85.00, 20, true),
  ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'Waste Mgmt. NJ - Elizabeth', 'Amboy Ave & Front St, Elizabeth, NJ 07202', 40.6640, -74.2050, 90.00, 40, true);
