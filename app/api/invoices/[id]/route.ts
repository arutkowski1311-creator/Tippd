import { getAuthContext, json, error } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    // Public access for customer payment
    const supabase = await createClient();
    const { data, error: dbError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", params.id)
      .single();

    if (dbError || !data) return error("Invoice not found", 404);
    return json(data);
  }

  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
