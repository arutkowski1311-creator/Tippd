-- ═══════════════════════════════════════════════════════════════
-- TIPPD — Seed Data Part 2
-- Jobs, dumpster FK updates, route + segments, driver state,
-- invoices, expenses, communications, exceptions, action items,
-- insights, pricing recs, fleet rec.
-- Run AFTER seed-data-part1.sql. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════
-- Operator:  4bca67e5-8a7c-4036-8c8c-bf3664d4bf14  (OP)
-- Mike:      4bb5c13c-7ce8-4ad6-9690-d29110f5815b  (MIKE)
-- Eddie:     ee000000-0000-4000-a000-000000000001  (EDDIE)
-- Truck T-1: bb000000-0000-4000-a000-000000000001  (TRUCK)
-- Dump loc:  dd000000-0000-4000-a000-000000000001  (DUMP)

-- ── 7. JOBS ──────────────────────────────────────────────────

-- Job 01: Bob Kowalski — drop today
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_id,dumpster_unit_number,truck_id,truck_name,assigned_driver_id,status,job_type,drop_address,drop_lat,drop_lng,requested_drop_start,requested_drop_end,requested_pickup_start,base_rate)
VALUES ('90000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000001','Bob Kowalski','(908) 555-0101','d0000000-0000-4000-a000-000000000001','M-101','bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001','scheduled','residential','45 Oak St, Bound Brook, NJ 08805',40.5680,-74.5390,'2026-03-30 07:00:00+00','2026-03-30 12:00:00+00','2026-04-06 07:00:00+00',550.00)
ON CONFLICT (id) DO NOTHING;

-- Job 02: Sarah Chen — drop today
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_id,dumpster_unit_number,truck_id,truck_name,assigned_driver_id,status,job_type,drop_address,drop_lat,drop_lng,requested_drop_start,requested_drop_end,requested_pickup_start,base_rate)
VALUES ('90000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000002','Sarah Chen','(908) 555-0102','d0000000-0000-4000-a000-000000000006','M-201','bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001','scheduled','residential','88 River Rd, Bound Brook, NJ 08805',40.5640,-74.5350,'2026-03-30 07:00:00+00','2026-03-30 12:00:00+00','2026-04-06 07:00:00+00',750.00)
ON CONFLICT (id) DO NOTHING;

-- Job 03: Precision Contractors — pickup today (dropped 3 days ago)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_id,dumpster_unit_number,truck_id,truck_name,assigned_driver_id,status,job_type,drop_address,drop_lat,drop_lng,requested_drop_start,actual_drop_time,requested_pickup_start,base_rate,days_on_site,customer_notes)
VALUES ('90000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000003','Precision Contractors LLC','(908) 555-0201','d0000000-0000-4000-a000-000000000002','M-102','bb000000-0000-4000-a000-000000000001','T-1','ee000000-0000-4000-a000-000000000001','pickup_scheduled','commercial','500 Industrial Blvd, Bridgewater, NJ 08807',40.5900,-74.5700,'2026-03-27 07:00:00+00','2026-03-27 09:15:00+00','2026-03-30 07:00:00+00',550.00,3,'Side gate access — call on arrival')
ON CONFLICT (id) DO NOTHING;

-- Job 04: Linda Hoffman — pickup today (7-day rental due)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_id,dumpster_unit_number,truck_id,assigned_driver_id,status,job_type,drop_address,drop_lat,drop_lng,actual_drop_time,requested_pickup_start,base_rate,days_on_site)
VALUES ('90000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000008','Linda Hoffman','(908) 555-0105','d0000000-0000-4000-a000-000000000003','M-103','bb000000-0000-4000-a000-000000000001','ee000000-0000-4000-a000-000000000001','pickup_scheduled','residential','12 Maple Ave, Somerville, NJ 08876',40.5730,-74.6100,'2026-03-23 08:30:00+00','2026-03-30 07:00:00+00',550.00,7)
ON CONFLICT (id) DO NOTHING;

-- Job 05: Green Valley Construction — active (dropped 2 days ago)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_id,dumpster_unit_number,status,job_type,drop_address,drop_lat,drop_lng,actual_drop_time,requested_pickup_start,base_rate,days_on_site)
VALUES ('90000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000005','Green Valley Construction','(908) 555-0202','d0000000-0000-4000-a000-000000000004','M-104','active','construction','200 Route 22, Branchburg, NJ 08876',40.5820,-74.6250,'2026-03-28 10:00:00+00','2026-04-04 07:00:00+00',550.00,2)
ON CONFLICT (id) DO NOTHING;

-- Job 06: Tom Gallagher — pending_approval (new booking via text)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,status,job_type,drop_address,drop_lat,drop_lng,requested_drop_start,requested_drop_end,requested_pickup_start,base_rate,customer_notes)
VALUES ('90000000-0000-4000-a000-000000000006','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000006','Tom Gallagher','(908) 555-0104','pending_approval','residential','17 Hillside Ave, Warren, NJ 07059',40.6140,-74.4990,'2026-04-02 07:00:00+00','2026-04-02 12:00:00+00','2026-04-09 07:00:00+00',750.00,'Concrete driveway — need boards under box')
ON CONFLICT (id) DO NOTHING;

-- Job 07: Riverside Renovations — invoiced (completed last week)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_unit_number,status,job_type,drop_address,actual_drop_time,actual_pickup_time,days_on_site,base_rate,weight_lbs,weight_charge)
VALUES ('90000000-0000-4000-a000-000000000007','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000007','Riverside Renovations LLC','(908) 555-0203','M-202','invoiced','construction','80 Bridge St, Somerville, NJ 08876','2026-03-17 09:00:00+00','2026-03-24 14:30:00+00',7,750.00,9200,180.00)
ON CONFLICT (id) DO NOTHING;

-- Job 08: Mike D'Angelo — invoiced / overdue (completed 7 weeks ago)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_unit_number,status,job_type,drop_address,actual_drop_time,actual_pickup_time,days_on_site,base_rate)
VALUES ('90000000-0000-4000-a000-000000000008','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000004','Mike D''Angelo','(908) 555-0103','M-101','invoiced','residential','211 Cedar Grove Rd, Somerville, NJ 08876','2026-02-05 09:00:00+00','2026-02-12 11:00:00+00',7,550.00)
ON CONFLICT (id) DO NOTHING;

-- Job 09: Bob Kowalski — paid (3 months ago)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_unit_number,status,job_type,drop_address,actual_drop_time,actual_pickup_time,days_on_site,base_rate)
VALUES ('90000000-0000-4000-a000-000000000009','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000001','Bob Kowalski','(908) 555-0101','M-103','paid','residential','45 Oak St, Bound Brook, NJ 08805','2025-12-10 09:00:00+00','2025-12-17 10:00:00+00',7,550.00)
ON CONFLICT (id) DO NOTHING;

-- Job 10: Sarah Chen — paid (last month)
INSERT INTO jobs (id,operator_id,customer_id,customer_name,customer_phone,dumpster_unit_number,status,job_type,drop_address,actual_drop_time,actual_pickup_time,days_on_site,base_rate)
VALUES ('90000000-0000-4000-a000-000000000010','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000002','Sarah Chen','(908) 555-0102','M-101','paid','residential','88 River Rd, Bound Brook, NJ 08805','2026-02-20 09:00:00+00','2026-02-27 13:00:00+00',7,550.00)
ON CONFLICT (id) DO NOTHING;

-- ── 8. DUMPSTER current_job_id (set after jobs exist) ────────
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000001' WHERE id = 'd0000000-0000-4000-a000-000000000001'; -- M-101 → job-01
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000003' WHERE id = 'd0000000-0000-4000-a000-000000000002'; -- M-102 → job-03
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000004' WHERE id = 'd0000000-0000-4000-a000-000000000003'; -- M-103 → job-04
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000005' WHERE id = 'd0000000-0000-4000-a000-000000000004'; -- M-104 → job-05
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000002' WHERE id = 'd0000000-0000-4000-a000-000000000006'; -- M-201 → job-02

-- ── 9. ROUTE (2026-03-30, locked) ────────────────────────────
INSERT INTO routes (id,operator_id,truck_id,driver_id,date,status,jobs_sequence,total_miles)
VALUES ('a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','bb000000-0000-4000-a000-000000000001','ee000000-0000-4000-a000-000000000001','2026-03-30','locked','["90000000-0000-4000-a000-000000000001","90000000-0000-4000-a000-000000000002","90000000-0000-4000-a000-000000000003","90000000-0000-4000-a000-000000000004"]',27.0)
ON CONFLICT (id) DO NOTHING;

-- ── 10. ROUTE SEGMENTS (7, all pending) ──────────────────────

-- Seg 1: yard_depart — Depart Yard → Bob Kowalski
INSERT INTO route_segments (id,route_id,operator_id,driver_id,date,sequence_number,type,from_address,from_lat,from_lng,to_address,to_lat,to_lng,label,planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,depart_time_offset,arrive_time_offset,status)
VALUES ('a1000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','ee000000-0000-4000-a000-000000000001','2026-03-30',1,'yard_depart','1 Drake St, Bound Brook, NJ 08805',40.5659,-74.5370,'45 Oak St, Bound Brook, NJ 08805',40.5680,-74.5390,'Depart Yard → Bob Kowalski',5,2.1,5,10,0,5,'pending')
ON CONFLICT (id) DO NOTHING;

-- Seg 2: drop — Drop M-101 Bob Kowalski (job-01)
INSERT INTO route_segments (id,route_id,operator_id,driver_id,date,sequence_number,type,job_id,from_address,from_lat,from_lng,to_address,to_lat,to_lng,customer_name,box_id,box_size,box_action,label,planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,depart_time_offset,arrive_time_offset,status)
VALUES ('a1000000-0000-4000-a000-000000000002','a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','ee000000-0000-4000-a000-000000000001','2026-03-30',2,'drop','90000000-0000-4000-a000-000000000001','45 Oak St, Bound Brook, NJ 08805',40.5680,-74.5390,'88 River Rd, Bound Brook, NJ 08805',40.5640,-74.5350,'Bob Kowalski','d0000000-0000-4000-a000-000000000001','10yd','drop','Drop M-101 — Bob Kowalski',8,3.2,20,28,10,18,'pending')
ON CONFLICT (id) DO NOTHING;

-- Seg 3: drop — Drop M-201 Sarah Chen (job-02)
INSERT INTO route_segments (id,route_id,operator_id,driver_id,date,sequence_number,type,job_id,from_address,from_lat,from_lng,to_address,to_lat,to_lng,customer_name,box_id,box_size,box_action,label,planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,depart_time_offset,arrive_time_offset,status)
VALUES ('a1000000-0000-4000-a000-000000000003','a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','ee000000-0000-4000-a000-000000000001','2026-03-30',3,'drop','90000000-0000-4000-a000-000000000002','88 River Rd, Bound Brook, NJ 08805',40.5640,-74.5350,'500 Industrial Blvd, Bridgewater, NJ 08807',40.5900,-74.5700,'Sarah Chen','d0000000-0000-4000-a000-000000000006','20yd','drop','Drop M-201 — Sarah Chen',12,4.8,20,32,38,50,'pending')
ON CONFLICT (id) DO NOTHING;

-- Seg 4: pickup — Pickup M-102 Precision Contractors (job-03)
INSERT INTO route_segments (id,route_id,operator_id,driver_id,date,sequence_number,type,job_id,from_address,from_lat,from_lng,to_address,to_lat,to_lng,customer_name,box_id,box_size,box_action,label,planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,depart_time_offset,arrive_time_offset,status)
VALUES ('a1000000-0000-4000-a000-000000000004','a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','ee000000-0000-4000-a000-000000000001','2026-03-30',4,'pickup','90000000-0000-4000-a000-000000000003','88 River Rd, Bound Brook, NJ 08805',40.5640,-74.5350,'30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,'Precision Contractors LLC','d0000000-0000-4000-a000-000000000002','10yd','pickup','Pickup M-102 — Precision Contractors',12,5.0,20,32,70,82,'pending')
ON CONFLICT (id) DO NOTHING;

-- Seg 5: dump — Somerset Transfer Station
INSERT INTO route_segments (id,route_id,operator_id,driver_id,date,sequence_number,type,dump_location_id,from_address,from_lat,from_lng,to_address,to_lat,to_lng,label,planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,depart_time_offset,arrive_time_offset,status)
VALUES ('a1000000-0000-4000-a000-000000000005','a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','ee000000-0000-4000-a000-000000000001','2026-03-30',5,'dump','dd000000-0000-4000-a000-000000000001','500 Industrial Blvd, Bridgewater, NJ 08807',40.5900,-74.5700,'30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,'Dump at Somerset Transfer Station',15,7.2,25,40,102,117,'pending')
ON CONFLICT (id) DO NOTHING;

-- Seg 6: pickup — Pickup M-103 Linda Hoffman (job-04)
INSERT INTO route_segments (id,route_id,operator_id,driver_id,date,sequence_number,type,job_id,from_address,from_lat,from_lng,to_address,to_lat,to_lng,customer_name,box_id,box_size,box_action,label,planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,depart_time_offset,arrive_time_offset,status)
VALUES ('a1000000-0000-4000-a000-000000000006','a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','ee000000-0000-4000-a000-000000000001','2026-03-30',6,'pickup','90000000-0000-4000-a000-000000000004','30 Lake Rd, Manville, NJ 08835',40.5398,-74.5882,'12 Maple Ave, Somerville, NJ 08876',40.5730,-74.6100,'Linda Hoffman','d0000000-0000-4000-a000-000000000003','10yd','pickup','Pickup M-103 — Linda Hoffman',10,4.3,20,30,142,152,'pending')
ON CONFLICT (id) DO NOTHING;

-- Seg 7: yard_return — Return to Yard
INSERT INTO route_segments (id,route_id,operator_id,driver_id,date,sequence_number,type,from_address,from_lat,from_lng,to_address,to_lat,to_lng,label,planned_drive_minutes,planned_drive_miles,planned_stop_minutes,planned_total_minutes,depart_time_offset,arrive_time_offset,status)
VALUES ('a1000000-0000-4000-a000-000000000007','a0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','ee000000-0000-4000-a000-000000000001','2026-03-30',7,'yard_return','12 Maple Ave, Somerville, NJ 08876',40.5730,-74.6100,'1 Drake St, Bound Brook, NJ 08805',40.5659,-74.5370,'Return to Yard',15,6.1,10,25,172,187,'pending')
ON CONFLICT (id) DO NOTHING;

-- ── 11. DRIVER STATE (Eddie — offline at yard) ───────────────
INSERT INTO driver_state (driver_id,operator_id,lat,lng,status)
VALUES ('ee000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',40.5659,-74.5370,'offline')
ON CONFLICT (driver_id) DO NOTHING;

-- ── 12. INVOICES ─────────────────────────────────────────────

-- Inv 1: Bob Kowalski job-09 — paid
INSERT INTO invoices (id,operator_id,job_id,customer_id,customer_name,customer_email,customer_phone,status,issued_date,due_date,base_amount,total_amount,amount_paid,paid_at)
VALUES ('b0000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000009','cc000000-0000-4000-a000-000000000001','Bob Kowalski','bob.kowalski@gmail.com','(908) 555-0101','paid','2025-12-17','2026-01-16',550.00,550.00,550.00,'2025-12-29 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Inv 2: Sarah Chen job-10 — paid
INSERT INTO invoices (id,operator_id,job_id,customer_id,customer_name,customer_email,customer_phone,status,issued_date,due_date,base_amount,total_amount,amount_paid,paid_at)
VALUES ('b0000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000010','cc000000-0000-4000-a000-000000000002','Sarah Chen','sarah.chen@gmail.com','(908) 555-0102','paid','2026-02-27','2026-03-28',550.00,550.00,550.00,'2026-03-10 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Inv 3: Mike D'Angelo job-08 — overdue_30 (44 days past due)
INSERT INTO invoices (id,operator_id,job_id,customer_id,customer_name,customer_email,customer_phone,status,issued_date,due_date,base_amount,total_amount,amount_paid,reminder_log)
VALUES ('b0000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000008','cc000000-0000-4000-a000-000000000004','Mike D''Angelo','mdangelo@hotmail.com','(908) 555-0103','overdue_30','2026-02-12','2026-03-14',550.00,550.00,0,'[{"sent_at":"2026-03-15","type":"30_day_reminder"}]')
ON CONFLICT (id) DO NOTHING;

-- Inv 4: Riverside Renovations job-07 — sent
INSERT INTO invoices (id,operator_id,job_id,customer_id,customer_name,customer_email,customer_phone,status,issued_date,due_date,base_amount,weight_amount,total_amount,amount_paid)
VALUES ('b0000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000007','cc000000-0000-4000-a000-000000000007','Riverside Renovations LLC','info@riversiderenos.com','(908) 555-0203','sent','2026-03-24','2026-04-23',750.00,180.00,930.00,0)
ON CONFLICT (id) DO NOTHING;

-- Inv 5: Precision Contractors job-03 — draft (invoice after today's pickup)
INSERT INTO invoices (id,operator_id,job_id,customer_id,customer_name,customer_email,customer_phone,status,issued_date,due_date,base_amount,total_amount,amount_paid)
VALUES ('b0000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000003','cc000000-0000-4000-a000-000000000003','Precision Contractors LLC','billing@precisioncontractors.com','(908) 555-0201','draft','2026-03-30','2026-04-29',550.00,550.00,0)
ON CONFLICT (id) DO NOTHING;

-- ── 13. EXPENSES ─────────────────────────────────────────────

INSERT INTO expenses (id,operator_id,date,category,tax_bucket,amount,vendor,truck_id,notes,created_by)
VALUES ('b1000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','2026-03-28','fuel','COGS',187.40,'Wawa Bound Brook','bb000000-0000-4000-a000-000000000001','58.2 gal diesel @ $3.22/gal','4bb5c13c-7ce8-4ad6-9690-d29110f5815b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id,operator_id,date,category,tax_bucket,amount,vendor,truck_id,notes,created_by)
VALUES ('b1000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','2026-03-21','fuel','COGS',203.10,'Wawa Bound Brook','bb000000-0000-4000-a000-000000000001','63.1 gal diesel @ $3.22/gal','4bb5c13c-7ce8-4ad6-9690-d29110f5815b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id,operator_id,date,category,tax_bucket,amount,vendor,truck_id,notes,created_by)
VALUES ('b1000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','2026-03-28','tolls','vehicle',14.75,NULL,'bb000000-0000-4000-a000-000000000001','Route 78 / GSP tolls','4bb5c13c-7ce8-4ad6-9690-d29110f5815b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id,operator_id,date,category,tax_bucket,amount,vendor,truck_id,notes,created_by)
VALUES ('b1000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','2026-03-05','repair','vehicle',340.00,'Bound Brook Auto & Truck','bb000000-0000-4000-a000-000000000001','Replaced rear hydraulic hose and fittings','4bb5c13c-7ce8-4ad6-9690-d29110f5815b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id,operator_id,date,category,tax_bucket,amount,vendor,truck_id,notes,created_by)
VALUES ('b1000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','2026-03-01','insurance','vehicle',425.00,'Progressive Commercial','bb000000-0000-4000-a000-000000000001','March premium','4bb5c13c-7ce8-4ad6-9690-d29110f5815b')
ON CONFLICT (id) DO NOTHING;

-- Wages — truck_id NULL (not applicable for payroll)
INSERT INTO expenses (id,operator_id,date,category,tax_bucket,amount,vendor,notes,created_by)
VALUES ('b1000000-0000-4000-a000-000000000006','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','2026-03-22','wages','payroll',1200.00,NULL,'Eddie Vargas — weekly wage Mar 16-22','4bb5c13c-7ce8-4ad6-9690-d29110f5815b')
ON CONFLICT (id) DO NOTHING;

-- ── 14. COMMUNICATIONS ───────────────────────────────────────

-- Comm 1: Precision Contractors — inbound pickup confirmation (3 days ago)
INSERT INTO communications (id,operator_id,customer_id,job_id,direction,channel,from_number,to_number,raw_content,intent,auto_responded,response_content,created_at)
VALUES ('b2000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000003','90000000-0000-4000-a000-000000000003','inbound','sms','+19085550201','+19087250456','Hi just wanted to confirm the dumpster is getting picked up on Monday the 30th?','pickup_request',true,'Hi Precision Contractors! Yes, your M-102 pickup is scheduled for Monday March 30. Eddie will be there between 10am-2pm. Reply STOP to opt out.','2026-03-27 14:22:00+00')
ON CONFLICT (id) DO NOTHING;

-- Comm 2: Mike D'Angelo — outbound overdue reminder
INSERT INTO communications (id,operator_id,customer_id,job_id,direction,channel,from_number,to_number,raw_content,intent,auto_responded,created_at)
VALUES ('b2000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000004','90000000-0000-4000-a000-000000000008','outbound','sms','+19087250456','+19085550103','Hi Mike, this is Metro Waste. Invoice #INV-0003 for $550 is now 16 days past due. Please pay at [link] or call (908) 725-0456. Reply STOP to opt out.','other',false,'2026-03-15 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Comm 3: Mike D'Angelo — inbound (claims check mailed)
INSERT INTO communications (id,operator_id,customer_id,job_id,direction,channel,from_number,to_number,raw_content,intent,auto_responded,created_at)
VALUES ('b2000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000004','90000000-0000-4000-a000-000000000008','inbound','sms','+19085550103','+19087250456','I mailed a check last week should be there','other',false,'2026-03-15 11:45:00+00')
ON CONFLICT (id) DO NOTHING;

-- Comm 4: Tom Gallagher — inbound new booking request
INSERT INTO communications (id,operator_id,customer_id,job_id,direction,channel,from_number,to_number,raw_content,intent,auto_responded,response_content,created_at)
VALUES ('b2000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000006','90000000-0000-4000-a000-000000000006','inbound','sms','+19085550104','+19087250456','Hey I need a 20 yard dumpster at 17 Hillside Ave Warren for April 2nd. Doing a full basement cleanout.','drop_request',true,'Hi Tom! We can get a 20yd dumpster to you on April 2nd for $750 (includes 7 days + 4 tons). Book at tippd.com/book or reply YES to confirm. Reply STOP to opt out.','2026-03-29 16:05:00+00')
ON CONFLICT (id) DO NOTHING;

-- Comm 5: Linda Hoffman — inbound (asking about pickup)
INSERT INTO communications (id,operator_id,customer_id,job_id,direction,channel,from_number,to_number,raw_content,intent,auto_responded,response_content,created_at)
VALUES ('b2000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','cc000000-0000-4000-a000-000000000008','90000000-0000-4000-a000-000000000004','inbound','sms','+19085550105','+19087250456','Is someone coming today to pick up the dumpster? I need my driveway back','pickup_request',true,'Hi Linda! Yes, your M-103 is on today''s schedule. Eddie will be there between 12pm-4pm. Thanks for your patience! Reply STOP to opt out.','2026-03-30 07:30:00+00')
ON CONFLICT (id) DO NOTHING;

-- ── 15. EXCEPTIONS ───────────────────────────────────────────

-- Exc 1: Prohibited material — Precision Contractors M-102 (open, high)
INSERT INTO exceptions (id,operator_id,job_id,driver_id,type,severity,resolution_owner,time_sensitivity,cascade_scope,status,driver_notes,material_type,customer_notified,owner_notified,created_at)
VALUES ('b3000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000003','ee000000-0000-4000-a000-000000000001','prohibited_material','high','customer','resolve_within_30min','stop_only','open','Visible electronics and what looks like a car battery on top of the load. Cannot transport to transfer station — prohibited. Customer needs to remove before pickup.','electronics, battery',true,true,'2026-03-29 11:30:00+00')
ON CONFLICT (id) DO NOTHING;

-- Exc 2: Box inaccessible — Riverside Renovations job-07 (resolved, medium)
INSERT INTO exceptions (id,operator_id,job_id,driver_id,type,severity,resolution_owner,time_sensitivity,cascade_scope,status,driver_notes,resolution_notes,resolved_by,resolved_at,customer_notified,owner_notified,created_at)
VALUES ('b3000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000007','ee000000-0000-4000-a000-000000000001','box_inaccessible','medium','customer','resolve_within_30min','stop_only','resolved','Gate locked, cannot access dumpster. Tried calling customer no answer.','Customer called back 20 min later and opened gate remotely. Pickup completed.','4bb5c13c-7ce8-4ad6-9690-d29110f5815b','2026-03-24 15:45:00+00',true,true,'2026-03-24 14:20:00+00')
ON CONFLICT (id) DO NOTHING;

-- Exc 3: Overloaded container — Green Valley job-05 (escalated, critical)
INSERT INTO exceptions (id,operator_id,job_id,driver_id,truck_id,type,severity,resolution_owner,time_sensitivity,cascade_scope,status,driver_notes,material_type,customer_notified,owner_notified,created_at)
VALUES ('b3000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','90000000-0000-4000-a000-000000000005','ee000000-0000-4000-a000-000000000001','bb000000-0000-4000-a000-000000000001','overloaded_container','critical','owner','resolve_now','this_route','escalated','Box is extremely heavy — truck was sluggish pulling it. Transfer station scale showed 7.8 tons in a 20yd box rated for 5 tons. Inspector flagged it. Had to unload partial load on site.','concrete debris',false,true,'2026-03-28 12:15:00+00')
ON CONFLICT (id) DO NOTHING;

-- ── 16. ACTION ITEMS ─────────────────────────────────────────

INSERT INTO action_items (id,operator_id,type,priority,status,title,description,customer_id,customer_name,customer_phone,invoice_id)
VALUES ('b4000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','callback_request','high','open','Customer wants to discuss payment — Mike D''Angelo','Customer texted saying he mailed a check. No payment received. Follow up and confirm. Invoice is now 44 days past due.','cc000000-0000-4000-a000-000000000004','Mike D''Angelo','(908) 555-0103','b0000000-0000-4000-a000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO action_items (id,operator_id,type,priority,status,title,description,customer_id,customer_name,customer_phone,job_id)
VALUES ('b4000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','new_booking','normal','open','New booking request via text — Tom Gallagher','Address: 17 Hillside Ave, Warren NJ' || chr(10) || 'Date: April 2, 2026' || chr(10) || 'Size: 20yd' || chr(10) || 'Notes: Full basement cleanout. Concrete driveway — needs boards.','cc000000-0000-4000-a000-000000000006','Tom Gallagher','(908) 555-0104','90000000-0000-4000-a000-000000000006')
ON CONFLICT (id) DO NOTHING;

INSERT INTO action_items (id,operator_id,type,priority,status,title,description,customer_id,customer_name,customer_phone,job_id,driver_id)
VALUES ('b4000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','driver_flag','urgent','open','Prohibited material — Precision Contractors M-102','Eddie flagged electronics and a car battery visible in M-102 at Precision Contractors. Cannot pick up until customer removes. Pickup was scheduled for today. Contact customer immediately.','cc000000-0000-4000-a000-000000000003','Precision Contractors LLC','(908) 555-0201','90000000-0000-4000-a000-000000000003','ee000000-0000-4000-a000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO action_items (id,operator_id,type,priority,status,title,description,customer_id,customer_name,invoice_id)
VALUES ('b4000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','invoice_overdue','high','open','Invoice 44 days overdue — Mike D''Angelo $550','Invoice issued 2026-02-12, due 2026-03-14. No payment received. Customer claims check in mail. Escalate if not received by 4/1.','cc000000-0000-4000-a000-000000000004','Mike D''Angelo','b0000000-0000-4000-a000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO action_items (id,operator_id,type,priority,status,title,description,truck_id)
VALUES ('b4000000-0000-4000-a000-000000000005','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','truck_alert','normal','open','T-1 oil change due in 450 miles','T-1 last oil change at 45,200 miles. Next due at 47,700 miles. Current: 47,250. Due within ~2 routes.','bb000000-0000-4000-a000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── 17. INSIGHTS ─────────────────────────────────────────────

INSERT INTO insights (id,operator_id,type,title,body,dollar_impact,action_taken,week_of)
VALUES ('b5000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','payment','D''Angelo account at risk of collections','Mike D''Angelo (job-08) is now 44 days past due on a $550 invoice. Based on payment history, this customer has paid late 2 of 3 invoices. Recommend a call this week before the 60-day late fee triggers on March 15.',550.00,false,'2026-03-23')
ON CONFLICT (id) DO NOTHING;

INSERT INTO insights (id,operator_id,type,title,body,dollar_impact,action_taken,week_of)
VALUES ('b5000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','route','27% dead miles on last Monday route','Last Monday''s route logged 7.3 dead miles out of 27 total (27%). The Precision Contractors stop at Industrial Blvd creates a backtrack. Consider sequencing pickups before drops when both are in Bridgewater to cut 2.1 miles per trip.',180.00,false,'2026-03-23')
ON CONFLICT (id) DO NOTHING;

INSERT INTO insights (id,operator_id,type,title,body,dollar_impact,action_taken,week_of)
VALUES ('b5000000-0000-4000-a000-000000000003','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','customer','Precision Contractors ready for annual contract pitch','Precision Contractors has booked 4 rentals in 90 days averaging $550/job ($2,200 total). At current volume, an annual contract at $480/drop would retain the account while simplifying billing. Estimated annual value: $8,640 vs. $9,900 transactional — but improved retention probability.',8640.00,false,'2026-03-23')
ON CONFLICT (id) DO NOTHING;

INSERT INTO insights (id,operator_id,type,title,body,dollar_impact,action_taken,week_of)
VALUES ('b5000000-0000-4000-a000-000000000004','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','opportunity','Green Valley site could use a second box','Green Valley Construction (active job, 200 Route 22 Branchburg) is on a multi-month renovation. Driver notes from drop indicate large volume. Proactively offering a second 20yd at $680 (loyalty rate) could generate $680+ before the current box is full.',680.00,false,'2026-03-23')
ON CONFLICT (id) DO NOTHING;

-- ── 18. PRICING RECOMMENDATIONS ──────────────────────────────

INSERT INTO pricing_recommendations (id,operator_id,signal_type,title,observation,math,proposed_action,dollar_impact,status)
VALUES ('b6000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','high_demand','Raise 20yd rate for April — demand up 40%','20yd bookings are up 40% week-over-week heading into spring cleanup season. You have 3 of 5 20yd boxes deployed with 2 scheduled drops today. Competitor pricing in Somerset County averages $820 for 20yd.','Current: $750. Proposed: $800. At current weekly volume of 6 drops, that''s +$300/week, +$1,200/month.','Raise 20yd base rate to $800 for April bookings',1200.00,'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pricing_recommendations (id,operator_id,signal_type,title,observation,math,proposed_action,dollar_impact,status)
VALUES ('b6000000-0000-4000-a000-000000000002','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','fuel_increase','Add $15 fuel surcharge — diesel up 8% since January','Diesel prices have risen from $3.00 to $3.22/gal since January 1 (7.3% increase). Current weekly fuel spend: ~$195. At 8 routes/week this adds up to $1,500+ annually in unrecovered fuel cost.','$15 surcharge × ~12 jobs/week = $180/week recovered. Payback vs. fuel increase: immediate.','Add $15 fuel surcharge to all new bookings starting April 1',780.00,'pending')
ON CONFLICT (id) DO NOTHING;

-- ── 19. FLEET RECOMMENDATION ─────────────────────────────────

INSERT INTO fleet_recommendations (id,operator_id,type,units_count,utilization_trigger,new_unit_cost,used_unit_cost,monthly_revenue_per_unit,payback_months_new,payback_months_used,revenue_impact,utilization_after,status)
VALUES ('b7000000-0000-4000-a000-000000000001','4bca67e5-8a7c-4036-8c8c-bf3664d4bf14','add',2,88.0,4200.00,2800.00,720.00,5.8,3.9,1440.00,72.0,'pending')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- END OF PART 2
-- ═══════════════════════════════════════════════════════════════
