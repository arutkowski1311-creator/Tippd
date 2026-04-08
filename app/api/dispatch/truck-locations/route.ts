/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dispatch/truck-locations
 * Returns live driver positions for all active drivers in this operator.
 * Used by the dispatch map to show truck locations, refreshed every 30s.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get operator_id for current user
  const { data: profile } = await supabase
    .from("users")
    .select("operator_id")
    .eq("id", user.id)
    .single() as any;

  if (!profile?.operator_id) {
    return NextResponse.json({ locations: [] });
  }

  // Get all driver states with driver + truck info
  const { data: states } = await supabase
    .from("driver_state")
    .select(`
      driver_id,
      lat,
      lng,
      heading,
      speed,
      status,
      updated_at,
      current_segment_id,
      users!driver_state_driver_id_fkey ( name, id )
    `)
    .eq("operator_id", profile.operator_id)
    .not("lat", "is", null)
    .not("lng", "is", null) as any;

  if (!states || states.length === 0) {
    return NextResponse.json({ locations: [] });
  }

  // Get trucks assigned to these drivers (via today's jobs)
  const driverIds = states.map((s: any) => s.driver_id);
  const today = new Date().toISOString().split("T")[0];

  const { data: jobs } = await supabase
    .from("jobs")
    .select("assigned_driver_id, truck_id, trucks!jobs_truck_id_fkey(name, plate)")
    .in("assigned_driver_id", driverIds)
    .gte("requested_drop_start", `${today}T00:00:00`)
    .lt("requested_drop_start", `${today}T23:59:59`) as any;

  // Also check routes table for truck assignment
  const { data: routes } = await supabase
    .from("routes")
    .select("driver_id, truck_id, trucks!routes_truck_id_fkey(name, plate)")
    .in("driver_id", driverIds)
    .eq("date", today) as any;

  // Build driver → truck map (prefer routes table, fall back to jobs)
  const driverTruckMap: Record<string, { name: string; plate: string }> = {};

  (jobs || []).forEach((j: any) => {
    if (j.assigned_driver_id && j.trucks) {
      driverTruckMap[j.assigned_driver_id] = j.trucks;
    }
  });
  (routes || []).forEach((r: any) => {
    if (r.driver_id && r.trucks) {
      driverTruckMap[r.driver_id] = r.trucks;
    }
  });

  const locations = states.map((s: any) => ({
    driver_id: s.driver_id,
    driver_name: s.users?.name || "Driver",
    lat: s.lat,
    lng: s.lng,
    heading: s.heading,
    speed: s.speed,
    status: s.status || "offline",
    updated_at: s.updated_at,
    truck_name: driverTruckMap[s.driver_id]?.name || null,
    truck_plate: driverTruckMap[s.driver_id]?.plate || null,
  }));

  return NextResponse.json({ locations });
}
