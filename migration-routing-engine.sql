-- ═══════════════════════════════════════════════════════════════
-- TIPPD Routing Engine — Database Migration
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Route Segments Table ───
CREATE TABLE IF NOT EXISTS route_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE,
  truck_id uuid NOT NULL REFERENCES trucks(id),
  driver_id uuid REFERENCES users(id),
  operator_id uuid NOT NULL REFERENCES operators(id),
  sequence_number integer NOT NULL,
  segment_type text NOT NULL CHECK (segment_type IN (
    'yard_depart', 'drop', 'pickup', 'dump', 'yard_return', 'lunch', 'reposition'
  )),
  job_id uuid REFERENCES jobs(id),
  dump_location_id uuid REFERENCES dump_locations(id),

  from_lat decimal,
  from_lng decimal,
  from_address text,
  to_lat decimal,
  to_lng decimal,
  to_address text,

  -- Planning estimates
  planned_drive_miles decimal DEFAULT 0,
  planned_drive_minutes integer DEFAULT 0,
  planned_stop_minutes integer DEFAULT 0,
  planned_depart_time timestamptz,
  planned_arrive_time timestamptz,

  -- Actuals (filled by driver app)
  actual_depart_time timestamptz,
  actual_arrive_time timestamptz,
  actual_stop_minutes integer,
  actual_drive_minutes integer,

  -- 5-bucket scoring
  score_time decimal DEFAULT 0,
  score_miles decimal DEFAULT 0,
  score_cost decimal DEFAULT 0,
  score_inventory decimal DEFAULT 0,
  score_service_risk decimal DEFAULT 0,

  -- Box tracking
  box_id uuid REFERENCES dumpsters(id),
  box_size text,
  box_condition_before text,
  box_condition_after text,
  box_reused boolean DEFAULT false,
  box_action text CHECK (box_action IN (
    'loaded_from_yard', 'picked_up', 'dropped', 'dumped',
    'returned_to_yard', 'pulled_from_service', 'skip_dump_half_full'
  )),

  -- Decision tracking
  decision_made text,
  decision_reason text,

  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped', 'rerouted')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_route_segments_route ON route_segments(route_id);
CREATE INDEX idx_route_segments_truck ON route_segments(truck_id);
CREATE INDEX idx_route_segments_job ON route_segments(job_id);
CREATE INDEX idx_route_segments_operator ON route_segments(operator_id);

ALTER TABLE route_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON route_segments
  FOR ALL USING (operator_id = public.get_operator_id());

-- ─── 2. Route Learning Table ───
CREATE TABLE IF NOT EXISTS route_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id),
  segment_type text NOT NULL,
  entity_id uuid,
  driver_id uuid REFERENCES users(id),
  box_size text,
  material_type text,
  time_of_day text CHECK (time_of_day IN ('morning', 'midday', 'afternoon', 'evening')),
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),

  planned_minutes integer NOT NULL,
  actual_minutes integer NOT NULL,
  variance_minutes integer GENERATED ALWAYS AS (actual_minutes - planned_minutes) STORED,
  planned_miles decimal,
  actual_miles decimal,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_route_learning_operator ON route_learning(operator_id);
CREATE INDEX idx_route_learning_type ON route_learning(operator_id, segment_type);
CREATE INDEX idx_route_learning_entity ON route_learning(entity_id);

ALTER TABLE route_learning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON route_learning
  FOR ALL USING (operator_id = public.get_operator_id());

-- ─── 3. Driver State Table (real-time tracking) ───
CREATE TABLE IF NOT EXISTS driver_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id),
  truck_id uuid REFERENCES trucks(id),
  operator_id uuid NOT NULL REFERENCES operators(id),
  route_id uuid REFERENCES routes(id),
  current_lat decimal,
  current_lng decimal,
  current_segment_id uuid REFERENCES route_segments(id),
  status text DEFAULT 'off_duty' CHECK (status IN (
    'at_yard', 'driving', 'at_customer', 'at_dump', 'on_break', 'off_duty'
  )),
  last_updated timestamptz DEFAULT now(),
  heading decimal,
  speed_mph decimal,
  UNIQUE(driver_id)
);

CREATE INDEX idx_driver_state_operator ON driver_state(operator_id);

ALTER TABLE driver_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON driver_state
  FOR ALL USING (operator_id = public.get_operator_id());

-- ─── 4. Weigh Stations Table (build for, populate later) ───
CREATE TABLE IF NOT EXISTS weigh_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  lat decimal,
  lng decimal,
  direction text,
  hours text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ─── 5. Route Scoring Config (per operator) ───
CREATE TABLE IF NOT EXISTS route_scoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id) UNIQUE,
  -- Default weights (must sum to 1.0)
  weight_time decimal DEFAULT 0.25,
  weight_miles decimal DEFAULT 0.25,
  weight_cost decimal DEFAULT 0.20,
  weight_inventory decimal DEFAULT 0.15,
  weight_service_risk decimal DEFAULT 0.15,
  -- Operating mode
  active_mode text DEFAULT 'balanced' CHECK (active_mode IN (
    'balanced', 'maximize_jobs', 'protect_ontime',
    'minimize_overtime', 'reduce_dump_cost', 'clear_aged_boxes'
  )),
  -- Time constants (initial, overridden by learning)
  default_drop_minutes integer DEFAULT 20,
  default_pickup_minutes integer DEFAULT 20,
  default_dump_minutes integer DEFAULT 25,
  default_lunch_minutes integer DEFAULT 30,
  max_shift_minutes integer DEFAULT 480,
  -- Learning thresholds
  learning_min_samples integer DEFAULT 30,
  use_learned_times boolean DEFAULT false,
  -- Weather override
  severe_weather_active boolean DEFAULT false,
  severe_weather_note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE route_scoring_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON route_scoring_config
  FOR ALL USING (operator_id = public.get_operator_id());

-- Seed default config for Metro Waste
INSERT INTO route_scoring_config (operator_id) VALUES ('d216a6c0-d75d-4f87-a258-e8f0a6ce1328')
ON CONFLICT (operator_id) DO NOTHING;

-- ─── 6. Add customer access fields ───
ALTER TABLE customers ADD COLUMN IF NOT EXISTS access_restrictions text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_time text CHECK (preferred_time IN ('morning', 'afternoon', 'anytime'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS no_early_am boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_instructions text;

-- ─── 7. Expand dumpster status to include ready_pickup and loaded ───
ALTER TABLE dumpsters DROP CONSTRAINT IF EXISTS dumpsters_status_check;
ALTER TABLE dumpsters ADD CONSTRAINT dumpsters_status_check CHECK (status IN (
  'available', 'assigned', 'loaded', 'deployed', 'ready_pickup',
  'returning', 'at_dump', 'in_yard', 'repair', 'retired'
));

-- ─── 8. Add route operating mode to routes table ───
ALTER TABLE routes ADD COLUMN IF NOT EXISTS operating_mode text DEFAULT 'balanced';
ALTER TABLE routes ADD COLUMN IF NOT EXISTS lunch_taken_at timestamptz;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS weather_override boolean DEFAULT false;

-- ─── 9. Initialize driver state for Eddie ───
INSERT INTO driver_state (driver_id, operator_id, status)
VALUES ('56bfa576-aecf-4f5b-9cb0-669ef66d0fc3', 'd216a6c0-d75d-4f87-a258-e8f0a6ce1328', 'off_duty')
ON CONFLICT (driver_id) DO NOTHING;
