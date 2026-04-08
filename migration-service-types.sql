-- ============================================================
-- Migration: Expand truck_service_log.service_type check constraint
-- to support granular maintenance tracking categories.
-- ============================================================

-- Drop the existing constraint
ALTER TABLE truck_service_log DROP CONSTRAINT IF EXISTS truck_service_log_service_type_check;

-- Add new constraint with expanded service types
ALTER TABLE truck_service_log ADD CONSTRAINT truck_service_log_service_type_check
  CHECK (service_type IN (
    'oil',
    'transmission',
    'hydraulics',
    'brakes',
    'brake_pads',
    'tires',
    'tire_rotation',
    'exhaust_dpf',
    'coolant',
    'air_filter',
    'fuel_filter',
    'bearings',
    'dot_inspection',
    'registration',
    'inspection',
    'other'
  ));
