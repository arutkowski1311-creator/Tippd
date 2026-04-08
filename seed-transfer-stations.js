const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://gtrelxnbhzwrurhmrurc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cmVseG5iaHp3cnVyaG1ydXJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU1NzUxOSwiZXhwIjoyMDkwMTMzNTE5fQ.dKAqBT-v5SfWRLuRbuVld2UpmiJ7eFY-ia6hTX9o6ew"
);
const OP_ID = "d216a6c0-d75d-4f87-a258-e8f0a6ce1328";

// All NJ transfer stations with geocoded coordinates
// Only including stations Metro Waste would realistically use (within ~50mi of Branchburg)
const stations = [
  // PRIMARY — closest to Bound Brook/Branchburg (Metro's area)
  { name: "Bridgewater Resources, Inc.", address: "15 Polhemus Lane, Bridgewater, NJ 08807", lat: 40.5580, lng: -74.5432, cost_per_ton: 85, wait: 20 },
  { name: "RSNJ, LLC - Middlesex", address: "92 Baekeland Ave, Middlesex, NJ 08846", lat: 40.5724, lng: -74.4935, cost_per_ton: 82, wait: 25 },
  { name: "RSNJ, LLC - So. Plainfield (Harmich)", address: "11 Harmich Rd, South Plainfield, NJ 07080", lat: 40.5650, lng: -74.4150, cost_per_ton: 80, wait: 30 },
  { name: "RSNJ, LLC - So. Plainfield (Roosevelt)", address: "2101 Roosevelt Ave, South Plainfield, NJ 07080", lat: 40.5700, lng: -74.4200, cost_per_ton: 80, wait: 25 },
  { name: "Hunterdon County Util. Authority", address: "Petticoat Lane, Flemington, NJ 08822", lat: 40.5127, lng: -74.8590, cost_per_ton: 78, wait: 15 },

  // SECONDARY — within 30mi
  { name: "RSNJ, LLC - New Brunswick", address: "5 Industrial Drive, New Brunswick, NJ 08901", lat: 40.4862, lng: -74.4518, cost_per_ton: 82, wait: 35 },
  { name: "986 Jersey Avenue", address: "986 Jersey Ave, New Brunswick, NJ 08901", lat: 40.4870, lng: -74.4480, cost_per_ton: 80, wait: 30 },
  { name: "Plainfield City", address: "Rock Ave, Plainfield, NJ 07060", lat: 40.6200, lng: -74.4100, cost_per_ton: 85, wait: 20 },
  { name: "Perth Amboy City Transfer", address: "599 Feyette St, Perth Amboy, NJ 08861", lat: 40.5094, lng: -74.2654, cost_per_ton: 78, wait: 25 },
  { name: "Summit City Transfer", address: "New Providence Ave, Summit, NJ 07901", lat: 40.7157, lng: -74.3649, cost_per_ton: 88, wait: 20 },

  // TERTIARY — 30-50mi range (used when closer ones are full/closed)
  { name: "Waste Mgmt. NJ - Elizabeth", address: "Amboy Ave & Front St, Elizabeth, NJ 07202", lat: 40.6640, lng: -74.2050, cost_per_ton: 90, wait: 40 },
  { name: "Freehold Cartage", address: "825 Hwy 33 East, Freehold Twp, NJ 07728", lat: 40.2540, lng: -74.2690, cost_per_ton: 82, wait: 30 },
  { name: "Morris County MUA (Mt. Olive)", address: "Goldmine Road, Mt. Olive, NJ 07828", lat: 40.8670, lng: -74.7310, cost_per_ton: 80, wait: 20 },
  { name: "Morris County MUA (Par-Troy)", address: "Edwards Rd, Parsippany, NJ 07054", lat: 40.8580, lng: -74.4260, cost_per_ton: 80, wait: 25 },

  // NEWARK AREA — for jobs on the eastern edge of service area
  { name: "Advanced Enterprises Recycling", address: "540 Doremus Ave, Newark, NJ 07105", lat: 40.7128, lng: -74.1421, cost_per_ton: 88, wait: 35 },
  { name: "I.W.S. Transfer Systems - Newark", address: "110 Evergreen Ave, Newark, NJ 07114", lat: 40.7060, lng: -74.1610, cost_per_ton: 85, wait: 30 },
  { name: "Lemcor, Inc.", address: "170 Frelinghuysen Ave, Newark, NJ 07114", lat: 40.7180, lng: -74.1720, cost_per_ton: 86, wait: 30 },
];

async function seed() {
  console.log("Clearing old transfer stations...");
  await supabase.from("dump_locations").delete().eq("operator_id", OP_ID);

  console.log("Inserting " + stations.length + " real NJ transfer stations...");
  const rows = stations.map(s => ({
    operator_id: OP_ID,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    cost_per_ton: s.cost_per_ton,
    estimated_wait_minutes: s.wait,
    is_active: true,
  }));

  const { data, error } = await supabase.from("dump_locations").insert(rows).select();
  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log("  ✓ " + data.length + " transfer stations seeded");
  console.log("\nStations by distance from yard (1 Drake St, Bound Brook):");

  // Sort by distance from yard
  const yardLat = 40.5683, yardLng = -74.5384;
  const sorted = data.map(s => {
    const d = Math.sqrt(Math.pow(s.lat - yardLat, 2) + Math.pow(s.lng - yardLng, 2)) * 69; // rough miles
    return { name: s.name, dist: d.toFixed(1) };
  }).sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));

  sorted.forEach(s => console.log("  " + s.dist + " mi — " + s.name));
}

seed().catch(console.error);
