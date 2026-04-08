/**
 * Dead Mile Classification — Blueprint Section 08
 *
 * Dead miles are not all equal. Classifying them tells you where to improve.
 * Target: under 20% dead miles of total route miles.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { DeadMileBreakdown } from "@/types/route";

type MileClassification =
  | "revenue_delivery"
  | "revenue_pickup"
  | "transfer"
  | "yard_reposition"
  | "empty_retrieval"
  | "return_to_yard"
  | "detour";

/**
 * Classify a route segment's miles into the dead-mile taxonomy.
 */
function classifySegment(segType: string, boxAction: string | null): MileClassification {
  switch (segType) {
    case "drop":
      return "revenue_delivery";
    case "pickup":
      return "revenue_pickup";
    case "dump":
      return "transfer";
    case "yard_depart":
      return "yard_reposition";
    case "yard_return":
      return "return_to_yard";
    case "reposition":
      if (boxAction === "returned_to_yard") return "empty_retrieval";
      return "yard_reposition";
    default:
      return "detour";
  }
}

/**
 * Calculate dead mile breakdown for a completed route.
 * Reads all route_segments and sums miles by classification.
 */
export async function calculateDeadMiles(
  supabase: SupabaseClient,
  routeId: string
): Promise<{ breakdown: DeadMileBreakdown; totalMiles: number; deadMilePct: number }> {
  const { data: segments } = await supabase
    .from("route_segments")
    .select("type, box_action, planned_drive_miles, actual_drive_minutes, status")
    .eq("route_id", routeId)
    .eq("status", "completed");

  if (!segments?.length) {
    return { breakdown: {}, totalMiles: 0, deadMilePct: 0 };
  }

  const breakdown: DeadMileBreakdown = {};
  let totalMiles = 0;

  for (const seg of segments) {
    const miles = seg.planned_drive_miles || 0;
    totalMiles += miles;

    const classification = classifySegment(seg.type, seg.box_action);
    breakdown[classification] = (breakdown[classification] || 0) + miles;
  }

  // Revenue miles = delivery + pickup
  const revenueMiles = (breakdown.revenue_delivery || 0) + (breakdown.revenue_pickup || 0);
  const deadMiles = totalMiles - revenueMiles;
  const deadMilePct = totalMiles > 0 ? (deadMiles / totalMiles) * 100 : 0;

  return { breakdown, totalMiles, deadMilePct };
}

/**
 * Save the dead mile breakdown to the route record.
 */
export async function saveDeadMileBreakdown(
  supabase: SupabaseClient,
  routeId: string
): Promise<void> {
  const { breakdown, totalMiles, deadMilePct } = await calculateDeadMiles(supabase, routeId);

  await supabase
    .from("routes")
    .update({
      dead_mile_breakdown: breakdown,
      dead_mile_pct: Math.round(deadMilePct * 10) / 10,
      total_miles: totalMiles,
    } as any)
    .eq("id", routeId);
}
