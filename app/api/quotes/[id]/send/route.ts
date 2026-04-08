import { getAuthContext, json, error } from "@/lib/api-helpers";
import { validateQuoteTransition } from "@/lib/state-machines";
import type { QuoteStatus } from "@/types/quote";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data: quote, error: fetchError } = await ctx.supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (fetchError || !quote) return error("Quote not found", 404);

  const validation = validateQuoteTransition(quote.status as QuoteStatus, "sent");
  if (!validation.valid) return error(validation.reason || "Cannot send quote", 422);

  // TODO: Send email + SMS to customer with approve link
  const { data, error: dbError } = await ctx.supabase
    .from("quotes")
    .update({ status: "sent" })
    .eq("id", params.id)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
