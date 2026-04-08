import { createClient } from "@/lib/supabase/server";
import { json, error } from "@/lib/api-helpers";
import { validateQuoteTransition } from "@/lib/state-machines";
import type { QuoteStatus } from "@/types/quote";

// Public — customer approves via token
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { token } = body as { token: string };

  if (!token) return error("Token required", 400);

  const supabase = await createClient();

  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .eq("approve_token", token)
    .single();

  if (fetchError || !quote) return error("Quote not found", 404);

  const validation = validateQuoteTransition(quote.status as QuoteStatus, "approved");
  if (!validation.valid) return error(validation.reason || "Cannot approve", 422);

  // Update quote status
  const { data, error: dbError } = await supabase
    .from("quotes")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (dbError) return error(dbError.message);

  // TODO: Create job from approved quote
  // TODO: Charge deposit if deposit_amount > 0

  return json(data);
}
