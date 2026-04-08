import { NextRequest } from "next/server";
import { getAuthContext, json, error } from "@/lib/api-helpers";
import { checkAssetConstraints } from "@/lib/dispatch-notifications";

/**
 * GET /api/routes/[id]/constraints
 * Check asset constraints (truck service, driver hours) before locking a route.
 * Returns warnings — the owner must acknowledge before confirming.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { supabase, operatorId } = auth;

  const { data: route } = await supabase
    .from("routes")
    .select("id, truck_id, driver_id, total_miles")
    .eq("id", id)
    .eq("operator_id", operatorId)
    .single();

  if (!route) return error("Route not found", 404);

  const warnings = await checkAssetConstraints(
    supabase,
    operatorId,
    route.truck_id,
    route.driver_id,
    route.total_miles || 0
  );

  const hasBlockers = warnings.some((w) => w.level === "hard_block");

  return json({ warnings, hasBlockers });
}
