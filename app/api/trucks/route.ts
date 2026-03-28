import { getAuthContext, json, error } from "@/lib/api-helpers";

export async function GET() {
  const ctx = await getAuthContext(["owner", "manager", "driver"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("trucks")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("name");

  if (dbError) return error(dbError.message);
  return json(data);
}
