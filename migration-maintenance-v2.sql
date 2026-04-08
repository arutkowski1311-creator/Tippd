-- ============================================================
-- Migration: Comprehensive truck maintenance tracking
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Expand service_type constraint for all maintenance items
ALTER TABLE truck_service_log DROP CONSTRAINT IF EXISTS truck_service_log_service_type_check;
ALTER TABLE truck_service_log ADD CONSTRAINT truck_service_log_service_type_check
  CHECK (service_type IN (
    'oil_filter',
    'fuel_filter',
    'air_filter',
    'chassis_lube',
    'belts_hoses',
    'transmission',
    'differential',
    'air_dryer',
    'coolant',
    'brakes_inspection',
    'brakes_full_service',
    'suspension',
    'alignment',
    'hydraulic_inspection',
    'hydraulic_filter',
    'hydraulic_fluid',
    'grease_pivots',
    'battery',
    'air_tanks',
    'slack_adjusters',
    'tire_front_left',
    'tire_front_right',
    'tire_rear_1',
    'tire_rear_2',
    'tire_rear_3',
    'tire_rear_4',
    'tire_rear_5',
    'tire_rear_6',
    'tire_rear_7',
    'tire_rear_8',
    'dot_inspection',
    'frame_inspection',
    'electrical',
    'def_system',
    'exhaust_dpf',
    'registration',
    'state_inspection',
    'other'
  ));

-- 2. Add hours tracking to trucks
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS current_hours integer DEFAULT 0;

-- 3. Create maintenance_settings table (user-configurable intervals per truck)
CREATE TABLE IF NOT EXISTS maintenance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES operators(id),
  service_type text NOT NULL,
  mile_interval integer, -- miles between service (null = time/hours only)
  hour_interval integer, -- hours between service (null = miles/time only)
  day_interval integer,  -- days between service (null = miles/hours only)
  warning_miles integer DEFAULT 500,   -- yellow warning this many miles before due
  warning_days integer DEFAULT 14,     -- yellow warning this many days before due
  current_miles_since integer DEFAULT 0, -- miles since last service (user sets initial)
  current_hours_since integer DEFAULT 0, -- hours since last service
  last_service_date date,
  last_service_miles integer,
  last_service_hours integer,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(truck_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_settings_truck ON maintenance_settings(truck_id);

-- Enable RLS
ALTER TABLE maintenance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON maintenance_settings
  FOR ALL USING (operator_id = public.get_operator_id());

-- 4. Create tire_tracking table (individual tire scoring)
CREATE TABLE IF NOT EXISTS tire_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES operators(id),
  position text NOT NULL CHECK (position IN (
    'front_left', 'front_right',
    'rear_1', 'rear_2', 'rear_3', 'rear_4',
    'rear_5', 'rear_6', 'rear_7', 'rear_8'
  )),
  brand text,
  installed_date date,
  installed_miles integer,
  current_tread_depth decimal, -- 32nds of an inch (new = 20-24, replace at 4)
  condition text DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'worn', 'replace')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(truck_id, position)
);

CREATE INDEX IF NOT EXISTS idx_tire_tracking_truck ON tire_tracking(truck_id);

ALTER TABLE tire_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON tire_tracking
  FOR ALL USING (operator_id = public.get_operator_id());
