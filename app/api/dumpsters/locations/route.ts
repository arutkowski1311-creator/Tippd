/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthContext, json, error } from "@/lib/api-helpers";

/**
 * GET /api/dumpsters/locations
 *
 * Returns every dumpster with a resolved lat/lng and a human-readable location label.
 * Location is inferred by status:
 *   available / in_yard / needs_cleaning / needs_repair / repair → operator yard
 *   assigned / deployed → job drop location
 *   picked_up_full / returning → driver's current GPS (driver_state)
 *   staged → dumpster.current_lat/lng (recorded when driver staged it)
 *   at_transfer → dump_location lat/lng
 *   retired → yard (last known)
 *
 * Used by the Fleet Map tab to render every box as a map marker.
 */
export async function GET() {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { supabase, operatorId } = ctx;

  // 1. Fetch all dumpsters
  const { data: dumpsters, error: dumpErr } = await (supabase as any)
    .from("dumpsters")
    .select("id, unit_number, size, status, condition_grade, current_job_id, current_lat, current_lng, current_location_label, fill_status, staged_at, staged_near_dump_id")
    .eq("operator_id", operatorId);

  if (dumpErr) return error(dumpErr.message);
  if (!dumpsters || dumpsters.length === 0) return json([]);

  // 2. Fetch operator yard coords
  const { data: operator } = await (supabase as any)
    .from("operators")
    .select("yard_lat, yard_lng, yard_address")
    .eq("id", operatorId)
    .single();

  const yardLat = operator?.yard_lat ?? null;
  const yardLng = operator?.yard_lng ?? null;
  const yardAddress = operator?.yard_address ?? "Yard";

  // 3. Fetch active jobs for deployed/assigned dumpsters
  const jobIds = dumpsters
    .filter((d: any) => d.current_job_id && (d.status === "assigned" || d.status === "deployed"))
    .map((d: any) => d.current_job_id);

  let jobMap: Record<string, { drop_lat: number; drop_lng: number; drop_address: string; customer_name: string }> = {};
  if (jobIds.length > 0) {
    const { data: jobs } = await (supabase as any)
      .from("jobs")
      .select("id, drop_lat, drop_lng, drop_address, customer_name")
      .in("id", jobIds);
    if (jobs) {
      jobs.forEach((j: any) => { jobMap[j.id] = j; });
    }
  }

  // 4. Fetch dump locations for staged/at_transfer boxes
  const dumpLocIds = dumpsters
    .filter((d: any) => d.staged_near_dump_id)
    .map((d: any) => d.staged_near_dump_id);

  let dumpLocMap: Record<string, { lat: number; lng: number; name: string }> = {};
  if (dumpLocIds.length > 0) {
    const { data: dumpLocs } = await (supabase as any)
      .from("dump_locations")
      .select("id, lat, lng, name")
      .in("id", dumpLocIds);
    if (dumpLocs) {
      dumpLocs.forEach((dl: any) => { dumpLocMap[dl.id] = dl; });
    }
  }

  // 5. Fetch today's route segments to find which dumpster is on which truck
  //    (picked_up_full / returning boxes are on a truck — use driver GPS)
  const today = new Date().toISOString().split("T")[0];
  const { data: todaySegments } = await (supabase as any)
    .from("route_segments")
    .select("box_id, driver_id, status")
    .eq("operator_id", operatorId)
    .in("type", ["pickup", "dump"])
    .gte("created_at", today + "T00:00:00Z")
    .in("status", ["active", "pending"]);

  // Build box_id → driver_id map for in-transit boxes
  const boxDriverMap: Record<string, string> = {};
  if (todaySegments) {
    todaySegments.forEach((seg: any) => {
      if (seg.box_id && seg.driver_id) {
        boxDriverMap[seg.box_id] = seg.driver_id;
      }
    });
  }

  // 6. Fetch driver states for in-transit trucks
  const driverIds = Object.values(boxDriverMap);
  let driverStateMap: Record<string, { lat: number; lng: number; driver_name?: string }> = {};
  if (driverIds.length > 0) {
    const { data: driverStates } = await (supabase as any)
      .from("driver_state")
      .select("driver_id, lat, lng")
      .in("driver_id", driverIds)
      .not("lat", "is", null);
    if (driverStates) {
      driverStates.forEach((ds: any) => { driverStateMap[ds.driver_id] = ds; });
    }
  }

  // 7. Resolve location for each dumpster
  const result = dumpsters.map((d: any) => {
    let lat: number | null = null;
    let lng: number | null = null;
    let location_label = "Unknown";

    switch (d.status) {
      case "available":
      case "in_yard":
      case "needs_cleaning":
      case "needs_repair":
      case "repair":
      case "retired":
        lat = yardLat;
        lng = yardLng;
        location_label = yardAddress;
        break;

      case "assigned":
      case "deployed": {
        const job = d.current_job_id ? jobMap[d.current_job_id] : null;
        if (job?.drop_lat && job?.drop_lng) {
          lat = job.drop_lat;
          lng = job.drop_lng;
          location_label = job.customer_name
            ? `${job.customer_name} — ${job.drop_address}`
            : job.drop_address;
        } else {
          lat = yardLat;
          lng = yardLng;
          location_label = "At customer (no coords)";
        }
        break;
      }

      case "picked_up_full":
      case "returning": {
        const driverId = boxDriverMap[d.id];
        const ds = driverId ? driverStateMap[driverId] : null;
        if (ds?.lat && ds?.lng) {
          lat = ds.lat;
          lng = ds.lng;
          location_label = "On truck — in transit";
        } else {
          lat = yardLat;
          lng = yardLng;
          location_label = "In transit (no GPS)";
        }
        break;
      }

      case "staged":
        lat = d.current_lat;
        lng = d.current_lng;
        location_label = d.current_location_label ?? "Staged outside facility";
        break;

      case "at_transfer": {
        const dl = d.staged_near_dump_id ? dumpLocMap[d.staged_near_dump_id] : null;
        if (dl?.lat && dl?.lng) {
          lat = dl.lat;
          lng = dl.lng;
          location_label = `At ${dl.name}`;
        } else {
          lat = yardLat;
          lng = yardLng;
          location_label = "At transfer station";
        }
        break;
      }

      default:
        lat = yardLat;
        lng = yardLng;
        location_label = d.status;
    }

    return {
      id: d.id,
      unit_number: d.unit_number,
      size: d.size,
      status: d.status,
      condition_grade: d.condition_grade,
      fill_status: d.fill_status ?? "unknown",
      lat,
      lng,
      location_label,
      staged_at: d.staged_at ?? null,
      current_location_label: d.current_location_label ?? null,
    };
  });

  return json(result);
}
