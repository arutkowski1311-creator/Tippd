-- ═══════════════════════════════════════════════════════════════
-- TIPPD — Seed Data Part 1
-- Operator, Eddie auth user, dump location, truck + service log,
-- customers (8), dumpsters (10)
--
-- Prerequisites: schema-part1.sql, schema-part2.sql, and all
-- migration files must be run first.
-- Run seed-data-part1.sql BEFORE seed-data-part2.sql.
-- Safe to re-run: all inserts use ON CONFLICT (id) DO NOTHING.
-- ═══════════════════════════════════════════════════════════════

-- Known fixed IDs
-- Operator:  4bca67e5-8a7c-4036-8c8c-bf3664d4bf14
-- Mike (owner user): 4bb5c13c-7ce8-4ad6-9690-d29110f5815b
-- Eddie (driver):    ee000000-0000-4000-a000-000000000001
-- Truck T-1:         bb000000-0000-4000-a000-000000000001
-- Dump location:     dd000000-0000-4000-a000-000000000001
-- Customers 1-8:     cc000000-0000-4000-a000-00000000000[1-8]
-- Dumpsters 1-10:    d0000000-0000-4000-a000-00000000000[1-9] and ...0010


-- ───────────────────────────────────────────────────────────────
-- 1. UPDATE OPERATOR RECORD
-- ───────────────────────────────────────────────────────────────
UPDATE operators SET
  base_rate_10yd              = 550,
  base_rate_20yd              = 750,
  daily_overage_rate          = 25,
  standard_rental_days        = 7,
  tagline                     = 'Fast, reliable dumpster rental in Central NJ',
  service_area_description    = 'Serving Somerset, Union, and Middlesex counties in Central New Jersey',
  twilio_number               = '+19087250456',
  new_dumpster_cost           = 4200,
  used_dumpster_cost          = 2800,
  used_dumpster_sale_price    = 1800,
  driver_monthly_wage         = 4800,
  truck_monthly_insurance     = 425
WHERE id = '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14';


-- ───────────────────────────────────────────────────────────────
-- 2. EDDIE — AUTH USER + PUBLIC USER RECORD
-- ───────────────────────────────────────────────────────────────
-- Login: eddie@metrowasteservice.com / Driver2026!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'ee000000-0000-4000-a000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'eddie@metrowasteservice.com',
  crypt('Driver2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Eddie's public user record
INSERT INTO users (id, operator_id, role, name, phone, is_active, created_at)
VALUES (
  'ee000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'driver',
  'Eddie Vargas',
  '(908) 555-0911',
  true,
  now()
) ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────────────────────
-- 3. DUMP LOCATION
-- ───────────────────────────────────────────────────────────────
INSERT INTO dump_locations (
  id, operator_id, name, address,
  lat, lng, hours_open, hours_close,
  cost_per_ton, estimated_wait_minutes, is_active
) VALUES (
  'dd000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Somerset County Transfer Station',
  '30 Lake Rd, Manville, NJ 08835',
  40.5398, -74.5882,
  '07:00', '16:00',
  85.00, 20, true
) ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────────────────────
-- 4. TRUCK T-1 + SERVICE LOG
-- ───────────────────────────────────────────────────────────────
INSERT INTO trucks (
  id, operator_id, name, plate,
  year, make, model,
  current_mileage, status
) VALUES (
  'bb000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'T-1',
  'MWS-4471',
  2021,
  'Peterbilt',
  '337',
  47250,
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Service log: oil change
INSERT INTO truck_service_log (
  id, truck_id, operator_id, service_type,
  date_performed, mileage_at_service, next_due_miles,
  cost, vendor, notes
) VALUES (
  gen_random_uuid(),
  'bb000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'oil',
  '2026-01-15', 45200, 47700,
  125.00, 'Quick Lube Bound Brook', 'Synthetic 15W-40'
) ON CONFLICT (id) DO NOTHING;

-- Service log: tires
INSERT INTO truck_service_log (
  id, truck_id, operator_id, service_type,
  date_performed, mileage_at_service,
  cost, vendor, notes
) VALUES (
  gen_random_uuid(),
  'bb000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'tires',
  '2026-02-01', 46000,
  890.00, 'NJ Truck Tire', 'Replaced front steer tires'
) ON CONFLICT (id) DO NOTHING;

-- Service log: annual inspection
INSERT INTO truck_service_log (
  id, truck_id, operator_id, service_type,
  date_performed, mileage_at_service, next_due_date,
  cost, vendor, notes
) VALUES (
  gen_random_uuid(),
  'bb000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'inspection',
  '2026-01-03', 44800, '2027-01-03',
  65.00, 'NJ MVC', 'Annual inspection - passed'
) ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────────────────────
-- 5. CUSTOMERS (8)
-- NOTE: sms_consent columns require migration-sms-consent.sql
--       to be run first. They are NOT included here.
-- ───────────────────────────────────────────────────────────────

-- Customer 1: Bob Kowalski (residential, loyal)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score, notes
) VALUES (
  'cc000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Bob Kowalski',
  '(908) 555-0101',
  'bob.kowalski@gmail.com',
  'residential',
  '45 Oak St, Bound Brook, NJ 08805',
  0,
  'Loyal customer'
) ON CONFLICT (id) DO NOTHING;

-- Customer 2: Sarah Chen (residential)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score
) VALUES (
  'cc000000-0000-4000-a000-000000000002',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Sarah Chen',
  '(908) 555-0102',
  'sarah.chen@gmail.com',
  'residential',
  '88 River Rd, Bound Brook, NJ 08805',
  0
) ON CONFLICT (id) DO NOTHING;

-- Customer 3: Precision Contractors LLC (contractor)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score, notes
) VALUES (
  'cc000000-0000-4000-a000-000000000003',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Precision Contractors LLC',
  '(908) 555-0201',
  'billing@precisioncontractors.com',
  'contractor',
  '500 Industrial Blvd, Bridgewater, NJ 08807',
  1,
  'Repeat contractor account'
) ON CONFLICT (id) DO NOTHING;

-- Customer 4: Mike D'Angelo (residential, slow payer)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score, notes
) VALUES (
  'cc000000-0000-4000-a000-000000000004',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Mike D''Angelo',
  '(908) 555-0103',
  'mdangelo@hotmail.com',
  'residential',
  '211 Cedar Grove Rd, Somerville, NJ 08876',
  7,
  'Slow payer — 2 past late invoices'
) ON CONFLICT (id) DO NOTHING;

-- Customer 5: Green Valley Construction (contractor)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score, notes
) VALUES (
  'cc000000-0000-4000-a000-000000000005',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Green Valley Construction',
  '(908) 555-0202',
  'office@greenvalleyconst.com',
  'contractor',
  '200 Route 22, Branchburg, NJ 08876',
  2,
  'Ongoing site work'
) ON CONFLICT (id) DO NOTHING;

-- Customer 6: Tom Gallagher (residential)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score
) VALUES (
  'cc000000-0000-4000-a000-000000000006',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Tom Gallagher',
  '(908) 555-0104',
  'tomgallagher44@gmail.com',
  'residential',
  '17 Hillside Ave, Warren, NJ 07059',
  0
) ON CONFLICT (id) DO NOTHING;

-- Customer 7: Riverside Renovations LLC (contractor)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score
) VALUES (
  'cc000000-0000-4000-a000-000000000007',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Riverside Renovations LLC',
  '(908) 555-0203',
  'info@riversiderenos.com',
  'contractor',
  '80 Bridge St, Somerville, NJ 08876',
  0
) ON CONFLICT (id) DO NOTHING;

-- Customer 8: Linda Hoffman (residential)
INSERT INTO customers (
  id, operator_id, name, phone, email,
  type, billing_address, pain_score
) VALUES (
  'cc000000-0000-4000-a000-000000000008',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'Linda Hoffman',
  '(908) 555-0105',
  'lhoffman@yahoo.com',
  'residential',
  '12 Maple Ave, Somerville, NJ 08876',
  0
) ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────────────────────
-- 6. DUMPSTERS (10)
-- current_job_id left NULL here; set via UPDATE in part 2
-- after jobs are inserted.
-- ───────────────────────────────────────────────────────────────

-- M-101: 10yd Grade A — will be assigned to job-01 (Bob Kowalski drop today)
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status
) VALUES (
  'd0000000-0000-4000-a000-000000000001',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-101', '10yd', 'A', 'assigned'
) ON CONFLICT (id) DO NOTHING;

-- M-102: 10yd Grade B — deployed on job-03 (Precision Contractors, pickup today)
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status,
  last_inspection_date
) VALUES (
  'd0000000-0000-4000-a000-000000000002',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-102', '10yd', 'B', 'deployed',
  '2026-02-15'
) ON CONFLICT (id) DO NOTHING;

-- M-103: 10yd Grade A — deployed on job-04 (Linda Hoffman, 7-day rental due today)
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status
) VALUES (
  'd0000000-0000-4000-a000-000000000003',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-103', '10yd', 'A', 'deployed'
) ON CONFLICT (id) DO NOTHING;

-- M-104: 10yd Grade B — deployed on job-05 (Green Valley, ongoing)
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status
) VALUES (
  'd0000000-0000-4000-a000-000000000004',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-104', '10yd', 'B', 'deployed'
) ON CONFLICT (id) DO NOTHING;

-- M-105: 10yd Grade A — available in yard
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status
) VALUES (
  'd0000000-0000-4000-a000-000000000005',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-105', '10yd', 'A', 'available'
) ON CONFLICT (id) DO NOTHING;

-- M-201: 20yd Grade A — will be assigned to job-02 (Sarah Chen drop today)
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status
) VALUES (
  'd0000000-0000-4000-a000-000000000006',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-201', '20yd', 'A', 'assigned'
) ON CONFLICT (id) DO NOTHING;

-- M-202: 20yd Grade B — in yard (just returned from job-07)
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status,
  last_inspection_date
) VALUES (
  'd0000000-0000-4000-a000-000000000007',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-202', '20yd', 'B', 'in_yard',
  '2026-03-10'
) ON CONFLICT (id) DO NOTHING;

-- M-203: 20yd Grade A — available
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status
) VALUES (
  'd0000000-0000-4000-a000-000000000008',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-203', '20yd', 'A', 'available'
) ON CONFLICT (id) DO NOTHING;

-- M-204: 20yd Grade C — in repair (bent hinge, needs welding)
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status,
  repair_notes, repair_cost_estimate, repair_return_date
) VALUES (
  'd0000000-0000-4000-a000-000000000009',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-204', '20yd', 'C', 'repair',
  'Left hinge bent — needs welding',
  350.00,
  '2026-04-05'
) ON CONFLICT (id) DO NOTHING;

-- M-205: 20yd Grade B — available
INSERT INTO dumpsters (
  id, operator_id, unit_number, size, condition_grade, status
) VALUES (
  'd0000000-0000-4000-a000-000000000010',
  '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
  'M-205', '20yd', 'B', 'available'
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- END OF PART 1
-- Run seed-data-part2.sql next.
-- ═══════════════════════════════════════════════════════════════
