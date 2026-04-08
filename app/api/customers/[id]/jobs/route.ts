import { getAuthContext, json, error } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .select("*")
    .eq("customer_id", params.id)
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: false });

  if (dbError) return error(dbError.message);
  return json(data);
}
