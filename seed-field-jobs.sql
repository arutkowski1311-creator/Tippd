-- ═══════════════════════════════════════════════════════════════
-- SEED: Field Jobs — 11 deployed dumpsters with real job records
-- Boxes: M-117, M-118, M-124, M-125 (10yd)
--        M-209, M-210, M-221, M-222, M-227, M-234, M-236 (20yd)
-- All addresses within ~20 miles of Branchburg, NJ
-- Operator: 4bca67e5-8a7c-4036-8c8c-bf3664d4bf14
-- Safe to re-run — ON CONFLICT (id) DO NOTHING
-- ═══════════════════════════════════════════════════════════════

-- ─── Customers ────────────────────────────────────────────────
INSERT INTO customers
  (id, operator_id, name, email, phone, type, billing_address, pain_score)
VALUES
  ('cc000000-0000-4000-a000-000000000014',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Ryan Kowalski', 'ryan.kowalski@email.com', '(908) 555-0301',
   'residential', '45 Oak Hill Dr, Hillsborough, NJ 08844', 1),

  ('cc000000-0000-4000-a000-000000000015',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Diane Fazio', 'dfazio@gmail.com', '(908) 555-0302',
   'residential', '88 Millbrook Ave, Manville, NJ 08835', 1),

  ('cc000000-0000-4000-a000-000000000016',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Peter Vaccaro', 'pvaccaro@hotmail.com', '(908) 555-0303',
   'residential', '17 Maple Ave, Flemington, NJ 08822', 3),

  ('cc000000-0000-4000-a000-000000000017',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Summit Contractors Inc', 'ops@summitcontractors.com', '(908) 555-0304',
   'contractor', '320 County Rd 523, Readington, NJ 08889', 1),

  ('cc000000-0000-4000-a000-000000000018',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Ironwood Building Group', 'dispatch@ironwoodbuild.com', '(908) 555-0305',
   'contractor', '14 Mine Brook Rd, Bernardsville, NJ 07924', 2),

  ('cc000000-0000-4000-a000-000000000019',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Valley Home Builders LLC', 'office@valleyhb.com', '(908) 555-0306',
   'contractor', '88 Peapack Rd, Peapack, NJ 07977', 1),

  ('cc000000-0000-4000-a000-000000000020',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Mike Szymanski', 'mszymanski@gmail.com', '(908) 555-0307',
   'residential', '16 Lamington Rd, Bedminster, NJ 07921', 4),

  ('cc000000-0000-4000-a000-000000000021',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Angela DiNapoli', 'angela.dinapoli@gmail.com', '(908) 555-0308',
   'residential', '94 Main St, Clinton, NJ 08809', 1),

  ('cc000000-0000-4000-a000-000000000022',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Crest Development Corp', 'pm@crestdev.com', '(908) 555-0309',
   'contractor', '72 Old Turnpike Rd, Oldwick, NJ 07851', 2),

  ('cc000000-0000-4000-a000-000000000023',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'Frank Piazza', 'fpiazza@yahoo.com', '(908) 555-0310',
   'residential', '12 Orchard Rd, Hillsborough, NJ 08844', 1),

  ('cc000000-0000-4000-a000-000000000024',
   '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
   'ProBuild Contracting LLC', 'jobs@probuildnj.com', '(908) 555-0311',
   'contractor', '55 Route 31 N, Flemington, NJ 08822', 2)

ON CONFLICT (id) DO NOTHING;

-- ─── Jobs ─────────────────────────────────────────────────────
-- All status = 'dropped' (box is on site, awaiting future pickup)
-- Drop dates spread 2–10 days ago for variety; some overdue (>7 days)
INSERT INTO jobs
  (id, operator_id, customer_id, customer_name, customer_phone,
   dumpster_id, dumpster_unit_number, truck_id, truck_name, assigned_driver_id,
   status, job_type, drop_address, drop_lat, drop_lng,
   requested_drop_start, actual_drop_time,
   requested_pickup_start, base_rate, days_on_site, customer_notes)
VALUES

-- Job-013: M-117 (10yd B) → Ryan Kowalski, Hillsborough — 3 days out
('90000000-0000-4000-a000-000000000013',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000014',
 'Ryan Kowalski', '(908) 555-0301',
 'd0000000-0000-4000-a000-000000000117', 'M-117',
 'bb000000-0000-4000-a000-000000000001', 'T-1',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'residential',
 '45 Oak Hill Dr, Hillsborough, NJ 08844', 40.4940, -74.6432,
 '2026-03-27 08:00:00+00', '2026-03-27 09:15:00+00',
 '2026-04-03 08:00:00+00', 550.00, 3,
 'Garage cleanout. Box in driveway, leave room for one car.'),

-- Job-014: M-118 (10yd B) → Diane Fazio, Manville — 5 days out
('90000000-0000-4000-a000-000000000014',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000015',
 'Diane Fazio', '(908) 555-0302',
 'd0000000-0000-4000-a000-000000000118', 'M-118',
 'bb000000-0000-4000-a000-000000000001', 'T-1',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'residential',
 '88 Millbrook Ave, Manville, NJ 08835', 40.5409, -74.5905,
 '2026-03-25 09:00:00+00', '2026-03-25 10:20:00+00',
 '2026-04-01 09:00:00+00', 550.00, 5,
 'Basement and attic cleanout. OK to block one side of driveway.'),

-- Job-015: M-124 (10yd C) → Peter Vaccaro, Flemington — 9 days out (OVERDUE)
('90000000-0000-4000-a000-000000000015',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000016',
 'Peter Vaccaro', '(908) 555-0303',
 'd0000000-0000-4000-a000-000000000124', 'M-124',
 'bb000000-0000-4000-a000-000000000002', 'T-2',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'residential',
 '17 Maple Ave, Flemington, NJ 08822', 40.5126, -74.8581,
 '2026-03-21 08:00:00+00', '2026-03-21 09:45:00+00',
 '2026-03-28 08:00:00+00', 550.00, 9,
 'Estate cleanout — told him 7-day max. Called twice, no callback. Needs pickup ASAP.'),

-- Job-016: M-125 (10yd C) → Summit Contractors, Readington — 4 days out
('90000000-0000-4000-a000-000000000016',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000017',
 'Summit Contractors Inc', '(908) 555-0304',
 'd0000000-0000-4000-a000-000000000125', 'M-125',
 'bb000000-0000-4000-a000-000000000002', 'T-2',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'construction',
 '320 County Rd 523, Readington, NJ 08889', 40.5760, -74.7180,
 '2026-03-26 07:00:00+00', '2026-03-26 08:30:00+00',
 '2026-04-02 07:00:00+00', 550.00, 4,
 'Demo debris only. Site contact is Rick at (908) 555-0304 ext 2.'),

-- Job-017: M-209 (20yd A) → Ironwood Building Group, Bernardsville — 2 days out
('90000000-0000-4000-a000-000000000017',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000018',
 'Ironwood Building Group', '(908) 555-0305',
 'd0000000-0000-4000-a000-000000000209', 'M-209',
 'bb000000-0000-4000-a000-000000000001', 'T-1',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'construction',
 '14 Mine Brook Rd, Bernardsville, NJ 07924', 40.7182, -74.5686,
 '2026-03-28 07:00:00+00', '2026-03-28 08:10:00+00',
 '2026-04-04 07:00:00+00', 750.00, 2,
 'New build framing — mixed demo and lumber scrap. Drop at rear of lot.'),

-- Job-018: M-210 (20yd A) → Valley Home Builders, Peapack — 6 days out
('90000000-0000-4000-a000-000000000018',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000019',
 'Valley Home Builders LLC', '(908) 555-0306',
 'd0000000-0000-4000-a000-000000000210', 'M-210',
 'bb000000-0000-4000-a000-000000000001', 'T-1',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'construction',
 '88 Peapack Rd, Peapack, NJ 07977', 40.7115, -74.6600,
 '2026-03-24 07:00:00+00', '2026-03-24 08:45:00+00',
 '2026-03-31 07:00:00+00', 750.00, 6,
 'Kitchen and bath gut renovation. Concrete, tile and drywall. Call before pickup.'),

-- Job-019: M-221 (20yd B) → Mike Szymanski, Bedminster — 8 days out (OVERDUE)
('90000000-0000-4000-a000-000000000019',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000020',
 'Mike Szymanski', '(908) 555-0307',
 'd0000000-0000-4000-a000-000000000221', 'M-221',
 'bb000000-0000-4000-a000-000000000002', 'T-2',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'residential',
 '16 Lamington Rd, Bedminster, NJ 07921', 40.6771, -74.6570,
 '2026-03-22 09:00:00+00', '2026-03-22 10:30:00+00',
 '2026-03-29 09:00:00+00', 750.00, 8,
 'Whole-house cleanout, selling property. Box almost full — needs pickup soon.'),

-- Job-020: M-222 (20yd B) → Angela DiNapoli, Clinton — 3 days out
('90000000-0000-4000-a000-000000000020',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000021',
 'Angela DiNapoli', '(908) 555-0308',
 'd0000000-0000-4000-a000-000000000222', 'M-222',
 'bb000000-0000-4000-a000-000000000002', 'T-2',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'residential',
 '94 Main St, Clinton, NJ 08809', 40.6368, -74.9109,
 '2026-03-27 10:00:00+00', '2026-03-27 11:15:00+00',
 '2026-04-03 10:00:00+00', 750.00, 3,
 'Deck and sunroom demo. Boards only — no concrete per agreement.'),

-- Job-021: M-227 (20yd B) → Crest Development, Oldwick — 5 days out
('90000000-0000-4000-a000-000000000021',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000022',
 'Crest Development Corp', '(908) 555-0309',
 'd0000000-0000-4000-a000-000000000227', 'M-227',
 'bb000000-0000-4000-a000-000000000001', 'T-1',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'construction',
 '72 Old Turnpike Rd, Oldwick, NJ 07851', 40.6681, -74.7349,
 '2026-03-25 07:00:00+00', '2026-03-25 08:20:00+00',
 '2026-04-01 07:00:00+00', 750.00, 5,
 'Commercial renovation — mixed C&D debris. Gate code 1147. Ask for Dave.'),

-- Job-022: M-234 (20yd C) → Frank Piazza, Hillsborough — 4 days out
('90000000-0000-4000-a000-000000000022',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000023',
 'Frank Piazza', '(908) 555-0310',
 'd0000000-0000-4000-a000-000000000234', 'M-234',
 'bb000000-0000-4000-a000-000000000002', 'T-2',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'residential',
 '12 Orchard Rd, Hillsborough, NJ 08844', 40.4959, -74.6424,
 '2026-03-26 09:00:00+00', '2026-03-26 10:30:00+00',
 '2026-04-02 09:00:00+00', 750.00, 4,
 'Pool removal and patio demo. Heavy concrete — agreed on weight overage clause.'),

-- Job-023: M-236 (20yd C) → ProBuild Contracting, Flemington — 7 days out
('90000000-0000-4000-a000-000000000023',
 '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
 'cc000000-0000-4000-a000-000000000024',
 'ProBuild Contracting LLC', '(908) 555-0311',
 'd0000000-0000-4000-a000-000000000236', 'M-236',
 'bb000000-0000-4000-a000-000000000001', 'T-1',
 'ee000000-0000-4000-a000-000000000001',
 'dropped', 'construction',
 '55 Route 31 N, Flemington, NJ 08822', 40.5198, -74.8540,
 '2026-03-23 07:00:00+00', '2026-03-23 08:15:00+00',
 '2026-03-30 07:00:00+00', 750.00, 7,
 'Roofing tear-off and framing debris. Second box this month for this customer.')

ON CONFLICT (id) DO NOTHING;

-- ─── Link dumpsters to their jobs ────────────────────────────
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000013'
  WHERE id = 'd0000000-0000-4000-a000-000000000117';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000014'
  WHERE id = 'd0000000-0000-4000-a000-000000000118';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000015'
  WHERE id = 'd0000000-0000-4000-a000-000000000124';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000016'
  WHERE id = 'd0000000-0000-4000-a000-000000000125';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000017'
  WHERE id = 'd0000000-0000-4000-a000-000000000209';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000018'
  WHERE id = 'd0000000-0000-4000-a000-000000000210';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000019'
  WHERE id = 'd0000000-0000-4000-a000-000000000221';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000020'
  WHERE id = 'd0000000-0000-4000-a000-000000000222';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000021'
  WHERE id = 'd0000000-0000-4000-a000-000000000227';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000022'
  WHERE id = 'd0000000-0000-4000-a000-000000000234';
UPDATE dumpsters SET current_job_id = '90000000-0000-4000-a000-000000000023'
  WHERE id = 'd0000000-0000-4000-a000-000000000236';
