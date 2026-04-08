import { getAuthContext, json, error } from "@/lib/api-helpers";

export async function GET() {
  const ctx = await getAuthContext(["owner"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("operators")
    .select("*")
    .eq("id", ctx.operatorId)
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
