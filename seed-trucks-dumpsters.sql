-- ═══════════════════════════════════════════════════════════════
-- SEED: Trucks + 85 Dumpsters (replaces old fleet)
-- Operator: 4bca67e5-8a7c-4036-8c8c-bf3664d4bf14
-- Safe to re-run — uses ON CONFLICT upsert on dumpsters
-- ═══════════════════════════════════════════════════════════════

-- ─── Step 1: Clean up old trucks and dumpsters ───────────────────
DELETE FROM truck_service_log
  WHERE operator_id = '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14';

DELETE FROM trucks
  WHERE operator_id = '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14';

DELETE FROM dumpster_condition_log
  WHERE dumpster_id IN (
    SELECT id FROM dumpsters
    WHERE operator_id = '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14'
  );

DELETE FROM dumpster_inspections
  WHERE operator_id = '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14';

DELETE FROM dumpsters
  WHERE operator_id = '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14';

-- ─── Step 2: Two 2016 Mack GU813 roll-off trucks ─────────────────
INSERT INTO trucks (id, operator_id, name, plate, year, make, model, current_mileage, status)
VALUES
  ('bb000000-0000-4000-a000-000000000001', '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'T-1', 'MWS-4471', 2016, 'Mack', 'GU813', 95240, 'active'),
  ('bb000000-0000-4000-a000-000000000002', '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'T-2', 'MWS-4883', 2016, 'Mack', 'GU813', 88410, 'active')
ON CONFLICT (id) DO UPDATE SET
  current_mileage = EXCLUDED.current_mileage,
  status = EXCLUDED.status;

-- ─── Step 3: Truck service logs ──────────────────────────────────

-- T-1 service log
INSERT INTO truck_service_log
  (truck_id, operator_id, service_type, date_performed, mileage_at_service,
   next_due_miles, next_due_date, cost, vendor, notes)
VALUES
  ('bb000000-0000-4000-a000-000000000001', '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'oil', '2026-01-15', 93200, 95700, NULL, 125.00, 'Quick Lube Bound Brook',
   'Synthetic 15W-40'),
  ('bb000000-0000-4000-a000-000000000001', '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'tires', '2026-02-01', 94100, NULL, NULL, 890.00, 'NJ Truck Tire',
   'Replaced front steer tires'),
  ('bb000000-0000-4000-a000-000000000001', '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'inspection', '2026-01-03', 92800, NULL, '2027-01-03', 65.00, 'NJ MVC',
   'Annual DOT inspection - passed');

-- T-2 service log
INSERT INTO truck_service_log
  (truck_id, operator_id, service_type, date_performed, mileage_at_service,
   next_due_miles, next_due_date, cost, vendor, notes)
VALUES
  ('bb000000-0000-4000-a000-000000000002', '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'oil', '2026-02-10', 87200, 89700, NULL, 125.00, 'Quick Lube Bound Brook',
   'Synthetic 15W-40'),
  ('bb000000-0000-4000-a000-000000000002', '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'brakes', '2026-01-20', 86500, NULL, NULL, 1240.00, 'Bound Brook Auto & Truck',
   'Full brake job - front and rear, drums resurfaced');

-- ─── Step 4: 85 dumpsters ────────────────────────────────────────
-- id, operator_id, unit_number, size, condition_grade, status,
-- repair_notes, repair_cost_estimate, repair_return_date

INSERT INTO dumpsters
  (id, operator_id, unit_number, size, condition_grade, status,
   repair_notes, repair_cost_estimate, repair_return_date)
VALUES
-- ── 10yd M-101 to M-142 (42 boxes) ──
-- M-101: B, available (returned from Mike D'Angelo job)
('d0000000-0000-4000-a000-000000000101','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-101','10yd','B','available',NULL,NULL,NULL),
-- M-102 to M-105: A, available (grade A pool)
('d0000000-0000-4000-a000-000000000102','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-102','10yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000103','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-103','10yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000104','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-104','10yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000105','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-105','10yd','A','available',NULL,NULL,NULL),
-- M-106: A, assigned (drop today → Dan Murphy)
('d0000000-0000-4000-a000-000000000106','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-106','10yd','A','assigned',NULL,NULL,NULL),
-- M-107: B, assigned (drop today → Patricia Walsh)
('d0000000-0000-4000-a000-000000000107','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-107','10yd','B','assigned',NULL,NULL,NULL),
-- M-108: B, deployed (pickup today → Carlos Estrada)
('d0000000-0000-4000-a000-000000000108','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-108','10yd','B','deployed',NULL,NULL,NULL),
-- M-109 to M-113: A, available (round out 12 A-grade 10yd)
('d0000000-0000-4000-a000-000000000109','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-109','10yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000110','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-110','10yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000111','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-111','10yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000112','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-112','10yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000113','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-113','10yd','A','in_yard',NULL,NULL,NULL),
-- M-114 to M-122: B, mix (B=10 total; M-101,M-107,M-108 already used 3 B)
('d0000000-0000-4000-a000-000000000114','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-114','10yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000115','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-115','10yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000116','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-116','10yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000117','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-117','10yd','B','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000118','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-118','10yd','B','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000119','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-119','10yd','B','in_yard',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000120','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-120','10yd','B','available',NULL,NULL,NULL),
-- M-121 to M-130: C, mix (C=10 total)
('d0000000-0000-4000-a000-000000000121','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-121','10yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000122','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-122','10yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000123','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-123','10yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000124','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-124','10yd','C','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000125','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-125','10yd','C','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000126','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-126','10yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000127','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-127','10yd','C','in_yard',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000128','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-128','10yd','C','needs_cleaning',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000129','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-129','10yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000130','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-130','10yd','C','available',NULL,NULL,NULL),
-- M-131 to M-132: C remainder (already 10 done above? Recount: 121-130 = 10. OK.)
-- M-131 to M-137: D-grade 10yd (D=5 total)
('d0000000-0000-4000-a000-000000000131','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-131','10yd','D','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000132','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-132','10yd','D','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000133','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-133','10yd','D','needs_repair',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000134','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-134','10yd','D','needs_repair',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000135','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-135','10yd','D','repair','Minor dent and door hinge loose',280.00,NULL),
('d0000000-0000-4000-a000-000000000136','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-136','10yd','D','repair','Side panel corrosion and latch bent',280.00,NULL),
('d0000000-0000-4000-a000-000000000137','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-137','10yd','D','needs_cleaning',NULL,NULL,NULL),
-- M-138 to M-142: F-grade 10yd (F=5 total)
('d0000000-0000-4000-a000-000000000138','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-138','10yd','F','repair',
 'Hinge cracked and rear panel bent — welding needed',650.00,'2026-04-10'),
('d0000000-0000-4000-a000-000000000139','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-139','10yd','F','repair',
 'Rust holes in floor — needs full floor plate replacement',1100.00,'2026-04-20'),
('d0000000-0000-4000-a000-000000000140','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-140','10yd','F','repair',
 'Chain mechanism seized — hydraulic replacement needed',890.00,'2026-04-08'),
('d0000000-0000-4000-a000-000000000141','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-141','10yd','F','retired',
 'Beyond economic repair — decommissioned',NULL,NULL),
('d0000000-0000-4000-a000-000000000142','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-142','10yd','F','retired',
 'Frame cracked — decommissioned March 2026',NULL,NULL),

-- ── 20yd M-201 to M-243 (43 boxes) ──
-- M-201: A, available (returned from old Bob Kowalski job)
('d0000000-0000-4000-a000-000000000201','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-201','20yd','A','available',NULL,NULL,NULL),
-- M-202: B, available (returned from Riverside job last week)
('d0000000-0000-4000-a000-000000000202','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-202','20yd','B','available',NULL,NULL,NULL),
-- M-203 to M-205: A, available (continuing A-grade 20yd — need 18 total)
('d0000000-0000-4000-a000-000000000203','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-203','20yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000204','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-204','20yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000205','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-205','20yd','A','available',NULL,NULL,NULL),
-- M-206: A, assigned (drop today → Tom Gallagher)
('d0000000-0000-4000-a000-000000000206','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-206','20yd','A','assigned',NULL,NULL,NULL),
-- M-207: A, assigned (drop today → New Heights Builders)
('d0000000-0000-4000-a000-000000000207','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-207','20yd','A','assigned',NULL,NULL,NULL),
-- M-208 to M-214: A, mix to reach 18 A-grade 20yd
('d0000000-0000-4000-a000-000000000208','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-208','20yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000209','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-209','20yd','A','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000210','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-210','20yd','A','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000211','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-211','20yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000212','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-212','20yd','A','in_yard',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000213','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-213','20yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000214','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-214','20yd','A','available',NULL,NULL,NULL),
-- M-215: B, deployed (pickup today → Heritage Demolition)
('d0000000-0000-4000-a000-000000000215','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-215','20yd','B','deployed',NULL,NULL,NULL),
-- M-216: A, deployed (pickup today → Riverside Renovations)
('d0000000-0000-4000-a000-000000000216','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-216','20yd','A','deployed',NULL,NULL,NULL),
-- M-217: A, deployed (pickup today → Green Valley)
('d0000000-0000-4000-a000-000000000217','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-217','20yd','A','deployed',NULL,NULL,NULL),
-- M-218: B, available (returned from Precision Contractors)
('d0000000-0000-4000-a000-000000000218','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-218','20yd','B','available',NULL,NULL,NULL),
-- M-219 to M-228: B to reach 15 B-grade 20yd (M-202,M-215,M-218 = 3 used)
('d0000000-0000-4000-a000-000000000219','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-219','20yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000220','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-220','20yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000221','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-221','20yd','B','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000222','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-222','20yd','B','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000223','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-223','20yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000224','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-224','20yd','B','in_yard',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000225','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-225','20yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000226','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-226','20yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000227','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-227','20yd','B','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000228','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-228','20yd','B','available',NULL,NULL,NULL),
-- M-229 to M-231: B (3 more to hit 15 B-grade total)
('d0000000-0000-4000-a000-000000000229','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-229','20yd','B','needs_cleaning',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000230','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-230','20yd','B','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000231','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-231','20yd','B','in_yard',NULL,NULL,NULL),
-- M-232 to M-238: C, mix (C=7 total)
('d0000000-0000-4000-a000-000000000232','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-232','20yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000233','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-233','20yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000234','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-234','20yd','C','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000235','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-235','20yd','C','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000236','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-236','20yd','C','deployed',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000237','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-237','20yd','C','in_yard',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000238','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-238','20yd','C','needs_cleaning',NULL,NULL,NULL),
-- M-239 to M-241: D-grade 20yd (D=3 total)
('d0000000-0000-4000-a000-000000000239','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-239','20yd','D','needs_repair',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000240','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-240','20yd','D','needs_repair',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000241','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-241','20yd','D','in_yard',NULL,NULL,NULL),
-- M-242 to M-243: A, available (F=0 for 20yd; remaining 2 go to A)
('d0000000-0000-4000-a000-000000000242','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-242','20yd','A','available',NULL,NULL,NULL),
('d0000000-0000-4000-a000-000000000243','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','M-243','20yd','A','available',NULL,NULL,NULL)

ON CONFLICT (id) DO UPDATE SET
  condition_grade     = EXCLUDED.condition_grade,
  status              = EXCLUDED.status,
  repair_notes        = EXCLUDED.repair_notes,
  repair_cost_estimate = EXCLUDED.repair_cost_estimate,
  repair_return_date  = EXCLUDED.repair_return_date;
