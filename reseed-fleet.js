const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://gtrelxnbhzwrurhmrurc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cmVseG5iaHp3cnVyaG1ydXJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU1NzUxOSwiZXhwIjoyMDkwMTMzNTE5fQ.dKAqBT-v5SfWRLuRbuVld2UpmiJ7eFY-ia6hTX9o6ew"
);
const OP_ID = "d216a6c0-d75d-4f87-a258-e8f0a6ce1328";
const EDDIE_ID = "56bfa576-aecf-4f5b-9cb0-669ef66d0fc3";

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }

async function reseed() {
  console.log("Cleaning up old data...");
  await supabase.from("dumpsters").update({ current_job_id: null }).eq("operator_id", OP_ID);
  await supabase.from("invoices").delete().eq("operator_id", OP_ID);
  await supabase.from("jobs").delete().eq("operator_id", OP_ID);
  await supabase.from("dumpsters").delete().eq("operator_id", OP_ID);
  console.log("  Cleaned.");

  const { data: trucks } = await supabase.from("trucks").select("*").eq("operator_id", OP_ID);
  const { data: customers } = await supabase.from("customers").select("*").eq("operator_id", OP_ID);

  // Create 85 dumpsters: 25x10yd, 30x20yd, 30x30yd
  console.log("Creating 85 dumpsters...");
  const grades = ["A","A","A","B","B","C"];
  const dumpsters = [];
  for (let i = 1; i <= 25; i++) {
    dumpsters.push({ operator_id: OP_ID, unit_number: "M-1" + String(i).padStart(2,"0"), size: "10yd", condition_grade: grades[i % 6], status: "available" });
  }
  for (let i = 1; i <= 30; i++) {
    dumpsters.push({ operator_id: OP_ID, unit_number: "M-2" + String(i).padStart(2,"0"), size: "20yd", condition_grade: grades[i % 6], status: "available" });
  }
  for (let i = 1; i <= 30; i++) {
    dumpsters.push({ operator_id: OP_ID, unit_number: "M-3" + String(i).padStart(2,"0"), size: "30yd", condition_grade: grades[i % 6], status: "available" });
  }

  const { data: dd, error: dErr } = await supabase.from("dumpsters").insert(dumpsters).select();
  if (dErr) { console.error("Dumpster error:", dErr.message); return; }
  console.log("  " + dd.length + " dumpsters created");

  // Deploy 50 with active jobs
  const addrs = [
    { addr: "3380 US-22, Branchburg, NJ 08876", lat: 40.5851, lng: -74.6900, type: "residential" },
    { addr: "1130 Old York Rd, Branchburg, NJ 08876", lat: 40.6010, lng: -74.7050, type: "residential" },
    { addr: "415 Baird Rd, Branchburg, NJ 08876", lat: 40.5950, lng: -74.7200, type: "residential" },
    { addr: "200 Readington Rd, Branchburg, NJ 08876", lat: 40.6100, lng: -74.7300, type: "construction" },
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
    { addr: "630 Route 206 S, Hillsborough, NJ 08844", lat: 40.4883, lng: -74.6355, type: "construction" },
    { addr: "180 Amwell Rd, Hillsborough, NJ 08844", lat: 40.5100, lng: -74.6400, type: "residential" },
    { addr: "75 Triangle Rd, Hillsborough, NJ 08844", lat: 40.5200, lng: -74.6500, type: "commercial" },
    { addr: "321 Brooks Blvd, Manville, NJ 08835", lat: 40.5380, lng: -74.5920, type: "residential" },
    { addr: "115 S Main St, Manville, NJ 08835", lat: 40.5415, lng: -74.5886, type: "residential" },
    { addr: "56 Pine Rd, Bound Brook, NJ 08805", lat: 40.5683, lng: -74.5384, type: "residential" },
    { addr: "410 W Union Ave, Bound Brook, NJ 08805", lat: 40.5650, lng: -74.5450, type: "estate_cleanout" },
    { addr: "80 Vosseller Ave, Bound Brook, NJ 08805", lat: 40.5700, lng: -74.5350, type: "residential" },
    { addr: "155 Green Brook Rd, Green Brook, NJ 08812", lat: 40.6082, lng: -74.4811, type: "residential" },
    { addr: "88 Rock Ave, Green Brook, NJ 08812", lat: 40.6050, lng: -74.4750, type: "construction" },
    { addr: "44 Highland Ave, Warren, NJ 07059", lat: 40.6347, lng: -74.5145, type: "residential" },
    { addr: "125 Mt Bethel Rd, Warren, NJ 07059", lat: 40.6400, lng: -74.5200, type: "construction" },
    { addr: "22 Watchung Ave, North Plainfield, NJ 07060", lat: 40.6300, lng: -74.4350, type: "residential" },
    { addr: "67 Washington Ave, North Plainfield, NJ 07060", lat: 40.6334, lng: -74.4275, type: "estate_cleanout" },
    { addr: "340 Valley Rd, Watchung, NJ 07069", lat: 40.6380, lng: -74.4510, type: "residential" },
    { addr: "100 Bonnie Burn Rd, Watchung, NJ 07069", lat: 40.6350, lng: -74.4600, type: "residential" },
    { addr: "75 Industrial Dr, Flemington, NJ 08822", lat: 40.5127, lng: -74.8590, type: "construction" },
    { addr: "200 Route 202, Flemington, NJ 08822", lat: 40.5100, lng: -74.8500, type: "commercial" },
    { addr: "440 Stelton Rd, Piscataway, NJ 08854", lat: 40.5542, lng: -74.4536, type: "construction" },
    { addr: "88 Valley Rd, Middlesex, NJ 08846", lat: 40.5724, lng: -74.4935, type: "residential" },
    { addr: "330 Easton Ave, New Brunswick, NJ 08901", lat: 40.4862, lng: -74.4518, type: "residential" },
    { addr: "50 Commercial Ave, New Brunswick, NJ 08901", lat: 40.4900, lng: -74.4550, type: "commercial" },
    { addr: "15 Commerce St, Piscataway, NJ 08854", lat: 40.5500, lng: -74.4600, type: "construction" },
    { addr: "42 Commerce Blvd, Piscataway, NJ 08854", lat: 40.5542, lng: -74.4536, type: "commercial" },
    { addr: "445 Dukes Pkwy W, Hillsborough, NJ 08844", lat: 40.5050, lng: -74.6250, type: "residential" },
  ];

  // Pick 50 dumpsters to deploy: 12x10yd, 20x20yd, 18x30yd
  const toDeploy = [];
  for (let i = 0; i < 12; i++) toDeploy.push(dd[i]);         // 10yd
  for (let i = 25; i < 45; i++) toDeploy.push(dd[i]);        // 20yd
  for (let i = 55; i < 73; i++) toDeploy.push(dd[i]);        // 30yd

  const rates = { "10yd": 550, "20yd": 750, "30yd": 850 };
  const jobs = [];
  for (let i = 0; i < 50; i++) {
    const d = toDeploy[i];
    const loc = addrs[i];
    const c = customers[i % customers.length];
    const t = trucks[i % trucks.length];
    const dOut = Math.floor(Math.random() * 6) + 1;
    let status = i < 35 ? "active" : i < 42 ? "dropped" : i < 47 ? "pickup_requested" : "en_route_pickup";

    jobs.push({
      operator_id: OP_ID, customer_id: c.id, customer_name: c.name, customer_phone: c.phone,
      dumpster_id: d.id, dumpster_unit_number: d.unit_number,
      truck_id: t.id, truck_name: t.name, assigned_driver_id: EDDIE_ID,
      status, job_type: loc.type, drop_address: loc.addr, drop_lat: loc.lat, drop_lng: loc.lng,
      requested_drop_start: daysAgo(dOut), actual_drop_time: daysAgo(dOut),
      requested_pickup_start: daysFromNow(7 - dOut), requested_pickup_end: daysFromNow(7 - dOut),
      base_rate: rates[d.size], weight_charge: 0, daily_overage_charge: 0, discount_amount: 0,
      photos_drop: [], photos_pickup: [],
    });
  }

  const { data: jd, error: jErr } = await supabase.from("jobs").insert(jobs).select();
  if (jErr) { console.error("Job error:", jErr.message); return; }
  console.log("  " + jd.length + " active jobs created");

  // Link dumpsters
  for (let i = 0; i < 50; i++) {
    await supabase.from("dumpsters").update({ status: "deployed", current_job_id: jd[i].id }).eq("id", toDeploy[i].id);
  }
  console.log("  50 dumpsters set to deployed");

  // 3 in repair
  await supabase.from("dumpsters").update({ status: "repair", repair_notes: "Damaged door hinge - needs welding", condition_grade: "D" })
    .in("id", [dd[73].id, dd[74].id, dd[75].id]);
  console.log("  3 dumpsters set to repair");

  // 3 scheduled (assigned)
  const sched = [
    { operator_id: OP_ID, customer_id: customers[14].id, customer_name: customers[14].name, customer_phone: customers[14].phone, dumpster_id: dd[20].id, dumpster_unit_number: dd[20].unit_number, truck_id: trucks[0].id, truck_name: trucks[0].name, assigned_driver_id: EDDIE_ID, status: "scheduled", job_type: "residential", drop_address: "99 Liberty St, South Bound Brook, NJ 08880", drop_lat: 40.5543, drop_lng: -74.5316, requested_drop_start: daysFromNow(1), requested_drop_end: daysFromNow(1), base_rate: 550, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: customers[5].id, customer_name: customers[5].name, customer_phone: customers[5].phone, dumpster_id: dd[50].id, dumpster_unit_number: dd[50].unit_number, truck_id: trucks[1].id, truck_name: trucks[1].name, assigned_driver_id: EDDIE_ID, status: "scheduled", job_type: "construction", drop_address: "600 Route 206, Hillsborough, NJ 08844", drop_lat: 40.4750, drop_lng: -74.6450, requested_drop_start: daysFromNow(1), requested_drop_end: daysFromNow(1), base_rate: 750, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: customers[13].id, customer_name: customers[13].name, customer_phone: customers[13].phone, dumpster_id: dd[76].id, dumpster_unit_number: dd[76].unit_number, truck_id: trucks[0].id, truck_name: trucks[0].name, assigned_driver_id: EDDIE_ID, status: "scheduled", job_type: "construction", drop_address: "75 Industrial Dr, Flemington, NJ 08822", drop_lat: 40.5127, drop_lng: -74.8590, requested_drop_start: daysFromNow(2), requested_drop_end: daysFromNow(2), base_rate: 850, photos_drop: [], photos_pickup: [] },
  ];
  await supabase.from("dumpsters").update({ status: "assigned" }).in("id", [dd[20].id, dd[50].id, dd[76].id]);
  await supabase.from("jobs").insert(sched);
  console.log("  3 scheduled jobs created");

  // 15 historical paid jobs
  const hist = [];
  for (let i = 0; i < 15; i++) {
    const c = customers[i % customers.length];
    const t = trucks[i % trucks.length];
    const loc = addrs[(i + 20) % addrs.length];
    const back = 14 + Math.floor(Math.random() * 30);
    hist.push({
      operator_id: OP_ID, customer_id: c.id, customer_name: c.name, customer_phone: c.phone,
      truck_id: t.id, truck_name: t.name, assigned_driver_id: EDDIE_ID,
      status: "paid", job_type: loc.type, drop_address: loc.addr, drop_lat: loc.lat, drop_lng: loc.lng,
      requested_drop_start: daysAgo(back), actual_drop_time: daysAgo(back),
      actual_pickup_time: daysAgo(back - 7), days_on_site: 7,
      weight_lbs: 2000 + Math.floor(Math.random() * 6000),
      base_rate: [550, 750, 850][i % 3], weight_charge: Math.random() > 0.7 ? 150 : 0,
      daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [],
    });
  }
  await supabase.from("jobs").insert(hist);
  console.log("  15 historical paid jobs created");

  // Final summary
  const { data: all } = await supabase.from("dumpsters").select("status").eq("operator_id", OP_ID);
  const counts = {};
  all.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });

  console.log("\n=== FLEET SUMMARY ===");
  console.log("Total: " + all.length);
  Object.entries(counts).sort().forEach(([s, c]) => console.log("  " + s + ": " + c));
  console.log("=====================");
}

reseed().catch(console.error);
