const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://gtrelxnbhzwrurhmrurc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cmVseG5iaHp3cnVyaG1ydXJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU1NzUxOSwiZXhwIjoyMDkwMTMzNTE5fQ.dKAqBT-v5SfWRLuRbuVld2UpmiJ7eFY-ia6hTX9o6ew"
);

const OP_ID = "d216a6c0-d75d-4f87-a258-e8f0a6ce1328";
const MIKE_ID = "4bb5c13c-7ce8-4ad6-9690-d29110f5815b";
const EDDIE_ID = "56bfa576-aecf-4f5b-9cb0-669ef66d0fc3";

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }
function dateOnly(iso) { return iso.split("T")[0]; }

async function seed() {
  console.log("Seeding test data for Metro Waste...\n");

  // ── TRUCKS (2) ──
  console.log("Creating trucks...");
  const trucks = [
    { operator_id: OP_ID, name: "Truck 1", plate: "NJ-4521", year: 2019, make: "Peterbilt", model: "348", current_mileage: 87432, status: "active" },
    { operator_id: OP_ID, name: "Truck 2", plate: "NJ-7834", year: 2021, make: "Kenworth", model: "T370", current_mileage: 42100, status: "active" },
  ];
  const { data: truckData } = await supabase.from("trucks").insert(trucks).select();
  console.log(`  ✓ ${truckData.length} trucks`);

  // ── DUMPSTERS (85) ──
  console.log("Creating 85 dumpsters...");
  const dumpsters = [];
  const grades = ["A", "A", "A", "B", "B", "C"];
  const statuses10 = ["available", "available", "available", "deployed", "deployed", "in_yard", "available"];
  const statuses20 = ["available", "available", "deployed", "deployed", "deployed", "available", "in_yard"];
  const statuses30 = ["available", "deployed", "deployed", "available", "available", "returning"];

  // 30x 10yd
  for (let i = 1; i <= 30; i++) {
    dumpsters.push({
      operator_id: OP_ID,
      unit_number: `D-1${String(i).padStart(2, "0")}`,
      size: "10yd",
      condition_grade: grades[i % grades.length],
      status: statuses10[i % statuses10.length],
    });
  }
  // 35x 20yd
  for (let i = 1; i <= 35; i++) {
    dumpsters.push({
      operator_id: OP_ID,
      unit_number: `D-2${String(i).padStart(2, "0")}`,
      size: "20yd",
      condition_grade: grades[i % grades.length],
      status: statuses20[i % statuses20.length],
    });
  }
  // 20x 30yd
  for (let i = 1; i <= 20; i++) {
    dumpsters.push({
      operator_id: OP_ID,
      unit_number: `D-3${String(i).padStart(2, "0")}`,
      size: "30yd",
      condition_grade: grades[i % grades.length],
      status: statuses30[i % statuses30.length],
    });
  }

  const { data: dumpsterData } = await supabase.from("dumpsters").insert(dumpsters).select();
  console.log(`  ✓ ${dumpsterData.length} dumpsters`);

  // Helper to find dumpsters by size/status
  const findDumpster = (size, status) => dumpsterData.find(d => d.size === size && d.status === status);
  const deployedDumpsters = dumpsterData.filter(d => d.status === "deployed");

  // ── DUMP LOCATIONS ──
  console.log("Creating dump locations...");
  const dumps = [
    { operator_id: OP_ID, name: "Bridgewater Transfer Station", address: "500 Foothill Rd, Bridgewater, NJ 08807", lat: 40.5684, lng: -74.6177, cost_per_ton: 85, estimated_wait_minutes: 20 },
    { operator_id: OP_ID, name: "Middlesex County Landfill", address: "100 Edgeboro Rd, East Brunswick, NJ 08816", lat: 40.4218, lng: -74.4156, cost_per_ton: 78, estimated_wait_minutes: 35 },
    { operator_id: OP_ID, name: "IESI Blue Ridge Landfill", address: "10 Polhemus Ln, Bound Brook, NJ 08805", lat: 40.5580, lng: -74.5432, cost_per_ton: 92, estimated_wait_minutes: 15 },
  ];
  const { data: dumpLocData } = await supabase.from("dump_locations").insert(dumps).select();
  console.log(`  ✓ ${dumpLocData.length} dump locations`);

  // ── CUSTOMERS (20) ──
  console.log("Creating customers...");
  const customers = [
    { operator_id: OP_ID, name: "John Martinez", phone: "(908) 555-0101", email: "john.m@email.com", type: "residential", billing_address: "45 Cedar Ave, Manville, NJ 08835", notes: "Narrow driveway — use side street", pain_score: 2 },
    { operator_id: OP_ID, name: "Sarah Chen", phone: "(908) 555-0102", email: "sarah.chen@email.com", type: "residential", billing_address: "789 Oak St, Somerville, NJ 08876", pain_score: 1 },
    { operator_id: OP_ID, name: "Bob Wilson", phone: "(908) 555-0103", email: "bwilson@email.com", type: "residential", billing_address: "234 Elm Dr, Bridgewater, NJ 08807", pain_score: 1 },
    { operator_id: OP_ID, name: "Maria Santos", phone: "(732) 555-0104", email: "maria.s@email.com", type: "residential", billing_address: "56 Pine Rd, Bound Brook, NJ 08805", pain_score: 3 },
    { operator_id: OP_ID, name: "Tony Ricci", phone: "(908) 555-0105", email: "tricci@email.com", type: "residential", billing_address: "112 Maple Ln, Raritan, NJ 08869", notes: "Repeat customer — always tips driver", pain_score: 1 },
    { operator_id: OP_ID, name: "ABC Construction LLC", phone: "(908) 555-0201", email: "office@abcconst.com", type: "contractor", billing_address: "800 Industrial Way, Hillsborough, NJ 08844", autopay_enabled: true, notes: "Net 30 terms", pain_score: 1 },
    { operator_id: OP_ID, name: "Summit Builders", phone: "(908) 555-0202", email: "dispatch@summitbuilders.com", type: "contractor", billing_address: "350 Route 22, Green Brook, NJ 08812", autopay_enabled: true, pain_score: 2 },
    { operator_id: OP_ID, name: "Garcia Roofing", phone: "(732) 555-0203", email: "joe@garciaroofing.com", type: "contractor", billing_address: "15 Commerce St, Piscataway, NJ 08854", pain_score: 1 },
    { operator_id: OP_ID, name: "Lisa Thompson", phone: "(908) 555-0106", email: "lisathompson@email.com", type: "residential", billing_address: "67 Washington Ave, North Plainfield, NJ 07060", pain_score: 4 },
    { operator_id: OP_ID, name: "Dave & Karen Murphy", phone: "(908) 555-0107", email: "murphys@email.com", type: "residential", billing_address: "321 Brooks Blvd, Manville, NJ 08835", pain_score: 1 },
    { operator_id: OP_ID, name: "Horizon Development Group", phone: "(908) 555-0204", email: "projects@horizondg.com", type: "contractor", billing_address: "200 Main St Suite 4, Somerville, NJ 08876", autopay_enabled: true, notes: "Large commercial. Usually 20yd or 30yd.", pain_score: 1 },
    { operator_id: OP_ID, name: "Frank Rossi", phone: "(732) 555-0108", email: "frossi@email.com", type: "residential", billing_address: "88 Valley Rd, Middlesex, NJ 08846", pain_score: 2 },
    { operator_id: OP_ID, name: "Jennifer Walsh", phone: "(908) 555-0109", email: "jwalsh@email.com", type: "residential", billing_address: "44 Highland Ave, Warren, NJ 07059", notes: "Estate cleanout — may need multiple loads", pain_score: 1 },
    { operator_id: OP_ID, name: "NJ Demo Pros", phone: "(908) 555-0205", email: "info@njdemopros.com", type: "contractor", billing_address: "75 Industrial Dr, Flemington, NJ 08822", pain_score: 3 },
    { operator_id: OP_ID, name: "Kevin Park", phone: "(908) 555-0110", email: "kpark@email.com", type: "residential", billing_address: "99 Liberty St, South Bound Brook, NJ 08880", pain_score: 1 },
    { operator_id: OP_ID, name: "Reliable Plumbing Co", phone: "(908) 555-0206", email: "jobs@reliableplumb.com", type: "contractor", billing_address: "42 Commerce Blvd, Piscataway, NJ 08854", autopay_enabled: true, pain_score: 1 },
    { operator_id: OP_ID, name: "Angela DiNapoli", phone: "(908) 555-0111", email: "angela.d@email.com", type: "residential", billing_address: "155 Green Brook Rd, Green Brook, NJ 08812", pain_score: 1 },
    { operator_id: OP_ID, name: "Mike & Sons Landscaping", phone: "(732) 555-0207", email: "mikesons@email.com", type: "contractor", billing_address: "330 Easton Ave, New Brunswick, NJ 08901", pain_score: 2 },
    { operator_id: OP_ID, name: "Patricia Novak", phone: "(908) 555-0112", email: "pnovak@email.com", type: "residential", billing_address: "22 Watchung Ave, North Plainfield, NJ 07060", pain_score: 1 },
    { operator_id: OP_ID, name: "Central Jersey Reno", phone: "(908) 555-0208", email: "info@cjreno.com", type: "contractor", billing_address: "500 Hamilton St, Somerset, NJ 08873", autopay_enabled: true, pain_score: 1 },
  ];
  const { data: custData } = await supabase.from("customers").insert(customers).select();
  console.log(`  ✓ ${custData.length} customers`);

  // ── JOBS (30+) ──
  console.log("Creating jobs...");
  const deployed10 = dumpsterData.filter(d => d.size === "10yd" && d.status === "deployed");
  const deployed20 = dumpsterData.filter(d => d.size === "20yd" && d.status === "deployed");
  const deployed30 = dumpsterData.filter(d => d.size === "30yd" && d.status === "deployed");
  const avail10 = dumpsterData.filter(d => d.size === "10yd" && d.status === "available");
  const avail20 = dumpsterData.filter(d => d.size === "20yd" && d.status === "available");
  const avail30 = dumpsterData.filter(d => d.size === "30yd" && d.status === "available");

  const jobs = [
    // ── PAID (6) ──
    { operator_id: OP_ID, customer_id: custData[0].id, customer_name: "John Martinez", customer_phone: "(908) 555-0101", truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "paid", job_type: "residential", drop_address: "45 Cedar Ave, Manville, NJ 08835", drop_lat: 40.5415, drop_lng: -74.5886, requested_drop_start: daysAgo(28), actual_drop_time: daysAgo(28), actual_pickup_time: daysAgo(21), days_on_site: 7, weight_lbs: 3200, base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[1].id, customer_name: "Sarah Chen", customer_phone: "(908) 555-0102", truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "paid", job_type: "residential", drop_address: "789 Oak St, Somerville, NJ 08876", drop_lat: 40.5743, drop_lng: -74.6099, requested_drop_start: daysAgo(25), actual_drop_time: daysAgo(25), actual_pickup_time: daysAgo(18), days_on_site: 7, weight_lbs: 2800, base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[5].id, customer_name: "ABC Construction LLC", customer_phone: "(908) 555-0201", truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "paid", job_type: "construction", drop_address: "150 Route 206, Hillsborough, NJ 08844", drop_lat: 40.4883, drop_lng: -74.6355, requested_drop_start: daysAgo(35), actual_drop_time: daysAgo(35), actual_pickup_time: daysAgo(25), days_on_site: 10, weight_lbs: 7200, base_rate: 750, weight_charge: 150, daily_overage_charge: 45, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[4].id, customer_name: "Tony Ricci", customer_phone: "(908) 555-0105", truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "paid", job_type: "residential", drop_address: "112 Maple Ln, Raritan, NJ 08869", drop_lat: 40.5693, drop_lng: -74.6331, requested_drop_start: daysAgo(22), actual_drop_time: daysAgo(22), actual_pickup_time: daysAgo(15), days_on_site: 7, weight_lbs: 3600, base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 50, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[16].id, customer_name: "Angela DiNapoli", customer_phone: "(908) 555-0111", truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "paid", job_type: "residential", drop_address: "155 Green Brook Rd, Green Brook, NJ 08812", drop_lat: 40.6082, drop_lng: -74.4811, requested_drop_start: daysAgo(20), actual_drop_time: daysAgo(20), actual_pickup_time: daysAgo(13), days_on_site: 7, weight_lbs: 4100, base_rate: 750, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[15].id, customer_name: "Reliable Plumbing Co", customer_phone: "(908) 555-0206", truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "paid", job_type: "commercial", drop_address: "42 Commerce Blvd, Piscataway, NJ 08854", drop_lat: 40.5542, drop_lng: -74.4536, requested_drop_start: daysAgo(18), actual_drop_time: daysAgo(18), actual_pickup_time: daysAgo(11), days_on_site: 7, weight_lbs: 5100, base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── INVOICED (3) ──
    { operator_id: OP_ID, customer_id: custData[6].id, customer_name: "Summit Builders", customer_phone: "(908) 555-0202", truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "invoiced", job_type: "construction", drop_address: "88 Valley Rd, Green Brook, NJ 08812", drop_lat: 40.6082, drop_lng: -74.4811, requested_drop_start: daysAgo(14), actual_drop_time: daysAgo(14), actual_pickup_time: daysAgo(5), days_on_site: 9, weight_lbs: 8400, base_rate: 850, weight_charge: 150, daily_overage_charge: 30, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[8].id, customer_name: "Lisa Thompson", customer_phone: "(908) 555-0106", truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "invoiced", job_type: "estate_cleanout", drop_address: "67 Washington Ave, North Plainfield, NJ 07060", drop_lat: 40.6334, drop_lng: -74.4275, requested_drop_start: daysAgo(12), actual_drop_time: daysAgo(12), actual_pickup_time: daysAgo(3), days_on_site: 9, weight_lbs: 5600, base_rate: 750, weight_charge: 0, daily_overage_charge: 30, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[19].id, customer_name: "Central Jersey Reno", customer_phone: "(908) 555-0208", truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "invoiced", job_type: "construction", drop_address: "500 Hamilton St, Somerset, NJ 08873", drop_lat: 40.4970, drop_lng: -74.4880, requested_drop_start: daysAgo(16), actual_drop_time: daysAgo(16), actual_pickup_time: daysAgo(7), days_on_site: 9, weight_lbs: 9200, base_rate: 850, weight_charge: 300, daily_overage_charge: 30, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── PICKED_UP (2) ──
    { operator_id: OP_ID, customer_id: custData[11].id, customer_name: "Frank Rossi", customer_phone: "(732) 555-0108", truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "picked_up", job_type: "residential", drop_address: "88 Valley Rd, Middlesex, NJ 08846", drop_lat: 40.5724, drop_lng: -74.4935, requested_drop_start: daysAgo(10), actual_drop_time: daysAgo(10), actual_pickup_time: daysAgo(1), days_on_site: 9, weight_lbs: 4100, base_rate: 550, weight_charge: 0, daily_overage_charge: 30, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[17].id, customer_name: "Mike & Sons Landscaping", customer_phone: "(732) 555-0207", truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "picked_up", job_type: "residential", drop_address: "330 Easton Ave, New Brunswick, NJ 08901", drop_lat: 40.4862, drop_lng: -74.4518, requested_drop_start: daysAgo(9), actual_drop_time: daysAgo(9), actual_pickup_time: daysAgo(1), days_on_site: 8, weight_lbs: 6200, base_rate: 750, weight_charge: 0, daily_overage_charge: 15, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── ACTIVE (5) — dumpsters on site ──
    { operator_id: OP_ID, customer_id: custData[2].id, customer_name: "Bob Wilson", customer_phone: "(908) 555-0103", dumpster_id: deployed10[0]?.id, dumpster_unit_number: deployed10[0]?.unit_number, truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "active", job_type: "residential", drop_address: "234 Elm Dr, Bridgewater, NJ 08807", drop_lat: 40.5934, drop_lng: -74.6241, requested_drop_start: daysAgo(5), actual_drop_time: daysAgo(5), requested_pickup_start: daysFromNow(2), requested_pickup_end: daysFromNow(2), base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[7].id, customer_name: "Garcia Roofing", customer_phone: "(732) 555-0203", dumpster_id: deployed20[0]?.id, dumpster_unit_number: deployed20[0]?.unit_number, truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "active", job_type: "construction", drop_address: "440 Stelton Rd, Piscataway, NJ 08854", drop_lat: 40.5542, drop_lng: -74.4536, requested_drop_start: daysAgo(3), actual_drop_time: daysAgo(3), requested_pickup_start: daysFromNow(4), requested_pickup_end: daysFromNow(4), base_rate: 750, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[10].id, customer_name: "Horizon Development Group", customer_phone: "(908) 555-0204", dumpster_id: deployed30[0]?.id, dumpster_unit_number: deployed30[0]?.unit_number, truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "active", job_type: "commercial", drop_address: "200 Main St, Somerville, NJ 08876", drop_lat: 40.5740, drop_lng: -74.6103, requested_drop_start: daysAgo(6), actual_drop_time: daysAgo(6), requested_pickup_start: daysFromNow(1), requested_pickup_end: daysFromNow(1), base_rate: 850, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[12].id, customer_name: "Jennifer Walsh", customer_phone: "(908) 555-0109", dumpster_id: deployed30[1]?.id, dumpster_unit_number: deployed30[1]?.unit_number, truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "active", job_type: "estate_cleanout", drop_address: "44 Highland Ave, Warren, NJ 07059", drop_lat: 40.6347, drop_lng: -74.5145, requested_drop_start: daysAgo(4), actual_drop_time: daysAgo(4), requested_pickup_start: daysFromNow(3), requested_pickup_end: daysFromNow(3), base_rate: 850, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[18].id, customer_name: "Patricia Novak", customer_phone: "(908) 555-0112", dumpster_id: deployed10[1]?.id, dumpster_unit_number: deployed10[1]?.unit_number, truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "active", job_type: "residential", drop_address: "22 Watchung Ave, North Plainfield, NJ 07060", drop_lat: 40.6300, drop_lng: -74.4350, requested_drop_start: daysAgo(2), actual_drop_time: daysAgo(2), requested_pickup_start: daysFromNow(5), requested_pickup_end: daysFromNow(5), base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── DROPPED (1) — just delivered ──
    { operator_id: OP_ID, customer_id: custData[9].id, customer_name: "Dave & Karen Murphy", customer_phone: "(908) 555-0107", dumpster_id: deployed20[1]?.id, dumpster_unit_number: deployed20[1]?.unit_number, truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "dropped", job_type: "residential", drop_address: "321 Brooks Blvd, Manville, NJ 08835", drop_lat: 40.5380, drop_lng: -74.5920, requested_drop_start: daysAgo(0), actual_drop_time: daysAgo(0), requested_pickup_start: daysFromNow(7), requested_pickup_end: daysFromNow(7), base_rate: 750, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── PICKUP_REQUESTED (2) ──
    { operator_id: OP_ID, customer_id: custData[3].id, customer_name: "Maria Santos", customer_phone: "(732) 555-0104", status: "pickup_requested", job_type: "residential", drop_address: "56 Pine Rd, Bound Brook, NJ 08805", drop_lat: 40.5683, drop_lng: -74.5384, requested_drop_start: daysAgo(9), actual_drop_time: daysAgo(9), base_rate: 550, weight_charge: 0, daily_overage_charge: 30, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[15].id, customer_name: "Reliable Plumbing Co", customer_phone: "(908) 555-0206", status: "pickup_requested", job_type: "commercial", drop_address: "42 Commerce Blvd, Piscataway, NJ 08854", drop_lat: 40.5542, drop_lng: -74.4536, requested_drop_start: daysAgo(8), actual_drop_time: daysAgo(8), base_rate: 750, weight_charge: 0, daily_overage_charge: 15, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── SCHEDULED (3) — upcoming drops ──
    { operator_id: OP_ID, customer_id: custData[14].id, customer_name: "Kevin Park", customer_phone: "(908) 555-0110", dumpster_id: avail10[0]?.id, dumpster_unit_number: avail10[0]?.unit_number, truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "scheduled", job_type: "residential", drop_address: "99 Liberty St, South Bound Brook, NJ 08880", drop_lat: 40.5543, drop_lng: -74.5316, requested_drop_start: daysFromNow(1) + "T07:00:00", requested_drop_end: daysFromNow(1) + "T12:00:00", base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[5].id, customer_name: "ABC Construction LLC", customer_phone: "(908) 555-0201", dumpster_id: avail20[0]?.id, dumpster_unit_number: avail20[0]?.unit_number, truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "scheduled", job_type: "construction", drop_address: "600 Route 206, Hillsborough, NJ 08844", drop_lat: 40.4750, drop_lng: -74.6450, requested_drop_start: daysFromNow(1) + "T07:00:00", requested_drop_end: daysFromNow(1) + "T12:00:00", base_rate: 750, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[13].id, customer_name: "NJ Demo Pros", customer_phone: "(908) 555-0205", dumpster_id: avail30[0]?.id, dumpster_unit_number: avail30[0]?.unit_number, truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "scheduled", job_type: "construction", drop_address: "75 Industrial Dr, Flemington, NJ 08822", drop_lat: 40.5127, drop_lng: -74.8590, requested_drop_start: daysFromNow(2) + "T12:00:00", requested_drop_end: daysFromNow(2) + "T17:00:00", base_rate: 850, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── EN_ROUTE_DROP (1) — driver heading out now ──
    { operator_id: OP_ID, customer_id: custData[16].id, customer_name: "Angela DiNapoli", customer_phone: "(908) 555-0111", dumpster_id: avail10[1]?.id, dumpster_unit_number: avail10[1]?.unit_number, truck_id: truckData[0].id, truck_name: "Truck 1", assigned_driver_id: EDDIE_ID, status: "en_route_drop", job_type: "residential", drop_address: "155 Green Brook Rd, Green Brook, NJ 08812", drop_lat: 40.6082, drop_lng: -74.4811, requested_drop_start: daysAgo(0) + "T07:00:00", requested_drop_end: daysAgo(0) + "T12:00:00", base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── PICKUP_SCHEDULED (1) ──
    { operator_id: OP_ID, customer_id: custData[0].id, customer_name: "John Martinez", customer_phone: "(908) 555-0101", truck_id: truckData[1].id, truck_name: "Truck 2", assigned_driver_id: EDDIE_ID, status: "pickup_scheduled", job_type: "residential", drop_address: "45 Cedar Ave, Manville, NJ 08835", drop_lat: 40.5415, drop_lng: -74.5886, requested_drop_start: daysAgo(8), actual_drop_time: daysAgo(8), requested_pickup_start: daysFromNow(0) + "T07:00:00", requested_pickup_end: daysFromNow(0) + "T17:00:00", base_rate: 550, weight_charge: 0, daily_overage_charge: 15, discount_amount: 0, photos_drop: [], photos_pickup: [] },

    // ── PENDING_APPROVAL (3) ──
    { operator_id: OP_ID, customer_id: custData[11].id, customer_name: "Frank Rossi", customer_phone: "(732) 555-0108", status: "pending_approval", job_type: "residential", drop_address: "88 Valley Rd, Middlesex, NJ 08846", drop_lat: 40.5724, drop_lng: -74.4935, requested_drop_start: daysFromNow(3), base_rate: 550, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[1].id, customer_name: "Sarah Chen", customer_phone: "(908) 555-0102", status: "pending_approval", job_type: "residential", drop_address: "789 Oak St, Somerville, NJ 08876", drop_lat: 40.5743, drop_lng: -74.6099, requested_drop_start: daysFromNow(4), base_rate: 750, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
    { operator_id: OP_ID, customer_id: custData[19].id, customer_name: "Central Jersey Reno", customer_phone: "(908) 555-0208", status: "pending_approval", job_type: "construction", drop_address: "500 Hamilton St, Somerset, NJ 08873", drop_lat: 40.4970, drop_lng: -74.4880, requested_drop_start: daysFromNow(5), base_rate: 850, weight_charge: 0, daily_overage_charge: 0, discount_amount: 0, photos_drop: [], photos_pickup: [] },
  ];

  const { data: jobData, error: jobErr } = await supabase.from("jobs").insert(jobs).select();
  if (jobErr) { console.error("Job error:", jobErr.message); return; }
  console.log(`  ✓ ${jobData.length} jobs`);

  // ── INVOICES ──
  console.log("Creating invoices...");
  const invoices = [
    { operator_id: OP_ID, job_id: jobData[0].id, customer_id: custData[0].id, status: "paid", issued_date: dateOnly(daysAgo(20)), due_date: dateOnly(daysAgo(0)), subtotal: 550, tax: 0, total: 550, amount_paid: 550, paid_at: daysAgo(17) },
    { operator_id: OP_ID, job_id: jobData[1].id, customer_id: custData[1].id, status: "paid", issued_date: dateOnly(daysAgo(17)), due_date: dateOnly(daysAgo(0)), subtotal: 550, tax: 0, total: 550, amount_paid: 550, paid_at: daysAgo(14) },
    { operator_id: OP_ID, job_id: jobData[2].id, customer_id: custData[5].id, status: "paid", issued_date: dateOnly(daysAgo(24)), due_date: dateOnly(daysAgo(0)), subtotal: 945, tax: 0, total: 945, amount_paid: 945, paid_at: daysAgo(20) },
    { operator_id: OP_ID, job_id: jobData[3].id, customer_id: custData[4].id, status: "paid", issued_date: dateOnly(daysAgo(14)), due_date: dateOnly(daysAgo(0)), subtotal: 500, tax: 0, total: 500, amount_paid: 500, paid_at: daysAgo(12) },
    { operator_id: OP_ID, job_id: jobData[4].id, customer_id: custData[16].id, status: "paid", issued_date: dateOnly(daysAgo(12)), due_date: dateOnly(daysAgo(0)), subtotal: 750, tax: 0, total: 750, amount_paid: 750, paid_at: daysAgo(9) },
    { operator_id: OP_ID, job_id: jobData[5].id, customer_id: custData[15].id, status: "paid", issued_date: dateOnly(daysAgo(10)), due_date: dateOnly(daysAgo(0)), subtotal: 550, tax: 0, total: 550, amount_paid: 550, paid_at: daysAgo(8) },
    { operator_id: OP_ID, job_id: jobData[6].id, customer_id: custData[6].id, status: "sent", issued_date: dateOnly(daysAgo(4)), due_date: dateOnly(daysFromNow(26)), subtotal: 1030, tax: 0, total: 1030, amount_paid: 0 },
    { operator_id: OP_ID, job_id: jobData[7].id, customer_id: custData[8].id, status: "sent", issued_date: dateOnly(daysAgo(2)), due_date: dateOnly(daysFromNow(28)), subtotal: 780, tax: 0, total: 780, amount_paid: 0 },
    { operator_id: OP_ID, job_id: jobData[8].id, customer_id: custData[19].id, status: "sent", issued_date: dateOnly(daysAgo(6)), due_date: dateOnly(daysFromNow(24)), subtotal: 1180, tax: 0, total: 1180, amount_paid: 0 },
    { operator_id: OP_ID, customer_id: custData[3].id, status: "overdue_30", issued_date: dateOnly(daysAgo(40)), due_date: dateOnly(daysAgo(10)), subtotal: 580, tax: 0, total: 580, amount_paid: 0 },
  ];
  const { data: invData } = await supabase.from("invoices").insert(invoices).select();
  console.log(`  ✓ ${invData.length} invoices`);

  // ── EXPENSES ──
  console.log("Creating expenses...");
  const expenses = [
    { operator_id: OP_ID, date: dateOnly(daysAgo(1)), category: "fuel", amount: 285.50, vendor: "Wawa - Bridgewater", truck_id: truckData[0].id, tax_bucket: "vehicle" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(1)), category: "fuel", amount: 310.00, vendor: "Shell - Somerville", truck_id: truckData[1].id, tax_bucket: "vehicle" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(5)), category: "repair", amount: 1250.00, vendor: "NJ Truck Repair", truck_id: truckData[1].id, tax_bucket: "vehicle" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(7)), category: "tolls", amount: 45.80, vendor: "NJ Turnpike Authority", tax_bucket: "vehicle" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(10)), category: "fuel", amount: 278.00, vendor: "BP - Manville", truck_id: truckData[0].id, tax_bucket: "vehicle" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(12)), category: "insurance", amount: 2400.00, vendor: "State Farm Commercial", tax_bucket: "insurance" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(14)), category: "office", amount: 89.99, vendor: "Staples", tax_bucket: "office" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(15)), category: "fuel", amount: 305.25, vendor: "Wawa - Hillsborough", truck_id: truckData[1].id, tax_bucket: "vehicle" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(20)), category: "registration", amount: 350.00, vendor: "NJ MVC", truck_id: truckData[0].id, tax_bucket: "vehicle" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(25)), category: "wages", amount: 3200.00, vendor: "Payroll - Eddie", tax_bucket: "labor" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(2)), category: "utilities", amount: 185.00, vendor: "PSE&G", tax_bucket: "office" },
    { operator_id: OP_ID, date: dateOnly(daysAgo(3)), category: "fuel", amount: 295.75, vendor: "Wawa - Bound Brook", truck_id: truckData[0].id, tax_bucket: "vehicle" },
  ];
  const { data: expData } = await supabase.from("expenses").insert(expenses).select();
  console.log(`  ✓ ${expData.length} expenses`);

  // ── COMMUNICATIONS ──
  console.log("Creating communications...");
  const comms = [
    { operator_id: OP_ID, customer_id: custData[3].id, direction: "inbound", channel: "sms", body: "When is my dumpster getting picked up? Its been over a week.", intent: "pickup_request", auto_responded: false, created_at: daysAgo(1) },
    { operator_id: OP_ID, customer_id: custData[3].id, direction: "outbound", channel: "sms", body: "Hi Maria, pickup is scheduled for tomorrow morning. Thanks for your patience!", created_at: daysAgo(1) },
    { operator_id: OP_ID, customer_id: custData[0].id, direction: "outbound", channel: "sms", body: "Hi John, your dumpster has been delivered! 7-day rental starts today. Text us when you need pickup.", created_at: daysAgo(8) },
    { operator_id: OP_ID, customer_id: custData[5].id, direction: "inbound", channel: "sms", body: "Need another 20yd at the Hillsborough site. Same address.", intent: "booking", auto_responded: false, created_at: daysAgo(2) },
    { operator_id: OP_ID, customer_id: custData[8].id, direction: "inbound", channel: "sms", body: "Can I extend my rental by 3 more days?", intent: "extension", auto_responded: false, created_at: daysAgo(4) },
    { operator_id: OP_ID, customer_id: custData[8].id, direction: "outbound", channel: "sms", body: "Hi Lisa, absolutely! Extended your rental. New pickup is Thursday. $15/day overage applies.", created_at: daysAgo(4) },
    { operator_id: OP_ID, customer_id: custData[9].id, direction: "outbound", channel: "sms", body: "Hi Dave & Karen, your 20-yard dumpster has been delivered to 321 Brooks Blvd. Pickup scheduled for next week!", created_at: daysAgo(0) },
    { operator_id: OP_ID, customer_id: custData[14].id, direction: "outbound", channel: "email", body: "Booking confirmed: 10-yard dumpster to 99 Liberty St on " + dateOnly(daysFromNow(1)), created_at: daysAgo(0) },
    { operator_id: OP_ID, customer_id: custData[13].id, direction: "inbound", channel: "sms", body: "Need a 30 yarder for the Flemington demo job. Day after tomorrow work?", intent: "booking", auto_responded: false, created_at: daysAgo(3) },
    { operator_id: OP_ID, customer_id: custData[6].id, direction: "outbound", channel: "email", body: "Invoice #1007 for $1,030 sent. Payment due within 30 days.", created_at: daysAgo(4) },
  ];
  const { data: commData } = await supabase.from("communications").insert(comms).select();
  console.log(`  ✓ ${commData.length} communications`);

  // ── ROUTES ──
  console.log("Creating routes...");
  const todayStr = dateOnly(new Date().toISOString());
  const tomorrowStr = dateOnly(daysFromNow(1));
  const routes = [
    { operator_id: OP_ID, truck_id: truckData[0].id, driver_id: EDDIE_ID, date: todayStr, status: "in_progress", jobs_sequence: [{ job_id: jobData[22].id, type: "drop", address: "155 Green Brook Rd, Green Brook, NJ", order: 1 }, { job_id: jobData[23].id, type: "pickup", address: "45 Cedar Ave, Manville, NJ", order: 2 }], total_jobs: 2, total_miles: 28, estimated_hours: 3.5 },
    { operator_id: OP_ID, truck_id: truckData[1].id, driver_id: EDDIE_ID, date: tomorrowStr, status: "draft", jobs_sequence: [{ job_id: jobData[19].id, type: "drop", address: "99 Liberty St, South Bound Brook, NJ", order: 1 }, { job_id: jobData[20].id, type: "drop", address: "600 Route 206, Hillsborough, NJ", order: 2 }], total_jobs: 2, total_miles: 35, estimated_hours: 4 },
  ];
  const { data: routeData, error: routeErr } = await supabase.from("routes").insert(routes).select();
  if (routeErr) console.error("Route error:", routeErr.message);
  else console.log(`  ✓ ${routeData.length} routes`);

  // ── TRUCK SERVICE LOG ──
  console.log("Creating service records...");
  const services = [
    { truck_id: truckData[0].id, operator_id: OP_ID, service_type: "Oil Change", date_performed: dateOnly(daysAgo(30)), mileage_at_service: 86000, next_due: dateOnly(daysFromNow(60)), cost: 185, vendor: "NJ Truck Repair" },
    { truck_id: truckData[1].id, operator_id: OP_ID, service_type: "Brake Inspection", date_performed: dateOnly(daysAgo(45)), mileage_at_service: 41000, next_due: dateOnly(daysFromNow(45)), cost: 350, vendor: "Pete's Diesel Service" },
    { truck_id: truckData[0].id, operator_id: OP_ID, service_type: "Tire Rotation", date_performed: dateOnly(daysAgo(60)), mileage_at_service: 84500, cost: 120, vendor: "Discount Tire" },
  ];
  const { data: svcData } = await supabase.from("truck_service_log").insert(services).select();
  console.log(`  ✓ ${svcData.length} service records`);

  console.log("\n✅ Seed complete!");
  console.log("   Dashboard: mike@metrowasteservice.com / Metro2024!");
  console.log("   Driver app: rutkowski.adam@gmail.com / Metro2024!");
}

seed().catch(console.error);
