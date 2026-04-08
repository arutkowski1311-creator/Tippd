import { NextRequest } from "next/server";
import { getAuthContext, json, error } from "@/lib/api-helpers";
import { previewOverrideCascade } from "@/lib/dispatch-notifications";

/**
 * POST /api/routes/[id]/cascade
 * Preview the downstream effects of moving a stop in the route.
 * Owner must see this before confirming a manual override.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { supabase } = auth;
  const body = await request.json();

  if (!body.segment_id || body.new_sequence == null) {
    return error("segment_id and new_sequence are required");
  }

  const effects = await previewOverrideCascade(
    supabase,
    id,
    body.segment_id,
    body.new_sequence
  );

  return json({
    effects,
    total_affected: effects.length,
    has_tomorrow_pushes: effects.some((e) => e.effect === "pushed_to_tomorrow"),
  });
}
