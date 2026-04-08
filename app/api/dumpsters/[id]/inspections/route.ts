import { NextRequest } from "next/server";
import { getAuthContext, json, error } from "@/lib/api-helpers";

// GET /api/dumpsters/[id]/inspections — list inspections for a dumpster
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { supabase, operatorId } = auth;

  const { data, error: dbError } = await supabase
    .from("dumpster_inspections")
    .select("*")
    .eq("dumpster_id", id)
    .eq("operator_id", operatorId)
    .order("inspection_date", { ascending: false });

  if (dbError) return error(dbError.message, 500);
  return json(data);
}

// POST /api/dumpsters/[id]/inspections — create a new inspection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { supabase, operatorId, user } = auth;
  const body = await request.json();

  // Validate scores
  for (const field of ["appearance_score", "structural_score", "cleanliness_score"]) {
    const val = body[field];
    if (typeof val !== "number" || val < 1 || val > 10) {
      return error(`${field} must be a number between 1 and 10`);
    }
  }

  if (!["A", "B", "C", "D", "F"].includes(body.overall_grade)) {
    return error("overall_grade must be A, B, C, D, or F");
  }

  const { data: inspection, error: dbError } = await supabase
    .from("dumpster_inspections")
    .insert({
      dumpster_id: id,
      operator_id: operatorId,
      inspected_by: user.id,
      inspection_date: body.inspection_date || new Date().toISOString().split("T")[0],
      appearance_score: body.appearance_score,
      structural_score: body.structural_score,
      cleanliness_score: body.cleanliness_score,
      overall_grade: body.overall_grade,
      notes: body.notes || null,
      photos: body.photos || [],
      repair_items: body.repair_items || [],
    } as any)
    .select()
    .single();

  if (dbError) return error(dbError.message, 500);

  // Update the dumpster's condition grade and last inspection date
  await supabase
    .from("dumpsters")
    .update({
      condition_grade: body.overall_grade,
      last_inspection_date: body.inspection_date || new Date().toISOString().split("T")[0],
    } as any)
    .eq("id", id);

  return json(inspection, 201);
}
