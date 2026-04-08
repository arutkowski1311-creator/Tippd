import { getAuthContext, json, error } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction");
  const channel = searchParams.get("channel");

  let query = ctx.supabase
    .from("communications")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: false });

  if (direction) query = query.eq("direction", direction);
  if (channel) query = query.eq("channel", channel);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}
