/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/driver/route
 * Returns the driver's route segments for today.
 * Falls back to building segments from assigned jobs if none exist.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get user profile for operator_id
  const { data: profile } = await supabase
    .from("users")
    .select("operator_id, name")
    .eq("id", user.id)
    .single() as any;

  if (!profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Try route_segments first
  const { data: segments } = await supabase
    .from("route_segments")
    .select("*")
    .eq("driver_id", user.id)
    .eq("date", today)
    .order("sequence_number", { ascending: true }) as any;

  if (segments && segments.length > 0) {
    // Get the route record too
    const routeId = segments[0].route_id;
    let route = null;
    if (routeId) {
      const { data: routeData } = await supabase
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .single() as any;
      route = routeData;
    }

    return NextResponse.json({
      segments,
      route,
      driver_name: profile.name,
      date: today,
    });
  }

  // Get truck_id from query param (driver picks their truck)
  const url = new URL(request.url);
  const truckId = url.searchParams.get("truck_id");

  // Show jobs that are part of today's route:
  // scheduled / en_route_drop = drop jobs
  // pickup_scheduled / en_route_pickup = pickup jobs
  // dropped = just dropped, still on today's route
  // picked_up = just picked up, needs dump visit still
  const ACTIONABLE_STATUSES = ["scheduled", "en_route_drop", "dropped", "pickup_scheduled", "en_route_pickup", "picked_up"];

  let jobs: any[] = [];

  if (truckId) {
    // Load jobs for the specific truck
    const result = await supabase
      .from("jobs")
      .select(`
        id, customer_name, customer_phone, drop_address, drop_lat, drop_lng,
        job_type, status, dumpster_id, dumpster_unit_number, truck_id,
        dumpsters!jobs_dumpster_id_fkey ( id, unit_number, size, condition_grade )
      `)
      .eq("truck_id", truckId)
      .in("status", ACTIONABLE_STATUSES)
      .order("requested_drop_start", { ascending: true }) as any;
    jobs = result.data || [];
  } else {
    // No truck specified — try by driver assignment
    const result = await supabase
      .from("jobs")
      .select(`
        id, customer_name, customer_phone, drop_address, drop_lat, drop_lng,
        job_type, status, dumpster_id, dumpster_unit_number, truck_id,
        dumpsters!jobs_dumpster_id_fkey ( id, unit_number, size, condition_grade )
      `)
      .eq("assigned_driver_id", user.id)
      .in("status", ACTIONABLE_STATUSES)
      .order("requested_drop_start", { ascending: true }) as any;
    jobs = result.data || [];
  }

  // Assign driver to these jobs if not already
  if (jobs.length > 0) {
    for (const job of jobs) {
      if (job.assigned_driver_id !== user.id) {
        await supabase
          .from("jobs")
          .update({ assigned_driver_id: user.id })
          .eq("id", job.id);
      }
    }
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({
      segments: [],
      route: null,
      driver_name: profile.name,
      date: today,
    });
  }

  // Get dump locations for route building
  const { data: dumpLocations } = await supabase
    .from("dump_locations")
    .select("id, name, address, lat, lng")
    .eq("is_active", true) as any;

  // Build route jobs with dumpster info
  const routeJobs = jobs.map((job: any) => {
    const dumpster = job.dumpsters;
    return {
      id: job.id,
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      drop_address: job.drop_address,
      drop_lat: job.drop_lat,
      drop_lng: job.drop_lng,
      status: job.status,
      job_type: job.job_type,
      dumpster_id: dumpster?.id || job.dumpster_id,
      dumpster_unit_number: dumpster?.unit_number || job.dumpster_unit_number,
      dumpster_size: dumpster?.size,
      dumpster_condition: dumpster?.condition_grade,
    };
  });

  // Use the logistics-aware route builder
  const { buildRouteSegments } = await import("@/lib/build-route-segments");

  const { segments: builtSegments, totalMiles, totalMinutes } = buildRouteSegments(
    routeJobs,
    dumpLocations || [],
    { insertLunch: true, lunchAfterStop: 4 }
  );

  return NextResponse.json({
    segments: builtSegments,
    route: null,
    driver_name: profile.name,
    date: today,
    generated: true,
    totalMiles,
    totalMinutes,
  });
}
