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

  // Fallback: build segments from jobs assigned to this driver OR their truck
  // First try by driver ID
  let { data: jobs } = await supabase
    .from("jobs")
    .select(`
      id, customer_name, customer_phone, drop_address, drop_lat, drop_lng,
      job_type, status, dumpster_id, dumpster_unit_number, truck_id,
      dumpsters!jobs_dumpster_id_fkey ( id, unit_number, size, condition_grade )
    `)
    .eq("assigned_driver_id", user.id)
    .in("status", [
      "scheduled",
      "en_route_drop",
      "dropped",
      "pickup_scheduled",
      "en_route_pickup",
    ])
    .order("requested_drop_start", { ascending: true }) as any;

  // If no jobs by driver, try by truck_id (from query param or any truck with jobs)
  if (!jobs || jobs.length === 0) {
    const url = new URL(request.url);
    const truckId = url.searchParams.get("truck_id");

    if (truckId) {
      const result = await supabase
        .from("jobs")
        .select(`
          id, customer_name, customer_phone, drop_address, drop_lat, drop_lng,
          job_type, status, dumpster_id, dumpster_unit_number, truck_id,
          dumpsters!jobs_dumpster_id_fkey ( id, unit_number, size, condition_grade )
        `)
        .eq("truck_id", truckId)
        .in("status", [
          "scheduled",
          "en_route_drop",
          "dropped",
          "pickup_scheduled",
          "en_route_pickup",
        ])
        .order("requested_drop_start", { ascending: true }) as any;
      jobs = result.data;

      // Also assign the driver to these jobs
      if (jobs && jobs.length > 0) {
        for (const job of jobs) {
          await supabase
            .from("jobs")
            .update({ assigned_driver_id: user.id })
            .eq("id", job.id);
        }
      }
    } else {
      // No truck specified — try to find any truck with jobs assigned
      const result = await supabase
        .from("jobs")
        .select(`
          id, customer_name, customer_phone, drop_address, drop_lat, drop_lng,
          job_type, status, dumpster_id, dumpster_unit_number, truck_id,
          dumpsters!jobs_dumpster_id_fkey ( id, unit_number, size, condition_grade )
        `)
        .not("truck_id", "is", null)
        .in("status", [
          "scheduled",
          "en_route_drop",
          "dropped",
          "pickup_scheduled",
          "en_route_pickup",
        ])
        .order("requested_drop_start", { ascending: true })
        .limit(20) as any;
      jobs = result.data;
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

  // Build quick segments from jobs (simplified — no routing engine, just ordered stops)
  const builtSegments: any[] = [];
  let seq = 0;

  // Yard depart
  builtSegments.push({
    id: `generated-yard-depart`,
    sequence_number: seq++,
    type: "yard_depart",
    label: "Start at yard",
    status: "pending",
    planned_drive_minutes: 0,
    planned_stop_minutes: 0,
    planned_total_minutes: 0,
    planned_drive_miles: 0,
  });

  for (const job of jobs) {
    const isDrop = ["scheduled", "en_route_drop"].includes(job.status);
    const isPickup = ["pickup_scheduled", "en_route_pickup", "dropped", "active"].includes(job.status);
    const dumpster = job.dumpsters;

    if (isDrop) {
      builtSegments.push({
        id: job.id,
        job_id: job.id,
        sequence_number: seq++,
        type: "drop",
        label: `DROP - ${job.customer_name}`,
        customer_name: job.customer_name,
        to_address: job.drop_address,
        to_lat: job.drop_lat,
        to_lng: job.drop_lng,
        box_id: dumpster?.id,
        box_size: dumpster?.size,
        box_condition: dumpster?.condition_grade,
        status: "pending",
        planned_drive_minutes: 15,
        planned_stop_minutes: 15,
        planned_total_minutes: 30,
        planned_drive_miles: 8,
      });
    } else if (isPickup) {
      builtSegments.push({
        id: job.id,
        job_id: job.id,
        sequence_number: seq++,
        type: "pickup",
        label: `PICKUP - ${job.customer_name}`,
        customer_name: job.customer_name,
        to_address: job.drop_address,
        to_lat: job.drop_lat,
        to_lng: job.drop_lng,
        box_id: dumpster?.id,
        box_size: dumpster?.size,
        box_condition: dumpster?.condition_grade,
        status: "pending",
        planned_drive_minutes: 15,
        planned_stop_minutes: 20,
        planned_total_minutes: 35,
        planned_drive_miles: 8,
      });

      // Add dump after pickup
      builtSegments.push({
        id: `generated-dump-${job.id}`,
        sequence_number: seq++,
        type: "dump",
        label: "DUMP - Transfer Station",
        job_id: job.id,
        status: "pending",
        planned_drive_minutes: 10,
        planned_stop_minutes: 20,
        planned_total_minutes: 30,
        planned_drive_miles: 5,
      });
    }
  }

  // Yard return
  builtSegments.push({
    id: `generated-yard-return`,
    sequence_number: seq++,
    type: "yard_return",
    label: "Return to yard",
    status: "pending",
    planned_drive_minutes: 15,
    planned_stop_minutes: 0,
    planned_total_minutes: 15,
    planned_drive_miles: 8,
  });

  return NextResponse.json({
    segments: builtSegments,
    route: null,
    driver_name: profile.name,
    date: today,
    generated: true,
  });
}
