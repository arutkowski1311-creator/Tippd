-- ═══════════════════════════════════════════════════════════════
-- SEED: Part 2 v2 — Jobs, Route, Invoices, Expenses, Comms,
--                   Exceptions, Action Items, Insights, Pricing
-- Operator: 4bca67e5-8a7c-4036-8c8c-bf3664d4bf14
-- Run AFTER seed-trucks-dumpsters.sql and seed-customers-new.sql
-- Safe to re-run — ON CONFLICT (id) DO NOTHING (unless noted)
-- ═══════════════════════════════════════════════════════════════

-- ─── 8 Today's Jobs ──────────────────────────────────────────────
INSERT INTO jobs
  (id,operator_id,customer_id,customer_name,customer_phone,
   dumpster_id,dumpster_unit_number,truck_id,truck_name,assigned_driver_id,
   status,job_type,drop_address,drop_lat,drop_lng,
   requested_drop_start,requested_drop_end,actual_drop_time,
   requested_pickup_start,base_rate,weight_charge,days_on_site,customer_notes)
VALUES
-- Job-01: Dan Murphy, DROP
('90000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000009','Dan Murphy','(908) 555-0106',
 'd0000000-0000-4000-a000-000000000106','M-106',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'scheduled','residential','74 Elm St, Bound Brook, NJ 08805',40.5671,-74.5382,
 '2026-03-30 07:00:00+00','2026-03-30 12:00:00+00',NULL,
 '2026-04-06 07:00:00+00',550.00,NULL,NULL,
 'Referral from Bob Kowalski next door. Box goes in driveway left side.'),
-- Job-02: Tom Gallagher, DROP
('90000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000006','Tom Gallagher','(908) 555-0104',
 'd0000000-0000-4000-a000-000000000206','M-206',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'scheduled','residential','17 Hillside Ave, Warren, NJ 07059',40.6140,-74.4990,
 '2026-03-30 07:00:00+00',NULL,NULL,
 '2026-04-06 07:00:00+00',750.00,NULL,NULL,
 'Concrete driveway — put boards down. Full basement cleanout.'),
-- Job-03: New Heights Builders, DROP
('90000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000010','New Heights Builders LLC','(908) 555-0204',
 'd0000000-0000-4000-a000-000000000207','M-207',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'scheduled','construction','12 Birch Hill Rd, Warren, NJ 07059',40.6155,-74.5010,
 '2026-03-30 07:00:00+00',NULL,NULL,
 '2026-04-06 07:00:00+00',750.00,NULL,NULL,
 'Active job site. Check in with site foreman Mike on arrival. Gate code: 4892.'),
-- Job-04: Carlos Estrada, PICKUP
('90000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000011','Carlos Estrada','(908) 555-0107',
 'd0000000-0000-4000-a000-000000000108','M-108',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'pickup_scheduled','residential','330 Grove St, Plainfield, NJ 07060',40.6174,-74.4113,
 NULL,NULL,'2026-03-25 09:30:00+00',
 '2026-03-30 07:00:00+00',550.00,NULL,5,NULL),
-- Job-05: Heritage Demolition, PICKUP
('90000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000012','Heritage Demolition LLC','(908) 555-0205',
 'd0000000-0000-4000-a000-000000000215','M-215',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'pickup_scheduled','construction','200 Commerce Blvd, Bridgewater, NJ 08807',40.5871,-74.5642,
 NULL,NULL,'2026-03-26 08:00:00+00',
 '2026-03-30 07:00:00+00',750.00,NULL,4,
 'Concrete demo waste only per agreement. Call if overweight.'),
-- Job-06: Riverside Renovations, PICKUP
('90000000-0000-4000-a000-000000000006','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000007','Riverside Renovations LLC','(908) 555-0203',
 'd0000000-0000-4000-a000-000000000216','M-216',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'pickup_scheduled','construction','80 Bridge St, Somerville, NJ 08876',40.5734,-74.6098,
 NULL,NULL,'2026-03-23 09:00:00+00',
 '2026-03-30 07:00:00+00',750.00,120.00,7,NULL),
-- Job-07: Green Valley, PICKUP (urgent)
('90000000-0000-4000-a000-000000000007','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000005','Green Valley Construction','(908) 555-0202',
 'd0000000-0000-4000-a000-000000000217','M-217',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'pickup_requested','construction','200 Route 22, Branchburg, NJ 08876',40.5820,-74.6250,
 NULL,NULL,'2026-03-27 10:00:00+00',
 '2026-03-30 07:00:00+00',750.00,NULL,3,
 'URGENT — box completely full, blocking site access. Called 3 times this morning.'),
-- Job-08: Patricia Walsh, DROP
('90000000-0000-4000-a000-000000000008','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000013','Patricia Walsh','(908) 555-0108',
 'd0000000-0000-4000-a000-000000000107','M-107',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'scheduled','residential','19 Sunset Dr, Branchburg, NJ 08876',40.5793,-74.6312,
 '2026-03-30 07:00:00+00',NULL,NULL,
 '2026-04-06 07:00:00+00',550.00,NULL,NULL,
 'Box goes in driveway. Call 20 min before arrival.')
ON CONFLICT (id) DO NOTHING;

-- ─── 4 Historical Jobs ───────────────────────────────────────────
INSERT INTO jobs
  (id,operator_id,customer_id,customer_name,customer_phone,
   dumpster_id,dumpster_unit_number,truck_id,truck_name,assigned_driver_id,
   status,job_type,drop_address,drop_lat,drop_lng,
   actual_drop_time,actual_pickup_time,
   requested_pickup_start,base_rate,weight_charge,days_on_site)
VALUES
-- Job-09: Mike D'Angelo, invoiced/overdue
('90000000-0000-4000-a000-000000000009','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000004','Mike D''Angelo','(908) 555-0101',
 'd0000000-0000-4000-a000-000000000101','M-101',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'invoiced','residential','211 Cedar Grove Rd, Somerville, NJ 08876',40.5710,-74.6020,
 '2026-02-05 09:00:00+00','2026-02-12 11:00:00+00',
 '2026-02-12 07:00:00+00',550.00,NULL,7),
-- Job-10: Bob Kowalski, paid
('90000000-0000-4000-a000-000000000010','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000001','Bob Kowalski','(908) 555-0100',
 'd0000000-0000-4000-a000-000000000201','M-201',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'paid','residential','45 Oak St, Bound Brook, NJ 08805',40.5668,-74.5391,
 '2025-12-10 09:00:00+00','2025-12-17 10:00:00+00',
 '2025-12-17 07:00:00+00',550.00,NULL,7),
-- Job-11: Riverside Renovations (old), paid
('90000000-0000-4000-a000-000000000011','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000007','Riverside Renovations LLC','(908) 555-0203',
 'd0000000-0000-4000-a000-000000000202','M-202',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'paid','construction','80 Bridge St, Somerville, NJ 08876',40.5734,-74.6098,
 '2026-02-18 09:00:00+00','2026-02-25 14:00:00+00',
 '2026-02-25 07:00:00+00',750.00,80.00,7),
-- Job-12: Precision Contractors, invoiced
('90000000-0000-4000-a000-000000000012','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000003','Precision Contractors','(908) 555-0103',
 'd0000000-0000-4000-a000-000000000218','M-218',
 'bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001',
 'invoiced','construction','500 Industrial Blvd, Bridgewater, NJ 08807',40.5890,-74.5700,
 '2026-03-14 09:00:00+00','2026-03-21 15:00:00+00',
 '2026-03-21 07:00:00+00',550.00,NULL,7)
ON CONFLICT (id) DO NOTHING;

-- ─── Update dumpster current_job_id ──────────────────────────────
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000001'
  WHERE id = 'd0000000-0000-4000-a000-000000000106';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000002'
  WHERE id = 'd0000000-0000-4000-a000-000000000206';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000003'
  WHERE id = 'd0000000-0000-4000-a000-000000000207';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000004'
  WHERE id = 'd0000000-0000-4000-a000-000000000108';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000005'
  WHERE id = 'd0000000-0000-4000-a000-000000000215';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000006'
  WHERE id = 'd0000000-0000-4000-a000-000000000216';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000007'
  WHERE id = 'd0000000-0000-4000-a000-000000000217';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000008'
  WHERE id = 'd0000000-0000-4000-a000-000000000107';

-- ─── Today's Route ───────────────────────────────────────────────
INSERT INTO routes
  (id,operator_id,truck_id,driver_id,date,status,jobs_sequence,total_miles)
VALUES
  ('a0000000-0000-4000-a000-000000000001',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'bb000000-0000-4000-a000-000000000001',
   'ee000000-0000-4000-a000-000000000001',
   '2026-03-30','locked',
   '["90000000-0000-4000-a000-000000000001","90000000-0000-4000-a000-000000000002","90000000-0000-4000-a000-000000000003","90000000-0000-4000-a000-000000000004","90000000-0000-4000-a000-000000000005","90000000-0000-4000-a000-000000000006","90000000-0000-4000-a000-000000000007","90000000-0000-4000-a000-000000000008"]',
   78.0)
ON CONFLICT (id) DO UPDATE SET
  status = 'locked',
  jobs_sequence = EXCLUDED.jobs_sequence;

-- ─── 12 Route Segments ───────────────────────────────────────────
INSERT INTO route_segments
  (id,route_id,operator_id,driver_id,date,sequence_number,type,
   job_id,dump_location_id,
   from_address,from_lat,from_lng,to_address,to_lat,to_lng,
   customer_name,box_id,box_size,box_action,decision,label,
   planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,
   depart_time_offset,arrive_time_offset,status)
VALUES
-- Seg 1: yard_depart
('a1000000-0000-4000-a000-000000000001',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',1,'yard_depart',
 NULL,NULL,
 '1 Drake St, Bound Brook, NJ 08805',40.5659,-74.5370,
 '74 Elm St, Bound Brook, NJ 08805',40.5671,-74.5382,
 NULL,NULL,NULL,NULL,NULL,
 'Depart Yard → Dan Murphy',5,2.1,5,10,0,5,'pending'),
-- Seg 2: drop Dan Murphy M-106
('a1000000-0000-4000-a000-000000000002',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',2,'drop',
 '90000000-0000-4000-a000-000000000001',NULL,
 '74 Elm St, Bound Brook, NJ 08805',40.5671,-74.5382,
 '17 Hillside Ave, Warren, NJ 07059',40.6140,-74.4990,
 'Dan Murphy','d0000000-0000-4000-a000-000000000106','10yd','drop',NULL,
 'Drop M-106 — Dan Murphy',20,9.2,20,40,10,30,'pending'),
-- Seg 3: drop Tom Gallagher M-206
('a1000000-0000-4000-a000-000000000003',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',3,'drop',
 '90000000-0000-4000-a000-000000000002',NULL,
 '17 Hillside Ave, Warren, NJ 07059',40.6140,-74.4990,
 '12 Birch Hill Rd, Warren, NJ 07059',40.6155,-74.5010,
 'Tom Gallagher','d0000000-0000-4000-a000-000000000206','20yd','drop',NULL,
 'Drop M-206 — Tom Gallagher (boards needed)',8,3.1,25,33,50,58,'pending'),
-- Seg 4: drop New Heights Builders M-207
('a1000000-0000-4000-a000-000000000004',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',4,'drop',
 '90000000-0000-4000-a000-000000000003',NULL,
 '12 Birch Hill Rd, Warren, NJ 07059',40.6155,-74.5010,
 '330 Grove St, Plainfield, NJ 07060',40.6174,-74.4113,
 'New Heights Builders LLC','d0000000-0000-4000-a000-000000000207','20yd','drop',NULL,
 'Drop M-207 — New Heights Builders',25,12.3,25,50,83,108,'pending'),
-- Seg 5: pickup Carlos Estrada M-108
('a1000000-0000-4000-a000-000000000005',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',5,'pickup',
 '90000000-0000-4000-a000-000000000004',NULL,
 '330 Grove St, Plainfield, NJ 07060',40.6174,-74.4113,
 '200 Commerce Blvd, Bridgewater, NJ 08807',40.5871,-74.5642,
 'Carlos Estrada','d0000000-0000-4000-a000-000000000108','10yd','pickup',
 'Verify no prohibited materials before loading',
 'Pickup M-108 — Carlos Estrada ⚠ Check for prohibited material',25,11.8,20,45,133,158,'pending'),
-- Seg 6: pickup Heritage Demolition M-215
('a1000000-0000-4000-a000-000000000006',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',6,'pickup',
 '90000000-0000-4000-a000-000000000005',NULL,
 '330 Grove St, Plainfield, NJ 07060',40.6174,-74.4113,
 '30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,
 'Heritage Demolition LLC','d0000000-0000-4000-a000-000000000215','20yd','pickup',
 'Box may be heavy — estimate before loading',
 'Pickup M-215 — Heritage Demolition ⚠ Verify weight',20,9.4,20,40,178,198,'pending'),
-- Seg 7: dump Run 1
('a1000000-0000-4000-a000-000000000007',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',7,'dump',
 NULL,'dd000000-0000-4000-a000-000000000001',
 '200 Commerce Blvd, Bridgewater, NJ 08807',40.5871,-74.5642,
 '30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,
 NULL,NULL,NULL,NULL,NULL,
 'Dump at Somerset Transfer Station (Run 1)',18,8.6,30,48,218,236,'pending'),
-- Seg 8: pickup Riverside Renovations M-216
('a1000000-0000-4000-a000-000000000008',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',8,'pickup',
 '90000000-0000-4000-a000-000000000006',NULL,
 '30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,
 '200 Route 22, Branchburg, NJ 08876',40.5820,-74.6250,
 'Riverside Renovations LLC','d0000000-0000-4000-a000-000000000216','20yd','pickup',NULL,
 'Pickup M-216 — Riverside Renovations',15,6.4,20,35,266,281,'pending'),
-- Seg 9: pickup Green Valley M-217 (urgent)
('a1000000-0000-4000-a000-000000000009',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',9,'pickup',
 '90000000-0000-4000-a000-000000000007',NULL,
 '200 Route 22, Branchburg, NJ 08876',40.5820,-74.6250,
 '19 Sunset Dr, Branchburg, NJ 08876',40.5793,-74.6312,
 'Green Valley Construction','d0000000-0000-4000-a000-000000000217','20yd','pickup',NULL,
 'Pickup M-217 — Green Valley ⚡ URGENT',12,5.1,20,32,301,313,'pending'),
-- Seg 10: drop Patricia Walsh M-107
('a1000000-0000-4000-a000-000000000010',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',10,'drop',
 '90000000-0000-4000-a000-000000000008',NULL,
 '200 Route 22, Branchburg, NJ 08876',40.5820,-74.6250,
 '19 Sunset Dr, Branchburg, NJ 08876',40.5793,-74.6312,
 'Patricia Walsh','d0000000-0000-4000-a000-000000000107','10yd','drop',
 'Call customer 20 min before arriving',
 'Drop M-107 — Patricia Walsh (call ahead)',5,2.3,20,25,333,338,'pending'),
-- Seg 11: dump Run 2
('a1000000-0000-4000-a000-000000000011',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',11,'dump',
 NULL,'dd000000-0000-4000-a000-000000000001',
 '19 Sunset Dr, Branchburg, NJ 08876',40.5793,-74.6312,
 '30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,
 NULL,NULL,NULL,NULL,NULL,
 'Dump at Somerset Transfer Station (Run 2)',20,8.8,30,50,358,378,'pending'),
-- Seg 12: yard_return
('a1000000-0000-4000-a000-000000000012',
 'a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'ee000000-0000-4000-a000-000000000001','2026-03-30',12,'yard_return',
 NULL,NULL,
 '30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,
 '1 Drake St, Bound Brook, NJ 08805',40.5659,-74.5370,
 NULL,NULL,NULL,NULL,NULL,
 'Return to Yard',22,9.7,10,32,408,430,'pending')
ON CONFLICT (id) DO NOTHING;

-- ─── Driver State ─────────────────────────────────────────────────
INSERT INTO driver_state
  (id,driver_id,operator_id,status,lat,lng)
VALUES
  ('fa000000-0000-4000-a000-000000000001',
   'ee000000-0000-4000-a000-000000000001',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'offline',40.5659,-74.5370)
ON CONFLICT (driver_id) DO UPDATE SET
  status = 'offline', lat = 40.5659, lng = -74.5370;

-- ─── Invoices ────────────────────────────────────────────────────
INSERT INTO invoices
  (id,operator_id,job_id,customer_id,customer_name,customer_email,customer_phone,
   status,issued_date,due_date,base_amount,weight_amount,total_amount,amount_paid,
   paid_at,reminder_log)
VALUES
-- Inv-01: Bob Kowalski job-10, paid
('b0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000010','cc000000-0000-4000-a000-000000000001',
 'Bob Kowalski','bkowalski@gmail.com','(908) 555-0100',
 'paid','2025-12-17','2026-01-16',550.00,0,550.00,550.00,
 '2025-12-29 00:00:00+00','[]'),
-- Inv-02: Riverside Renovations job-11, paid
('b0000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000011','cc000000-0000-4000-a000-000000000007',
 'Riverside Renovations LLC','billing@riversiderenovations.com','(908) 555-0203',
 'paid','2026-02-25','2026-03-27',750.00,80.00,830.00,830.00,
 '2026-03-08 00:00:00+00','[]'),
-- Inv-03: Mike D'Angelo job-09, overdue 44 days
('b0000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000009','cc000000-0000-4000-a000-000000000004',
 'Mike D''Angelo','mdangelo@gmail.com','(908) 555-0101',
 'overdue_30','2026-02-12','2026-03-14',550.00,0,550.00,0,
 NULL,'[{"sent_at":"2026-03-15","type":"30_day_reminder"}]'),
-- Inv-04: Riverside Renovations job-06, draft (today's pickup pending completion)
('b0000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000006','cc000000-0000-4000-a000-000000000007',
 'Riverside Renovations LLC','billing@riversiderenovations.com','(908) 555-0203',
 'draft','2026-03-30','2026-04-29',750.00,120.00,870.00,0,NULL,'[]'),
-- Inv-05: Precision Contractors job-12, sent
('b0000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000012','cc000000-0000-4000-a000-000000000003',
 'Precision Contractors','billing@precisioncontractors.com','(908) 555-0103',
 'sent','2026-03-21','2026-04-20',550.00,0,550.00,0,NULL,'[]')
ON CONFLICT (id) DO NOTHING;

-- ─── Expenses ────────────────────────────────────────────────────
INSERT INTO expenses
  (id,operator_id,date,category,tax_bucket,amount,vendor,truck_id,notes,created_by)
VALUES
('b1000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '2026-03-28','fuel','COGS',187.40,'Wawa Bound Brook',
 'bb000000-0000-4000-a000-000000000001','58.2 gal diesel @ $3.22/gal',
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b'),
('b1000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '2026-03-21','fuel','COGS',203.10,'Wawa Bound Brook',
 'bb000000-0000-4000-a000-000000000001','63.1 gal diesel @ $3.22/gal',
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b'),
('b1000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '2026-03-25','fuel','COGS',172.40,'Wawa Bound Brook',
 'bb000000-0000-4000-a000-000000000002','53.5 gal diesel @ $3.22/gal',
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b'),
('b1000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '2026-03-28','tolls','vehicle',22.50,NULL,
 'bb000000-0000-4000-a000-000000000001','Route 78 / GSP / NJ Turnpike weekly tolls',
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b'),
('b1000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '2026-03-05','repair','vehicle',340.00,'Bound Brook Auto & Truck',
 'bb000000-0000-4000-a000-000000000001','Replaced rear hydraulic hose and fittings on T-1',
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b'),
('b1000000-0000-4000-a000-000000000006','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '2026-03-22','wages','payroll',1200.00,NULL,
 NULL,'Eddie Vargas — weekly wage Mar 16–22',
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b')
ON CONFLICT (id) DO NOTHING;

-- ─── Communications ───────────────────────────────────────────────
INSERT INTO communications
  (id,operator_id,customer_id,job_id,direction,channel,from_number,to_number,
   raw_content,intent,auto_responded,response_content,created_at)
VALUES
-- Comm-01: Green Valley inbound emergency
('b2000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000005','90000000-0000-4000-a000-000000000007',
 'inbound','sms','(908) 555-0202','+19087250456',
 'Mike the box is completely full and blocking the site cant get forklifts in there need it gone ASAP please',
 'pickup_request',true,
 'Got it! Green Valley — we''re adding your M-217 to today''s route. Eddie will be there by 1pm. Reply STOP to opt out.',
 '2026-03-30 06:45:00+00'),
-- Comm-02: Carlos Estrada outbound pickup confirmation
('b2000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000011','90000000-0000-4000-a000-000000000004',
 'outbound','sms','+19087250456','(908) 555-0107',
 'Hi Carlos, this is Metro Waste. Your M-108 pickup is scheduled for tomorrow March 30. Eddie will arrive between 10am–2pm. Reply STOP to opt out.',
 NULL,false,NULL,'2026-03-29 16:00:00+00'),
-- Comm-03: Patricia Walsh inbound morning
('b2000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000013','90000000-0000-4000-a000-000000000008',
 'inbound','sms','(908) 555-0108','+19087250456',
 'Hi will someone be there before noon? I have to leave at 12',
 'reschedule',true,
 'Hi Patricia! Your M-107 drop is scheduled for the morning. Eddie aims to be there by 11am. If he''s running behind he''ll text you. Reply STOP to opt out.',
 '2026-03-30 07:15:00+00'),
-- Comm-04: Mike D'Angelo inbound
('b2000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000004','90000000-0000-4000-a000-000000000009',
 'inbound','sms','(908) 555-0101','+19087250456',
 'I mailed a check last week should be there',
 'other',false,NULL,'2026-03-15 11:45:00+00'),
-- Comm-05: Outbound overdue reminder to Mike D'Angelo
('b2000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000004','90000000-0000-4000-a000-000000000009',
 'outbound','sms','+19087250456','(908) 555-0101',
 'Hi Mike, Metro Waste here. Invoice for $550 is now 1 day past due. Please pay at [link] or call (908) 725-0456. Reply STOP to opt out.',
 NULL,false,NULL,'2026-03-15 10:00:00+00'),
-- Comm-06: Heritage Demolition inbound day of drop
('b2000000-0000-4000-a000-000000000006','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000012','90000000-0000-4000-a000-000000000005',
 'inbound','sms','(908) 555-0205','+19087250456',
 'Put the 20 yard where the old one was just past the gate. Lots of concrete coming out this week.',
 'driver_note',false,NULL,'2026-03-26 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ─── Exceptions ───────────────────────────────────────────────────
INSERT INTO exceptions
  (id,operator_id,job_id,driver_id,truck_id,type,severity,resolution_owner,
   time_sensitivity,cascade_scope,status,driver_notes,material_type,
   resolution_notes,resolved_by,resolved_at,customer_notified,owner_notified,created_at)
VALUES
-- Exc-01: Prohibited material — Carlos Estrada
('b3000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000004','ee000000-0000-4000-a000-000000000001',NULL,
 'prohibited_material','high','customer','resolve_within_30min','stop_only','open',
 'Paint cans (at least 8), car battery, and old electronics visible on top of load. Cannot haul — prohibited at Somerset Transfer. Customer needs to remove before I can pick up.',
 'paint_cans, car_battery, electronics',NULL,NULL,NULL,true,true,
 '2026-03-30 10:38:00+00'),
-- Exc-02: Overloaded container — Heritage Demolition
('b3000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000005','ee000000-0000-4000-a000-000000000001',
 'bb000000-0000-4000-a000-000000000001',
 'overloaded_container','critical','owner','resolve_now','this_route','escalated',
 'Box feels extremely heavy pulling onto truck. Estimate 7-8 tons of concrete. Transfer station will reject us or charge steep overweight fee. Need guidance — can we dump partial load on site or reschedule?',
 'concrete',NULL,NULL,NULL,false,true,'2026-03-30 12:15:00+00'),
-- Exc-03: Customer not present — Patricia Walsh
('b3000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000008','ee000000-0000-4000-a000-000000000001',NULL,
 'customer_not_present','medium','customer','tomorrow_ok','stop_only','open',
 'Arrived at 19 Sunset Dr at 1:47pm. Gate locked, no answer on phone (called twice), texted. Cannot drop box without access. Need customer to confirm new window.',
 NULL,NULL,NULL,NULL,true,true,'2026-03-30 13:47:00+00'),
-- Exc-04: Box inaccessible — Riverside Renovations (resolved)
('b3000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 '90000000-0000-4000-a000-000000000006','ee000000-0000-4000-a000-000000000001',NULL,
 'box_inaccessible','medium','customer','resolve_within_30min','stop_only','resolved',
 'Rear gate at 80 Bridge St locked. No one on site. Called main number.',
 NULL,
 'Dispatcher reached PM by phone. Gate code provided: 7731. Pickup completed.',
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b','2026-03-30 11:30:00+00',
 true,true,'2026-03-30 10:55:00+00')
ON CONFLICT (id) DO NOTHING;

-- ─── Action Items ─────────────────────────────────────────────────
INSERT INTO action_items
  (id,operator_id,type,priority,status,title,description,
   customer_id,customer_name,customer_phone,job_id,driver_id,invoice_id,
   resolved_by,resolved_at)
VALUES
('b4000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'driver_flag','urgent','open',
 'Prohibited material at Carlos Estrada — M-108 cannot be picked up',
 'Eddie flagged paint cans, car battery, and electronics in M-108. Cannot haul to Somerset Transfer. Contact customer immediately to remove items. Box is sitting on route.',
 'cc000000-0000-4000-a000-000000000011','Carlos Estrada','(908) 555-0107',
 '90000000-0000-4000-a000-000000000004',
 'ee000000-0000-4000-a000-000000000001',NULL,NULL,NULL),
('b4000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'driver_flag','urgent','open',
 'Heritage Demo M-215 overloaded — ~7-8 tons concrete',
 'Eddie escalated — box is critically overloaded with concrete. Transfer station will reject or fine. Decide: partial offload on site, alternate dump location, or reschedule.',
 'cc000000-0000-4000-a000-000000000012','Heritage Demolition LLC','(908) 555-0205',
 '90000000-0000-4000-a000-000000000005',NULL,NULL,NULL,NULL),
('b4000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'driver_flag','high','open',
 'Patricia Walsh not home — drop rescheduled',
 'Eddie arrived at 1:47pm, gate locked, no answer. Box M-107 still on truck. Reschedule drop — customer must be home or gate unlocked.',
 'cc000000-0000-4000-a000-000000000013','Patricia Walsh','(908) 555-0108',
 '90000000-0000-4000-a000-000000000008',NULL,NULL,NULL,NULL),
('b4000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'callback_request','high','open',
 'Mike D''Angelo invoice 44 days overdue — claims check in mail',
 'Invoice issued 2026-02-12, due 2026-03-14. No payment received. Customer texted saying check is in mail. Follow up — no payment by 4/1, apply $50 late fee.',
 'cc000000-0000-4000-a000-000000000004','Mike D''Angelo','(908) 555-0101',
 NULL,NULL,'b0000000-0000-4000-a000-000000000003',NULL,NULL),
('b4000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'invoice_overdue','high','open',
 'Invoice 44 days past due — Mike D''Angelo $550',
 'Invoice INV-003 issued Feb 12, due March 14. No payment. Reminder sent March 15. Consider collections referral if unpaid by April 14.',
 'cc000000-0000-4000-a000-000000000004','Mike D''Angelo','(908) 555-0101',
 NULL,NULL,'b0000000-0000-4000-a000-000000000003',NULL,NULL),
('b4000000-0000-4000-a000-000000000006','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'new_booking','normal','resolved',
 'New booking approved — Dan Murphy drop confirmed',
 'Referral from Bob Kowalski. Job scheduled for today March 30.',
 'cc000000-0000-4000-a000-000000000009','Dan Murphy','(908) 555-0106',
 '90000000-0000-4000-a000-000000000001',NULL,NULL,
 '4bb5c13c-7ce8-4ad6-9690-d29110f5815b','2026-03-29 17:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ─── Insights ────────────────────────────────────────────────────
INSERT INTO insights
  (id,operator_id,type,title,body,dollar_impact,week_of)
VALUES
('b5000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'payment',
 'D''Angelo account at 44 days — act before collections threshold',
 'Invoice INV-003 issued 2026-02-12 for $550 remains unpaid at 44 days past due. Collections threshold is typically 60–90 days. Contact customer now and document outcome.',
 550.00,'2026-03-23'),
('b5000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'route',
 'Dead miles spike: Plainfield pickups adding 24 extra miles/week',
 'Carlos Estrada (Plainfield) and any Plainfield-area stops add significant dead miles vs. your Somerset County core. Consider a Plainfield-only route day or minimum charge for out-of-area stops.',
 210.00,'2026-03-23'),
('b5000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'customer',
 'Heritage Demolition: 3 overload incidents in 90 days — policy needed',
 'Heritage Demolition has had 3 overloaded containers in 90 days. Each creates route disruption and potential fines. Recommend a mandatory overweight surcharge ($150/incident) in their contract or require a 30yd minimum for concrete jobs.',
 450.00,'2026-03-23'),
('b5000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'opportunity',
 'Green Valley site likely needs 2nd box — proactive upsell',
 'Green Valley called for emergency pickup only 3 days into a 7-day rental. Site velocity is high. Call before tomorrow drop to offer same-day swap + second box at $700. Could lock in $1,400 this week.',
 700.00,'2026-03-23')
ON CONFLICT (id) DO NOTHING;

-- ─── Pricing Recommendations ──────────────────────────────────────
INSERT INTO pricing_recommendations
  (id,operator_id,signal_type,title,observation,math,proposed_action,
   dollar_impact,status)
VALUES
('b6000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'high_demand',
 'Raise 20yd rate to $800 for April — demand up 40%',
 '20yd bookings up 40% vs. same period last year. Fleet utilization for 20yd boxes at 82%, approaching high threshold.',
 '$750 current rate × 40% demand increase → raise to $800 adds ~$50/job × est. 24 jobs/month = $1,200/month incremental.',
 'Increase base_rate_20yd from $750 to $800 effective April 1.',
 1200.00,'pending'),
('b6000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'fuel_increase',
 'Add $15 fuel surcharge — diesel up 8% since January',
 'Diesel avg $3.22/gal vs $2.98 in January — an 8% increase. Weekly fuel spend up ~$45.',
 '$45/week × 52 weeks ÷ avg 60 jobs/month = ~$13/job unrecovered. $15 surcharge covers cost and adds margin.',
 'Add $15 fuel surcharge to all new bookings starting April 1.',
 780.00,'pending')
ON CONFLICT (id) DO NOTHING;
