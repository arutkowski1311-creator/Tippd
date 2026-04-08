import { NextRequest } from "next/server";
import { getAuthContext, json, error } from "@/lib/api-helpers";
import { resolveException, escalateException } from "@/lib/exceptions";

// GET /api/exceptions/[id] — get single exception
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { supabase, operatorId } = auth;

  const { data, error: dbError } = await supabase
    .from("exceptions")
    .select("*")
    .eq("id", id)
    .eq("operator_id", operatorId)
    .single();

  if (dbError) return error("Exception not found", 404);
  return json(data);
}

// PATCH /api/exceptions/[id] — resolve or escalate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { supabase, user } = auth;
  const body = await request.json();

  try {
    if (body.action === "resolve") {
      if (!body.resolution_notes) {
        return error("Resolution notes required");
      }
      const result = await resolveException(
        supabase,
        id,
        user.id,
        body.resolution_notes
      );
      return json(result);
    }

    if (body.action === "escalate") {
      const result = await escalateException(supabase, id);
      return json(result);
    }

    // Generic field update
    const { data, error: dbError } = await supabase
      .from("exceptions")
      .update({
        ...(body.status && { status: body.status }),
        ...(body.resolution_notes && { resolution_notes: body.resolution_notes }),
      } as any)
      .eq("id", id)
      .select()
      .single();

    if (dbError) return error(dbError.message, 500);
    return json(data);
  } catch (err: any) {
    return error(err.message || "Failed to update exception", 500);
  }
}
