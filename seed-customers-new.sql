-- ═══════════════════════════════════════════════════════════════
-- SEED: 5 New Customers for today's 8-job route
-- Operator: 4bca67e5-8a7c-4036-8c8c-bf3664d4bf14
-- Safe to re-run — ON CONFLICT (id) DO NOTHING
-- ═══════════════════════════════════════════════════════════════

INSERT INTO customers
  (id, operator_id, name, phone, email, type, billing_address, pain_score, notes)
VALUES
  (
    'cc000000-0000-4000-a000-000000000009',
    '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
    'Dan Murphy',
    '(908) 555-0106',
    'dmurphy74@gmail.com',
    'residential',
    '74 Elm St, Bound Brook, NJ 08805',
    0,
    'Neighbor referral from Bob Kowalski'
  ),
  (
    'cc000000-0000-4000-a000-000000000010',
    '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
    'New Heights Builders LLC',
    '(908) 555-0204',
    'dispatch@newheightsbuilders.com',
    'contractor',
    '12 Birch Hill Rd, Warren, NJ 07059',
    0,
    'Framing and demo contractor'
  ),
  (
    'cc000000-0000-4000-a000-000000000011',
    '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
    'Carlos Estrada',
    '(908) 555-0107',
    'cestrada@gmail.com',
    'residential',
    '330 Grove St, Plainfield, NJ 07060',
    4,
    'Prior issue with prohibited materials — educate on what can go in box'
  ),
  (
    'cc000000-0000-4000-a000-000000000012',
    '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
    'Heritage Demolition LLC',
    '(908) 555-0205',
    'office@heritagedemolition.com',
    'contractor',
    '200 Commerce Blvd, Bridgewater, NJ 08807',
    6,
    'Demo contractor — frequently overloads boxes with concrete'
  ),
  (
    'cc000000-0000-4000-a000-000000000013',
    '4bca67e5-8a7c-4036-8c8c-bf3664d4bf14',
    'Patricia Walsh',
    '(908) 555-0108',
    'pwalsh@hotmail.com',
    'residential',
    '19 Sunset Dr, Branchburg, NJ 08876',
    2,
    'Hard to reach — no answer last time driver arrived'
  )
ON CONFLICT (id) DO NOTHING;
