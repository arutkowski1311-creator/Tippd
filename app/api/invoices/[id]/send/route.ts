import { getAuthContext, json, error } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  // TODO: Generate Stripe Checkout link, send email + SMS
  const { data, error: dbError } = await ctx.supabase
    .from("invoices")
    .update({ status: "sent" })
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
