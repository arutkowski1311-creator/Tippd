import { getAuthContext, json, error } from "@/lib/api-helpers";
import {
  buildRoute,
  OPERATING_MODE_WEIGHTS,
  DEFAULT_SCORING_WEIGHTS,
  getLearnedAverages,
  type RouteJob,
  type DumpStation,
  type RoutingConfig,
} from "@/lib/routing-engine";

// ─── Types ───

interface OptimizeRequest {
  jobs: Array<{
    id: string;
    type: "drop" | "pickup";
    lat: number;
    lng: number;
    address: string;
    customer_name: string;
    customer_id?: string;
    box_id?: string;
    box_size: string;
    box_condition?: string;
    job_type?: string;
    access_restrictions?: string;
    preferred_time?: string;
    no_early_am?: boolean;
  }>;
  yard: { lat: number; lng: number; address: string };
  transfer_stations: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    address?: string;
    cost_per_ton?: number;
    estimated_wait_minutes?: number;
  }>;
  operating_mode?: string;
}

// ─── Handler ───

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body: OptimizeRequest = await request.json();
  const { jobs, yard, transfer_stations, operating_mode } = body;

  if (!jobs || jobs.length === 0) return error("No jobs provided", 400);

  // Get operator's routing config
  const { data: scoringConfig } = await ctx.supabase
    .from("route_scoring_config")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .single();

  // Check for learned averages
  const learned = await getLearnedAverages(ctx.supabase, ctx.operatorId);

  // Build routing config
  const mode = operating_mode || scoringConfig?.active_mode || "balanced";
  const weights = OPERATING_MODE_WEIGHTS[mode] || DEFAULT_SCORING_WEIGHTS;

  const config: RoutingConfig = {
    yard,
    dumps: transfer_stations.map((ts) => ({
      id: ts.id,
      lat: ts.lat,
      lng: ts.lng,
      name: ts.name,
      address: ts.address || ts.name,
      cost_per_ton: ts.cost_per_ton || 85,
      estimated_wait_minutes: ts.estimated_wait_minutes || 25,
    })),
    weights,
    operating_mode: mode,
    drop_minutes: learned?.drop_minutes || scoringConfig?.default_drop_minutes || 20,
    pickup_minutes: learned?.pickup_minutes || scoringConfig?.default_pickup_minutes || 20,
    dump_minutes: scoringConfig?.default_dump_minutes || 25,
    lunch_minutes: scoringConfig?.default_lunch_minutes || 30,
    max_shift_minutes: scoringConfig?.max_shift_minutes || 480,
    fuel_cost_per_mile: 0.65,
    driver_hourly_wage: 25,
  };

  // Override dump times with learned averages per facility
  if (learned?.dump_minutes) {
    for (const dump of config.dumps) {
      if (learned.dump_minutes[dump.id]) {
        dump.estimated_wait_minutes = learned.dump_minutes[dump.id];
      }
    }
  }

  // Build route jobs
  const routeJobs: RouteJob[] = jobs.map((j) => ({
    id: j.id,
    type: j.type,
    lat: j.lat,
    lng: j.lng,
    address: j.address,
    customer_name: j.customer_name,
    customer_id: j.customer_id,
    box_id: j.box_id,
    box_size: j.box_size || "20yd",
    box_condition: j.box_condition,
    job_type: j.job_type,
    access_restrictions: j.access_restrictions,
    preferred_time: j.preferred_time,
    no_early_am: j.no_early_am,
  }));

  // Build the optimized route
  const useHere = !!process.env.HERE_API_KEY;

  try {
    const route = await buildRoute(routeJobs, config, useHere);

    return json({
      // Legacy fields (dispatch page compatibility)
      optimized_sequence: route.segments
        .filter((s) => s.job_id)
        .map((s) => s.job_id),
      estimated_miles: route.total_miles,
      estimated_minutes: route.total_minutes,
      reasoning: route.summary,
      route_path: route.route_path,
      reuse_opportunities: route.reuse_count,
      dump_visits: route.total_dump_visits,

      // New segment-based data
      segments: route.segments,
      total_stops: route.total_stops,
      drops: route.drops,
      pickups: route.pickups,
      lunch_at_segment: route.lunch_at_segment,
      is_over_capacity: route.is_over_capacity,
      overtime_minutes: route.overtime_minutes,
      composite_score: route.composite_score,
      operating_mode: mode,

      // Config used
      config_used: {
        drop_minutes: config.drop_minutes,
        pickup_minutes: config.pickup_minutes,
        dump_minutes: config.dump_minutes,
        lunch_minutes: config.lunch_minutes,
        max_shift_minutes: config.max_shift_minutes,
        used_learned_times: !!learned,
      },
    });
  } catch (err) {
    console.error("[route-optimize] Error:", err);
    return error("Route optimization failed", 500);
  }
}
