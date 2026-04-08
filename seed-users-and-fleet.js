const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://gtrelxnbhzwrurhmrurc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cmVseG5iaHp3cnVyaG1ydXJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU1NzUxOSwiZXhwIjoyMDkwMTMzNTE5fQ.dKAqBT-v5SfWRLuRbuVld2UpmiJ7eFY-ia6hTX9o6ew"
);

const OP_ID = "d216a6c0-d75d-4f87-a258-e8f0a6ce1328";

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }

async function seed() {
  console.log("═══════════════════════════════════════════════");
  console.log("  TIPPD — Seeding Users & 50 Deployed Dumpsters");
  console.log("═══════════════════════════════════════════════\n");

  // ══════════════════════════════════════════════
  // 1. CREATE AUTH USERS
  // ══════════════════════════════════════════════
  console.log("Creating auth users...");

  const usersToCreate = [
    { email: "mike@metrowasteservice.com", name: "Mike Pugliese", role: "owner", phone: "(908) 725-0456" },
    { email: "rutnyllc@gmail.com", name: "Vivienne Pugliese", role: "owner", phone: "(908) 725-0456" },
    { email: "rutkowski.adam@gmail.com", name: "Eddie", role: "driver", phone: "(908) 555-0300" },
  ];

  const userIds = [];

  for (const u of usersToCreate) {
    // Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(eu => eu.email === u.email);

    let userId;
    if (existing) {
      console.log(`  ⤷ ${u.name} already exists (${existing.id})`);
      userId = existing.id;
    } else {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: "TippdMetro2026!",
        email_confirm: true,
      });
      if (authErr) {
        console.error(`  ✗ Failed to create ${u.name}:`, authErr.message);
        continue;
      }
      userId = authUser.user.id;
      console.log(`  ✓ Created ${u.name} (${userId})`);
    }

    userIds.push(userId);

    // Upsert into public.users table
    const { error: profileErr } = await supabase.from("users").upsert({
      id: userId,
      operator_id: OP_ID,
      role: u.role,
      name: u.name,
      phone: u.phone,
    }, { onConflict: "id" });

    if (profileErr) console.error(`  ✗ Profile error for ${u.name}:`, profileErr.message);
    else console.log(`  ✓ ${u.name} profile linked to Metro Waste (${u.role})`);
  }

  const [MIKE_ID, VIV_ID, EDDIE_ID] = userIds;

  // ══════════════════════════════════════════════
  // 2. GET EXISTING TRUCKS
  // ══════════════════════════════════════════════
  const { data: trucks } = await supabase.from("trucks").select("*").eq("operator_id", OP_ID);
  if (!trucks || trucks.length === 0) {
    console.error("No trucks found — run seed-test-data.js first");
    return;
  }
  console.log(`\n  Found ${trucks.length} trucks`);

  // ══════════════════════════════════════════════
  // 3. GET EXISTING CUSTOMERS
  // ══════════════════════════════════════════════
  const { data: customers } = await supabase.from("customers").select("*").eq("operator_id", OP_ID);
  if (!customers || customers.length === 0) {
    console.error("No customers found — run seed-test-data.js first");
    return;
  }
  console.log(`  Found ${customers.length} customers`);

  // ══════════════════════════════════════════════
  // 4. CREATE 50 DEPLOYED DUMPSTERS + JOBS
  // ══════════════════════════════════════════════
  console.log("\nCreating 50 deployed dumpsters with active jobs...\n");

  // Addresses spread around Branchburg (40.6°N, -74.7°W), denser near center
  const deployedAddresses = [
    // ── CORE: Branchburg / Readington (15) ──
    { addr: "3380 US-22, Branchburg, NJ 08876", lat: 40.5851, lng: -74.6900, type: "residential" },
    { addr: "1130 Old York Rd, Branchburg, NJ 08876", lat: 40.6010, lng: -74.7050, type: "residential" },
    { addr: "415 Baird Rd, Branchburg, NJ 08876", lat: 40.5950, lng: -74.7200, type: "residential" },
    { addr: "200 Readington Rd, Branchburg, NJ 08876", lat: 40.6100, lng: -74.7300, type: "residential" },
    { addr: "85 Lamington Rd, Branchburg, NJ 08876", lat: 40.6200, lng: -74.7100, type: "construction" },
    { addr: "610 N Branch River Rd, Branchburg, NJ 08876", lat: 40.5780, lng: -74.6800, type: "residential" },
    { addr: "1400 Route 28, Branchburg, NJ 08876", lat: 40.5700, lng: -74.6950, type: "commercial" },
    { addr: "220 Kenilworth Ct, Branchburg, NJ 08876", lat: 40.5900, lng: -74.6750, type: "residential" },
    { addr: "50 Milltown Rd, Branchburg, NJ 08876", lat: 40.6050, lng: -74.7150, type: "estate_cleanout" },
    { addr: "770 Stony Brook Rd, Branchburg, NJ 08876", lat: 40.5830, lng: -74.7050, type: "residential" },
    { addr: "305 Country Club Rd, Branchburg, NJ 08876", lat: 40.6150, lng: -74.6950, type: "construction" },
    { addr: "125 Whiton Rd, Branchburg, NJ 08876", lat: 40.6000, lng: -74.6850, type: "residential" },
    { addr: "480 Pleasant Run Rd, Readington, NJ 08889", lat: 40.5750, lng: -74.7350, type: "residential" },
    { addr: "38 Dreahook Rd, Readington, NJ 08889", lat: 40.5800, lng: -74.7400, type: "residential" },
    { addr: "710 Hillcrest Rd, Readington, NJ 08889", lat: 40.5650, lng: -74.7500, type: "residential" },

    // ── RING 1: Bridgewater / Somerville / Raritan (10) ──
    { addr: "234 Elm Dr, Bridgewater, NJ 08807", lat: 40.5934, lng: -74.6241, type: "residential" },
    { addr: "1100 Route 22 W, Bridgewater, NJ 08807", lat: 40.5850, lng: -74.6100, type: "commercial" },
    { addr: "400 Garretson Rd, Bridgewater, NJ 08807", lat: 40.6050, lng: -74.6300, type: "construction" },
    { addr: "55 Finderne Ave, Bridgewater, NJ 08807", lat: 40.5750, lng: -74.5700, type: "residential" },
    { addr: "8 Division St, Somerville, NJ 08876", lat: 40.5743, lng: -74.6099, type: "commercial" },
    { addr: "120 W Main St, Somerville, NJ 08876", lat: 40.5740, lng: -74.6150, type: "construction" },
    { addr: "45 W Somerset St, Raritan, NJ 08869", lat: 40.5693, lng: -74.6331, type: "residential" },
    { addr: "200 Orlando Dr, Raritan, NJ 08869", lat: 40.5700, lng: -74.6400, type: "residential" },
    { addr: "15 Thompson St, Raritan, NJ 08869", lat: 40.5680, lng: -74.6350, type: "residential" },
    { addr: "300 Foothill Rd, Bridgewater, NJ 08807", lat: 40.5600, lng: -74.6000, type: "construction" },

    // ── RING 2: Hillsborough / Manville / Bound Brook (10) ──
    { addr: "630 Route 206 S, Hillsborough, NJ 08844", lat: 40.4883, lng: -74.6355, type: "construction" },
    { addr: "180 Amwell Rd, Hillsborough, NJ 08844", lat: 40.5100, lng: -74.6400, type: "residential" },
    { addr: "75 Triangle Rd, Hillsborough, NJ 08844", lat: 40.5200, lng: -74.6500, type: "commercial" },
    { addr: "445 Dukes Pkwy W, Hillsborough, NJ 08844", lat: 40.5050, lng: -74.6250, type: "residential" },
    { addr: "321 Brooks Blvd, Manville, NJ 08835", lat: 40.5380, lng: -74.5920, type: "residential" },
    { addr: "115 S Main St, Manville, NJ 08835", lat: 40.5415, lng: -74.5886, type: "residential" },
    { addr: "56 Pine Rd, Bound Brook, NJ 08805", lat: 40.5683, lng: -74.5384, type: "residential" },
    { addr: "410 W Union Ave, Bound Brook, NJ 08805", lat: 40.5650, lng: -74.5450, type: "estate_cleanout" },
    { addr: "80 Vosseller Ave, Bound Brook, NJ 08805", lat: 40.5700, lng: -74.5350, type: "residential" },
    { addr: "22 Talmage Ave, Bound Brook, NJ 08805", lat: 40.5620, lng: -74.5400, type: "residential" },

    // ── RING 3: Green Brook / Warren / N. Plainfield / Watchung (8) ──
    { addr: "155 Green Brook Rd, Green Brook, NJ 08812", lat: 40.6082, lng: -74.4811, type: "residential" },
    { addr: "88 Rock Ave, Green Brook, NJ 08812", lat: 40.6050, lng: -74.4750, type: "construction" },
    { addr: "44 Highland Ave, Warren, NJ 07059", lat: 40.6347, lng: -74.5145, type: "residential" },
    { addr: "125 Mt Bethel Rd, Warren, NJ 07059", lat: 40.6400, lng: -74.5200, type: "construction" },
    { addr: "22 Watchung Ave, North Plainfield, NJ 07060", lat: 40.6300, lng: -74.4350, type: "residential" },
    { addr: "67 Washington Ave, North Plainfield, NJ 07060", lat: 40.6334, lng: -74.4275, type: "estate_cleanout" },
    { addr: "340 Valley Rd, Watchung, NJ 07069", lat: 40.6380, lng: -74.4510, type: "residential" },
    { addr: "100 Bonnie Burn Rd, Watchung, NJ 07069", lat: 40.6350, lng: -74.4600, type: "residential" },

    // ── OUTER RING: Flemington / Piscataway / Middlesex / New Brunswick (7) ──
    { addr: "75 Industrial Dr, Flemington, NJ 08822", lat: 40.5127, lng: -74.8590, type: "construction" },
    { addr: "200 Route 202, Flemington, NJ 08822", lat: 40.5100, lng: -74.8500, type: "commercial" },
    { addr: "440 Stelton Rd, Piscataway, NJ 08854", lat: 40.5542, lng: -74.4536, type: "construction" },
    { addr: "88 Valley Rd, Middlesex, NJ 08846", lat: 40.5724, lng: -74.4935, type: "residential" },
    { addr: "330 Easton Ave, New Brunswick, NJ 08901", lat: 40.4862, lng: -74.4518, type: "residential" },
    { addr: "50 Commercial Ave, New Brunswick, NJ 08901", lat: 40.4900, lng: -74.4550, type: "commercial" },
    { addr: "15 Commerce St, Piscataway, NJ 08854", lat: 40.5500, lng: -74.4600, type: "construction" },
  ];

  // Distribute sizes: 15x 10yd, 20x 20yd, 15x 30yd
  const sizeDistribution = [];
  for (let i = 0; i < 15; i++) sizeDistribution.push("10yd");
  for (let i = 0; i < 20; i++) sizeDistribution.push("20yd");
  for (let i = 0; i < 15; i++) sizeDistribution.push("30yd");

  const grades = ["A", "A", "B", "B", "A", "C"];

  // Create dumpsters
  const newDumpsters = [];
  for (let i = 0; i < 50; i++) {
    const sizePrefix = sizeDistribution[i] === "10yd" ? "1" : sizeDistribution[i] === "20yd" ? "2" : "3";
    newDumpsters.push({
      operator_id: OP_ID,
      unit_number: `F-${sizePrefix}${String(i + 1).padStart(2, "0")}`,
      size: sizeDistribution[i],
      condition_grade: grades[i % grades.length],
      status: "deployed",
    });
  }

  const { data: dumpData, error: dumpErr } = await supabase.from("dumpsters").insert(newDumpsters).select();
  if (dumpErr) {
    console.error("Dumpster insert error:", dumpErr.message);
    return;
  }
  console.log(`  ✓ ${dumpData.length} deployed dumpsters created`);

  // Create jobs for each deployed dumpster
  const jobs = [];
  const baseRates = { "10yd": 550, "20yd": 750, "30yd": 850 };

  for (let i = 0; i < 50; i++) {
    const dumpster = dumpData[i];
    const location = deployedAddresses[i];
    const customer = customers[i % customers.length];
    const truck = trucks[i % trucks.length];
    const daysOut = Math.floor(Math.random() * 6) + 1; // 1-6 days ago

    // Mix of statuses: most active, some dropped recently
    let status;
    if (i < 40) status = "active";
    else if (i < 45) status = "dropped";
    else status = "pickup_requested";

    jobs.push({
      operator_id: OP_ID,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      dumpster_id: dumpster.id,
      dumpster_unit_number: dumpster.unit_number,
      truck_id: truck.id,
      truck_name: truck.name,
      assigned_driver_id: EDDIE_ID,
      status: status,
      job_type: location.type,
      drop_address: location.addr,
      drop_lat: location.lat,
      drop_lng: location.lng,
      requested_drop_start: daysAgo(daysOut),
      actual_drop_time: daysAgo(daysOut),
      // Auto-schedule pickup 7 days from drop
      requested_pickup_start: daysFromNow(7 - daysOut),
      requested_pickup_end: daysFromNow(7 - daysOut),
      base_rate: baseRates[dumpster.size],
      weight_charge: 0,
      daily_overage_charge: 0,
      discount_amount: 0,
      photos_drop: [],
      photos_pickup: [],
    });
  }

  const { data: jobData, error: jobErr } = await supabase.from("jobs").insert(jobs).select();
  if (jobErr) {
    console.error("Job insert error:", jobErr.message);
    return;
  }
  console.log(`  ✓ ${jobData.length} jobs created for deployed dumpsters`);

  // Link dumpsters to their jobs
  console.log("\nLinking dumpsters to jobs...");
  for (let i = 0; i < 50; i++) {
    await supabase.from("dumpsters").update({ current_job_id: jobData[i].id }).eq("id", dumpData[i].id);
  }
  console.log("  ✓ All 50 dumpsters linked to their active jobs");

  // ══════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════");
  console.log("  SEED COMPLETE");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Users: Mike (owner), Vivienne (owner), Eddie (driver)`);
  console.log(`  Password: TippdMetro2026!`);
  console.log(`  Deployed dumpsters: 50 (15x10yd, 20x20yd, 15x30yd)`);
  console.log(`  Active jobs: 50`);
  console.log(`  All centered around Branchburg, NJ`);
  console.log("═══════════════════════════════════════════════\n");
}

seed().catch(console.error);
