import { getAuthContext, json, error } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("routes")
    .update({ status: "locked" })
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .eq("status", "draft")
    .select()
    .single();

  if (dbError) return error("Route not found or already locked", 422);
  return json(data);
}
