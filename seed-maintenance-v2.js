/**
 * seed-maintenance-v2.js
 *
 * Seeds the new maintenance_settings and tire_tracking tables with realistic
 * data for both Metro Waste trucks. Also seeds service log history.
 *
 * Prerequisites:
 *   - Run migration-maintenance-v2.sql first
 *   - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *
 * Truck 1: Peterbilt 348 — 87,432 mi, ~2,800 hrs
 * Truck 2: Kenworth T370 — 42,100 mi, ~1,400 hrs
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const OPERATOR_ID = "d216a6c0-d75d-4f87-a258-e8f0a6ce1328";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
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

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}

async function upsertSettings(records) {
  const url = `${SUPABASE_URL}/rest/v1/maintenance_settings`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(records),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upsert maintenance_settings failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function upsertTires(records) {
  const url = `${SUPABASE_URL}/rest/v1/tire_tracking`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(records),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upsert tire_tracking failed (${res.status}): ${text}`);
  }
  return res.json();
}

// -----------------------------------------------------------
// Maintenance settings for Truck 1 — Peterbilt 348 (87,432 mi / 2,800 hrs)
// -----------------------------------------------------------
function getTruck1Settings(truckId) {
  return [
    // Weekly items — varied "days since last" to make some yellow/orange
    { service_type: "grease_pivots", day_interval: 7, hour_interval: 50, current_hours_since: 35, last_service_date: "2026-03-22", notes: null },
    { service_type: "hydraulic_inspection", day_interval: 7, hour_interval: 50, current_hours_since: 42, last_service_date: "2026-03-20" },
    { service_type: "battery", day_interval: 7, hour_interval: 50, current_hours_since: 20, last_service_date: "2026-03-24" },
    { service_type: "air_tanks", day_interval: 7, hour_interval: 50, current_hours_since: 48, last_service_date: "2026-03-18" }, // orange — 9 days
    { service_type: "slack_adjusters", day_interval: 7, hour_interval: 50, current_hours_since: 30, last_service_date: "2026-03-22" },

    // Core service (5k mi) — oil changed 2,000 mi ago etc.
    { service_type: "oil_filter", mile_interval: 5000, current_miles_since: 2000, last_service_date: "2026-02-01", last_service_miles: 85432 },
    { service_type: "fuel_filter", mile_interval: 5000, current_miles_since: 2000, last_service_date: "2026-02-01", last_service_miles: 85432 },
    { service_type: "air_filter", mile_interval: 5000, current_miles_since: 4200, last_service_date: "2025-11-10", last_service_miles: 83232 }, // red — 84% used
    { service_type: "chassis_lube", mile_interval: 5000, current_miles_since: 2000, last_service_date: "2026-02-01", last_service_miles: 85432 },
    { service_type: "belts_hoses", mile_interval: 5000, current_miles_since: 3500, last_service_date: "2025-12-15", last_service_miles: 83932 }, // yellow — 70% used
    { service_type: "brakes_inspection", mile_interval: 5000, current_miles_since: 2000, last_service_date: "2026-02-01", last_service_miles: 85432 },

    // Extended (20k mi)
    { service_type: "transmission", mile_interval: 20000, current_miles_since: 7432, last_service_date: "2025-06-15", last_service_miles: 80000 },
    { service_type: "differential", mile_interval: 20000, current_miles_since: 7432, last_service_date: "2025-06-15", last_service_miles: 80000 },
    { service_type: "air_dryer", mile_interval: 20000, current_miles_since: 17432, last_service_date: "2024-10-01", last_service_miles: 70000 }, // orange — 87% used
    { service_type: "alignment", mile_interval: 20000, current_miles_since: 7432, last_service_date: "2025-06-15", last_service_miles: 80000 },

    // Major (40k mi)
    { service_type: "brakes_full_service", mile_interval: 40000, current_miles_since: 27432, last_service_date: "2024-04-01", last_service_miles: 60000 }, // yellow — 68% used
    { service_type: "suspension", mile_interval: 40000, current_miles_since: 27432, last_service_date: "2024-04-01", last_service_miles: 60000 },
    { service_type: "coolant", mile_interval: 40000, current_miles_since: 27432, last_service_date: "2024-04-01", last_service_miles: 60000 },

    // Hydraulic (by hours)
    { service_type: "hydraulic_filter", hour_interval: 750, current_hours_since: 600, last_service_date: "2025-08-01" }, // red — 80% used
    { service_type: "hydraulic_fluid", hour_interval: 1500, current_hours_since: 800, last_service_date: "2025-04-01" },

    // Annual
    { service_type: "dot_inspection", day_interval: 365, last_service_date: "2025-05-01", last_service_miles: 72000 }, // ~11 months ago — orange
    { service_type: "frame_inspection", day_interval: 365, last_service_date: "2025-10-15", last_service_miles: 82000 },
    { service_type: "electrical", day_interval: 365, last_service_date: "2025-10-15", last_service_miles: 82000 },
    { service_type: "def_system", day_interval: 365, last_service_date: "2025-10-15", last_service_miles: 82000 },
    { service_type: "exhaust_dpf", day_interval: 365, last_service_date: "2025-01-10", last_service_miles: 65000 }, // ~14 months ago — red
    { service_type: "registration", day_interval: 365, last_service_date: "2025-06-01", last_service_miles: 72000 }, // ~10 months ago — orange
    { service_type: "state_inspection", day_interval: 365, last_service_date: "2025-09-01", last_service_miles: 80000 },
  ].map((s) => ({
    truck_id: truckId,
    operator_id: OPERATOR_ID,
    mile_interval: s.mile_interval || null,
    hour_interval: s.hour_interval || null,
    day_interval: s.day_interval || null,
    warning_miles: s.mile_interval ? 500 : 0,
    warning_days: s.day_interval ? (s.day_interval <= 7 ? 2 : 30) : 0,
    current_miles_since: s.current_miles_since || 0,
    current_hours_since: s.current_hours_since || 0,
    last_service_date: s.last_service_date || null,
    last_service_miles: s.last_service_miles || null,
    last_service_hours: null,
    notes: s.notes !== undefined ? s.notes : null,
    is_active: true,
    ...{ service_type: s.service_type },
  }));
}

// -----------------------------------------------------------
// Maintenance settings for Truck 2 — Kenworth T370 (42,100 mi / 1,400 hrs)
// -----------------------------------------------------------
function getTruck2Settings(truckId) {
  return [
    // Weekly — mostly green, one yellow
    { service_type: "grease_pivots", day_interval: 7, hour_interval: 50, current_hours_since: 15, last_service_date: "2026-03-25" },
    { service_type: "hydraulic_inspection", day_interval: 7, hour_interval: 50, current_hours_since: 15, last_service_date: "2026-03-25" },
    { service_type: "battery", day_interval: 7, hour_interval: 50, current_hours_since: 15, last_service_date: "2026-03-25" },
    { service_type: "air_tanks", day_interval: 7, hour_interval: 50, current_hours_since: 15, last_service_date: "2026-03-25" },
    { service_type: "slack_adjusters", day_interval: 7, hour_interval: 50, current_hours_since: 40, last_service_date: "2026-03-21" }, // yellow

    // Core service (5k mi) — generally healthier truck
    { service_type: "oil_filter", mile_interval: 5000, current_miles_since: 1100, last_service_date: "2026-02-15", last_service_miles: 41000 },
    { service_type: "fuel_filter", mile_interval: 5000, current_miles_since: 1100, last_service_date: "2026-02-15", last_service_miles: 41000 },
    { service_type: "air_filter", mile_interval: 5000, current_miles_since: 1100, last_service_date: "2026-02-15", last_service_miles: 41000 },
    { service_type: "chassis_lube", mile_interval: 5000, current_miles_since: 1100, last_service_date: "2026-02-15", last_service_miles: 41000 },
    { service_type: "belts_hoses", mile_interval: 5000, current_miles_since: 2100, last_service_date: "2026-01-10", last_service_miles: 40000 }, // yellow — 42% used
    { service_type: "brakes_inspection", mile_interval: 5000, current_miles_since: 1100, last_service_date: "2026-02-15", last_service_miles: 41000 },

    // Extended (20k mi)
    { service_type: "transmission", mile_interval: 20000, current_miles_since: 12100, last_service_date: "2025-08-15", last_service_miles: 30000 },
    { service_type: "differential", mile_interval: 20000, current_miles_since: 12100, last_service_date: "2025-08-15", last_service_miles: 30000 },
    { service_type: "air_dryer", mile_interval: 20000, current_miles_since: 12100, last_service_date: "2025-08-15", last_service_miles: 30000 },
    { service_type: "alignment", mile_interval: 20000, current_miles_since: 2100, last_service_date: "2026-01-10", last_service_miles: 40000 },

    // Major (40k mi) — low mileage truck, most are fine
    { service_type: "brakes_full_service", mile_interval: 40000, current_miles_since: 12100, last_service_date: "2025-08-15", last_service_miles: 30000 },
    { service_type: "suspension", mile_interval: 40000, current_miles_since: 12100, last_service_date: "2025-08-15", last_service_miles: 30000 },
    { service_type: "coolant", mile_interval: 40000, current_miles_since: 12100, last_service_date: "2025-08-15", last_service_miles: 30000 },

    // Hydraulic
    { service_type: "hydraulic_filter", hour_interval: 750, current_hours_since: 200, last_service_date: "2025-12-01" },
    { service_type: "hydraulic_fluid", hour_interval: 1500, current_hours_since: 400, last_service_date: "2025-09-01" },

    // Annual
    { service_type: "dot_inspection", day_interval: 365, last_service_date: "2025-09-15", last_service_miles: 36000 },
    { service_type: "frame_inspection", day_interval: 365, last_service_date: "2025-09-15", last_service_miles: 36000 },
    { service_type: "electrical", day_interval: 365, last_service_date: "2025-09-15", last_service_miles: 36000 },
    { service_type: "def_system", day_interval: 365, last_service_date: "2025-11-01", last_service_miles: 38000 },
    { service_type: "exhaust_dpf", day_interval: 365, last_service_date: "2025-11-01", last_service_miles: 38000 },
    { service_type: "registration", day_interval: 365, last_service_date: "2025-08-01", last_service_miles: 30000 }, // ~8 months — yellow
    { service_type: "state_inspection", day_interval: 365, last_service_date: "2025-09-15", last_service_miles: 36000 },
  ].map((s) => ({
    truck_id: truckId,
    operator_id: OPERATOR_ID,
    mile_interval: s.mile_interval || null,
    hour_interval: s.hour_interval || null,
    day_interval: s.day_interval || null,
    warning_miles: s.mile_interval ? 500 : 0,
    warning_days: s.day_interval ? (s.day_interval <= 7 ? 2 : 30) : 0,
    current_miles_since: s.current_miles_since || 0,
    current_hours_since: s.current_hours_since || 0,
    last_service_date: s.last_service_date || null,
    last_service_miles: s.last_service_miles || null,
    last_service_hours: null,
    notes: null,
    is_active: true,
    ...{ service_type: s.service_type },
  }));
}

// -----------------------------------------------------------
// Tire data
// -----------------------------------------------------------
function getTruck1Tires(truckId) {
  return [
    { position: "front_left", brand: "Michelin XZE2", installed_date: "2025-06-15", installed_miles: 72000, current_tread_depth: 14, condition: "good" },
    { position: "front_right", brand: "Michelin XZE2", installed_date: "2025-06-15", installed_miles: 72000, current_tread_depth: 13, condition: "good" },
    { position: "rear_1", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 8, condition: "fair" },
    { position: "rear_2", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 7, condition: "fair" },
    { position: "rear_3", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 9, condition: "fair" },
    { position: "rear_4", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 8, condition: "fair" },
    { position: "rear_5", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 6, condition: "worn" },
    { position: "rear_6", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 5, condition: "worn" },
    { position: "rear_7", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 6, condition: "worn" },
    { position: "rear_8", brand: "Michelin XDN2", installed_date: "2024-01-20", installed_miles: 60000, current_tread_depth: 7, condition: "fair" },
  ].map((t) => ({
    truck_id: truckId,
    operator_id: OPERATOR_ID,
    ...t,
  }));
}

function getTruck2Tires(truckId) {
  return [
    { position: "front_left", brand: "Bridgestone R283", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 18, condition: "good" },
    { position: "front_right", brand: "Bridgestone R283", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 18, condition: "good" },
    { position: "rear_1", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 16, condition: "good" },
    { position: "rear_2", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 16, condition: "good" },
    { position: "rear_3", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 17, condition: "good" },
    { position: "rear_4", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 16, condition: "good" },
    { position: "rear_5", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 15, condition: "good" },
    { position: "rear_6", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 15, condition: "good" },
    { position: "rear_7", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 16, condition: "good" },
    { position: "rear_8", brand: "Bridgestone M726", installed_date: "2025-09-01", installed_miles: 35000, current_tread_depth: 15, condition: "good" },
  ].map((t) => ({
    truck_id: truckId,
    operator_id: OPERATOR_ID,
    ...t,
  }));
}

// -----------------------------------------------------------
// Service log history (for permanent records)
// -----------------------------------------------------------
function getTruck1ServiceLogs(truckId) {
  return [
    { service_type: "oil_filter", date_performed: "2026-02-01", mileage_at_service: 85432, cost: 185, vendor: "NJ Truck Center", notes: "Synthetic 15W-40" },
    { service_type: "oil_filter", date_performed: "2025-09-15", mileage_at_service: 80432, cost: 185, vendor: "NJ Truck Center" },
    { service_type: "fuel_filter", date_performed: "2026-02-01", mileage_at_service: 85432, cost: 95, vendor: "NJ Truck Center" },
    { service_type: "air_filter", date_performed: "2025-11-10", mileage_at_service: 83232, cost: 85, vendor: "NJ Truck Center" },
    { service_type: "chassis_lube", date_performed: "2026-02-01", mileage_at_service: 85432, cost: 65, vendor: "NJ Truck Center" },
    { service_type: "belts_hoses", date_performed: "2025-12-15", mileage_at_service: 83932, cost: 0, vendor: "NJ Truck Center", notes: "Inspected — no issues" },
    { service_type: "brakes_inspection", date_performed: "2026-02-01", mileage_at_service: 85432, cost: 125, vendor: "Metro Brake & Clutch" },
    { service_type: "transmission", date_performed: "2025-06-15", mileage_at_service: 80000, cost: 650, vendor: "NJ Truck Center", notes: "Allison fluid + filter" },
    { service_type: "air_dryer", date_performed: "2024-10-01", mileage_at_service: 70000, cost: 180, vendor: "NJ Truck Center" },
    { service_type: "brakes_full_service", date_performed: "2024-04-01", mileage_at_service: 60000, cost: 1200, vendor: "Metro Brake & Clutch", notes: "Full brake job — drums, shoes, hardware" },
    { service_type: "hydraulic_filter", date_performed: "2025-08-01", mileage_at_service: 78000, cost: 120, vendor: "NJ Truck Center" },
    { service_type: "dot_inspection", date_performed: "2025-05-01", mileage_at_service: 72000, cost: 175, vendor: "State Inspection", notes: "Annual DOT" },
    { service_type: "exhaust_dpf", date_performed: "2025-01-10", mileage_at_service: 65000, cost: 450, vendor: "Cummins Service", notes: "DPF regen + clean" },
    { service_type: "registration", date_performed: "2025-06-01", mileage_at_service: 72000, cost: 350, notes: "NJ annual registration" },
    { service_type: "grease_pivots", date_performed: "2026-03-22", mileage_at_service: 87200, cost: 0, notes: "Weekly grease" },
    { service_type: "grease_pivots", date_performed: "2026-03-15", mileage_at_service: 86800, cost: 0 },
  ].map((s) => ({
    truck_id: truckId,
    operator_id: OPERATOR_ID,
    ...s,
    cost: s.cost || 0,
    vendor: s.vendor || null,
    notes: s.notes || null,
  }));
}

function getTruck2ServiceLogs(truckId) {
  return [
    { service_type: "oil_filter", date_performed: "2026-02-15", mileage_at_service: 41000, cost: 185, vendor: "NJ Truck Center", notes: "Synthetic 15W-40" },
    { service_type: "fuel_filter", date_performed: "2026-02-15", mileage_at_service: 41000, cost: 95, vendor: "NJ Truck Center" },
    { service_type: "air_filter", date_performed: "2026-02-15", mileage_at_service: 41000, cost: 85, vendor: "NJ Truck Center" },
    { service_type: "chassis_lube", date_performed: "2026-02-15", mileage_at_service: 41000, cost: 65, vendor: "NJ Truck Center" },
    { service_type: "brakes_inspection", date_performed: "2026-02-15", mileage_at_service: 41000, cost: 125, vendor: "Metro Brake & Clutch" },
    { service_type: "transmission", date_performed: "2025-08-15", mileage_at_service: 30000, cost: 650, vendor: "NJ Truck Center" },
    { service_type: "dot_inspection", date_performed: "2025-09-15", mileage_at_service: 36000, cost: 175, vendor: "State Inspection" },
    { service_type: "registration", date_performed: "2025-08-01", mileage_at_service: 30000, cost: 350, notes: "NJ annual registration" },
    { service_type: "exhaust_dpf", date_performed: "2025-11-01", mileage_at_service: 38000, cost: 350, vendor: "Cummins Service", notes: "Preventive DPF clean" },
    { service_type: "hydraulic_filter", date_performed: "2025-12-01", mileage_at_service: 39000, cost: 120, vendor: "NJ Truck Center" },
    { service_type: "grease_pivots", date_performed: "2026-03-25", mileage_at_service: 42000, cost: 0, notes: "Weekly grease" },
    { service_type: "grease_pivots", date_performed: "2026-03-18", mileage_at_service: 41700, cost: 0 },
  ].map((s) => ({
    truck_id: truckId,
    operator_id: OPERATOR_ID,
    ...s,
    cost: s.cost || 0,
    vendor: s.vendor || null,
    notes: s.notes || null,
  }));
}

// -----------------------------------------------------------
// Main seed function
// -----------------------------------------------------------
async function main() {
  console.log("Fetching trucks...");

  const trucks = await supabaseQuery("trucks", "GET", null, "?select=id,name,operator_id,current_mileage&order=name");

  if (!trucks || trucks.length === 0) {
    console.error("No trucks found in database. Seed the trucks table first.");
    process.exit(1);
  }

  console.log(`Found ${trucks.length} truck(s):`);
  trucks.forEach((t) => console.log(`  - ${t.name} (${t.id}) @ ${t.current_mileage} mi`));

  const truck1 = trucks.find((t) => /peterbilt/i.test(t.name) || /truck.*1/i.test(t.name)) || trucks[0];
  const truck2 = trucks.find((t) => /kenworth/i.test(t.name) || /truck.*2/i.test(t.name)) || trucks[1];

  if (!truck1) {
    console.error("Could not identify Truck 1");
    process.exit(1);
  }

  // ── Update truck mileage + hours ──────────────────────
  console.log("\nUpdating truck mileage and hours...");
  await supabaseQuery("trucks", "PATCH", { current_mileage: 87432, current_hours: 2800 }, `?id=eq.${truck1.id}`);
  console.log(`  ${truck1.name}: 87,432 mi / 2,800 hrs`);

  if (truck2 && truck2.id !== truck1.id) {
    await supabaseQuery("trucks", "PATCH", { current_mileage: 42100, current_hours: 1400 }, `?id=eq.${truck2.id}`);
    console.log(`  ${truck2.name}: 42,100 mi / 1,400 hrs`);
  }

  // ── Seed maintenance_settings ─────────────────────────
  console.log("\nSeeding maintenance_settings...");

  const t1Settings = getTruck1Settings(truck1.id);
  console.log(`  ${truck1.name}: ${t1Settings.length} items`);
  await upsertSettings(t1Settings);

  if (truck2 && truck2.id !== truck1.id) {
    const t2Settings = getTruck2Settings(truck2.id);
    console.log(`  ${truck2.name}: ${t2Settings.length} items`);
    await upsertSettings(t2Settings);
  }

  // ── Seed tire_tracking ────────────────────────────────
  console.log("\nSeeding tire_tracking...");

  const t1Tires = getTruck1Tires(truck1.id);
  console.log(`  ${truck1.name}: ${t1Tires.length} tires`);
  await upsertTires(t1Tires);

  if (truck2 && truck2.id !== truck1.id) {
    const t2Tires = getTruck2Tires(truck2.id);
    console.log(`  ${truck2.name}: ${t2Tires.length} tires`);
    await upsertTires(t2Tires);
  }

  // ── Seed service logs ─────────────────────────────────
  console.log("\nSeeding truck_service_log...");

  const t1Logs = getTruck1ServiceLogs(truck1.id);
  for (const log of t1Logs) {
    try {
      await supabaseQuery("truck_service_log", "POST", log);
      console.log(`  + [${truck1.name}] ${log.service_type} @ ${log.mileage_at_service} mi`);
    } catch (e) {
      console.log(`  ~ [${truck1.name}] ${log.service_type} — skipped (${e.message.substring(0, 60)})`);
    }
  }

  if (truck2 && truck2.id !== truck1.id) {
    const t2Logs = getTruck2ServiceLogs(truck2.id);
    for (const log of t2Logs) {
      try {
        await supabaseQuery("truck_service_log", "POST", log);
        console.log(`  + [${truck2.name}] ${log.service_type} @ ${log.mileage_at_service} mi`);
      } catch (e) {
        console.log(`  ~ [${truck2.name}] ${log.service_type} — skipped (${e.message.substring(0, 60)})`);
      }
    }
  }

  console.log("\nDone! Maintenance v2 data seeded successfully.");
  console.log("  - maintenance_settings: intervals + current positions for all items");
  console.log("  - tire_tracking: 10 tires per truck with tread depths");
  console.log("  - truck_service_log: historical service records");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
