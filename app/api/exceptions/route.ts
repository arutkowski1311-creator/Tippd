import { NextRequest } from "next/server";
import { getAuthContext, json, error } from "@/lib/api-helpers";
import { createException } from "@/lib/exceptions";
import { EXCEPTION_TYPES } from "@/types/exception";

// GET /api/exceptions — list exceptions for operator
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const { supabase, operatorId } = auth;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  let query = supabase
    .from("exceptions")
    .select("*")
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);

  return json(data);
}

// POST /api/exceptions — create a new exception (driver or owner/manager)
export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if ("error" in auth) return auth.error;

  const { supabase, operatorId, user } = auth;
  const body = await request.json();

  if (!body.type || !EXCEPTION_TYPES.includes(body.type)) {
    return error(`Invalid exception type. Must be one of: ${EXCEPTION_TYPES.join(", ")}`);
  }

  try {
    const exception = await createException(supabase, {
      operatorId,
      jobId: body.job_id,
      stopId: body.stop_id,
      driverId: body.driver_id || user.id,
      truckId: body.truck_id,
      type: body.type,
      driverNotes: body.driver_notes,
      photoUrls: body.photo_urls,
      materialType: body.material_type,
    });

    return json(exception, 201);
  } catch (err: any) {
    return error(err.message || "Failed to create exception", 500);
  }
}
