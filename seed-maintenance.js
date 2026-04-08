/**
 * seed-maintenance.js
 *
 * Seed realistic maintenance history for both Metro Waste trucks.
 * Run against Supabase with: node seed-maintenance.js
 *
 * Prerequisites:
 *   - Run migration-service-types.sql first to expand the check constraint
 *   - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *     (or edit the constants below)
 *
 * Truck 1  Peterbilt 348  87,432 mi
 * Truck 2  Kenworth T370  42,100 mi
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.");
  process.exit(1);
}

// -----------------------------------------------------------
// Supabase REST helper (no SDK dependency)
// -----------------------------------------------------------
async function supabaseQuery(table, method = "GET", body = null, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : "return=minimal",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${table} failed (${res.status}): ${text}`);
  }

  if (method === "GET" || (method === "POST" && body)) {
    return res.json();
  }
  return null;
}

// -----------------------------------------------------------
// Maintenance intervals (mirrors lib/maintenance-schedule.ts)
// -----------------------------------------------------------
const INTERVALS = {
  oil:            { miles: 10000, days: 180 },
  transmission:   { miles: 30000, days: 730 },
  hydraulics:     { miles: 5000,  days: 90  },
  brakes:         { miles: 15000, days: 180 },
  brake_pads:     { miles: 30000, days: null },
  tire_rotation:  { miles: 10000, days: 180 },
  tires:          { miles: 50000, days: 1095 },
  exhaust_dpf:    { miles: 100000, days: 365 },
  coolant:        { miles: 30000, days: 730 },
  air_filter:     { miles: 15000, days: 180 },
  fuel_filter:    { miles: 15000, days: 365 },
  bearings:       { miles: 50000, days: 730 },
  dot_inspection: { miles: null,  days: 365 },
  registration:   { miles: null,  days: 365 },
  inspection:     { miles: null,  days: 180 },
};

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function nextDueMiles(serviceType, mileage) {
  const interval = INTERVALS[serviceType];
  if (!interval || interval.miles === null) return null;
  return mileage + interval.miles;
}

function nextDueDate(serviceType, datePerformed) {
  const interval = INTERVALS[serviceType];
  if (!interval || interval.days === null) return null;
  return addDays(datePerformed, interval.days);
}

// -----------------------------------------------------------
// Seed data
// -----------------------------------------------------------

// Service history for Truck 1 — Peterbilt 348, currently at 87,432 mi
// Intentionally creates yellow/red warnings for items coming due.
const TRUCK1_HISTORY = [
  // Oil change at 80,000 — due at 90,000 (2,568 mi away = upcoming/yellow)
  { service_type: "oil", date_performed: "2025-10-15", mileage_at_service: 80000, cost: 185, vendor: "NJ Truck Center", notes: "Synthetic 15W-40" },
  // Hydraulics at 85,000 — due at 90,000 (2,568 mi away = upcoming) but time due soon
  { service_type: "hydraulics", date_performed: "2025-12-20", mileage_at_service: 85000, cost: 320, vendor: "NJ Truck Center", notes: "Fluid change + filter" },
  // Brake inspection at 75,000 — due at 90,000 but 6 months from Sep = Mar (overdue by time)
  { service_type: "brakes", date_performed: "2025-06-10", mileage_at_service: 75000, cost: 125, vendor: "Metro Brake & Clutch", notes: "Front and rear inspection" },
  // Tires at 60,000 — not due until 110,000 by miles, but coming up on 3 years
  { service_type: "tires", date_performed: "2024-01-20", mileage_at_service: 60000, cost: 4200, vendor: "Michelin Dealer", notes: "Full set — steer + drive + trailer" },
  // Tire rotation at 80,000 — due at 90,000
  { service_type: "tire_rotation", date_performed: "2025-10-15", mileage_at_service: 80000, cost: 150, vendor: "NJ Truck Center" },
  // Transmission at 60,000 — not due until 90,000
  { service_type: "transmission", date_performed: "2024-06-15", mileage_at_service: 60000, cost: 650, vendor: "NJ Truck Center", notes: "Allison fluid + filter" },
  // Air filter at 75,000 — due at 90,000 (upcoming)
  { service_type: "air_filter", date_performed: "2025-07-01", mileage_at_service: 75000, cost: 85, vendor: "NJ Truck Center" },
  // Fuel filter at 75,000 — due at 90,000
  { service_type: "fuel_filter", date_performed: "2025-07-01", mileage_at_service: 75000, cost: 95, vendor: "NJ Truck Center" },
  // Coolant at 60,000 — not due until 90,000
  { service_type: "coolant", date_performed: "2024-06-15", mileage_at_service: 60000, cost: 220, vendor: "NJ Truck Center" },
  // DOT inspection — done 11 months ago (due soon)
  { service_type: "dot_inspection", date_performed: "2025-05-01", mileage_at_service: 72000, cost: 175, vendor: "State Inspection", notes: "Annual DOT" },
  // Registration — done 10 months ago (upcoming)
  { service_type: "registration", date_performed: "2025-06-01", mileage_at_service: 72000, cost: 350, notes: "NJ annual registration" },
  // General inspection — 7 months ago (overdue — every 6 months)
  { service_type: "inspection", date_performed: "2025-08-15", mileage_at_service: 78000, cost: 75, vendor: "State Inspection" },
  // Exhaust/DPF — done at initial service, long interval
  { service_type: "exhaust_dpf", date_performed: "2025-01-10", mileage_at_service: 65000, cost: 450, vendor: "Cummins Service", notes: "DPF regen + clean" },
  // Bearings at 50,000 — not due until 100,000
  { service_type: "bearings", date_performed: "2024-04-20", mileage_at_service: 50000, cost: 380, vendor: "NJ Truck Center", notes: "Front wheel bearings repacked" },
  // Brake pads at 60,000 — due at 90,000 (upcoming)
  { service_type: "brake_pads", date_performed: "2024-08-10", mileage_at_service: 60000, cost: 850, vendor: "Metro Brake & Clutch", notes: "Front pads replaced" },
];

// Service history for Truck 2 — Kenworth T370, currently at 42,100 mi
const TRUCK2_HISTORY = [
  // Oil change at 40,000 — due at 50,000 (7,900 mi away = good)
  { service_type: "oil", date_performed: "2026-01-10", mileage_at_service: 40000, cost: 185, vendor: "NJ Truck Center", notes: "Synthetic 15W-40" },
  // Hydraulics at 40,000 — due at 45,000 (2,900 mi = upcoming)
  { service_type: "hydraulics", date_performed: "2026-01-10", mileage_at_service: 40000, cost: 320, vendor: "NJ Truck Center" },
  // Brakes at 30,000 — due at 45,000 (2,900 mi = upcoming)
  { service_type: "brakes", date_performed: "2025-07-20", mileage_at_service: 30000, cost: 125, vendor: "Metro Brake & Clutch" },
  // Tires at 35,000 — not due until 85,000
  { service_type: "tires", date_performed: "2025-09-01", mileage_at_service: 35000, cost: 3800, vendor: "Michelin Dealer", notes: "Full set" },
  // Tire rotation at 35,000 — due at 45,000 (2,900 mi = upcoming)
  { service_type: "tire_rotation", date_performed: "2025-09-01", mileage_at_service: 35000, cost: 150, vendor: "NJ Truck Center" },
  // Air filter at 30,000 — due at 45,000 (upcoming)
  { service_type: "air_filter", date_performed: "2025-08-15", mileage_at_service: 30000, cost: 85, vendor: "NJ Truck Center" },
  // Fuel filter at 30,000 — due at 45,000
  { service_type: "fuel_filter", date_performed: "2025-08-15", mileage_at_service: 30000, cost: 95, vendor: "NJ Truck Center" },
  // Transmission at 30,000 — not due until 60,000
  { service_type: "transmission", date_performed: "2025-08-15", mileage_at_service: 30000, cost: 650, vendor: "NJ Truck Center" },
  // Coolant at 30,000 — not due until 60,000
  { service_type: "coolant", date_performed: "2025-08-15", mileage_at_service: 30000, cost: 220, vendor: "NJ Truck Center" },
  // DOT inspection — 6 months ago (upcoming by time)
  { service_type: "dot_inspection", date_performed: "2025-09-15", mileage_at_service: 36000, cost: 175, vendor: "State Inspection" },
  // Registration — 8 months ago (upcoming)
  { service_type: "registration", date_performed: "2025-08-01", mileage_at_service: 30000, cost: 350, notes: "NJ annual registration" },
  // General inspection — 5 months ago (good — every 6 months)
  { service_type: "inspection", date_performed: "2025-10-20", mileage_at_service: 38000, cost: 75, vendor: "State Inspection" },
  // Bearings — never serviced on this truck yet (low mileage)
  // Brake pads — not needed yet at 42k
  // Exhaust/DPF — done early
  { service_type: "exhaust_dpf", date_performed: "2025-11-01", mileage_at_service: 38000, cost: 350, vendor: "Cummins Service", notes: "Preventive DPF clean" },
];

// -----------------------------------------------------------
// Main seed function
// -----------------------------------------------------------
async function main() {
  console.log("Fetching trucks...");

  // Get all trucks for this operator
  const trucks = await supabaseQuery("trucks", "GET", null, "?select=id,name,operator_id,current_mileage&order=name");

  if (!trucks || trucks.length === 0) {
    console.error("No trucks found in database. Seed the trucks table first.");
    process.exit(1);
  }

  console.log(`Found ${trucks.length} truck(s):`);
  trucks.forEach((t) => console.log(`  - ${t.name} (${t.id}) @ ${t.current_mileage} mi`));

  // Match by name pattern or just use first two
  const truck1 = trucks.find((t) => /peterbilt/i.test(t.name) || /truck.*1/i.test(t.name)) || trucks[0];
  const truck2 = trucks.find((t) => /kenworth/i.test(t.name) || /truck.*2/i.test(t.name)) || trucks[1];

  if (!truck1) {
    console.error("Could not identify Truck 1");
    process.exit(1);
  }

  const operatorId = truck1.operator_id;
  console.log(`\nOperator ID: ${operatorId}`);

  // Seed Truck 1
  console.log(`\nSeeding ${truck1.name}...`);
  for (const entry of TRUCK1_HISTORY) {
    const record = {
      truck_id: truck1.id,
      operator_id: operatorId,
      ...entry,
      next_due_miles: nextDueMiles(entry.service_type, entry.mileage_at_service),
      next_due_date: nextDueDate(entry.service_type, entry.date_performed),
    };
    await supabaseQuery("truck_service_log", "POST", record);
    console.log(`  + ${entry.service_type} @ ${entry.mileage_at_service} mi`);
  }

  // Update truck 1 mileage to 87,432
  await supabaseQuery(
    "trucks",
    "PATCH",
    { current_mileage: 87432 },
    `?id=eq.${truck1.id}`
  );
  console.log(`  Updated mileage to 87,432`);

  // Seed Truck 2 (if it exists)
  if (truck2 && truck2.id !== truck1.id) {
    console.log(`\nSeeding ${truck2.name}...`);
    for (const entry of TRUCK2_HISTORY) {
      const record = {
        truck_id: truck2.id,
        operator_id: operatorId,
        ...entry,
        next_due_miles: nextDueMiles(entry.service_type, entry.mileage_at_service),
        next_due_date: nextDueDate(entry.service_type, entry.date_performed),
      };
      await supabaseQuery("truck_service_log", "POST", record);
      console.log(`  + ${entry.service_type} @ ${entry.mileage_at_service} mi`);
    }

    // Update truck 2 mileage to 42,100
    await supabaseQuery(
      "trucks",
      "PATCH",
      { current_mileage: 42100 },
      `?id=eq.${truck2.id}`
    );
    console.log(`  Updated mileage to 42,100`);
  } else {
    console.log("\nOnly one truck found — skipping Truck 2 seed.");
  }

  console.log("\nDone! Maintenance history seeded successfully.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
