import { getAuthContext, json, error } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Public GET — customer views quote via token
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const supabase = await createClient();

  if (token) {
    // Public access via token
    const { data, error: dbError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", params.id)
      .eq("approve_token", token)
      .single();

    if (dbError || !data) return error("Quote not found", 404);

    // Mark as viewed if sent
    if (data.status === "sent") {
      await supabase
        .from("quotes")
        .update({ status: "viewed" })
        .eq("id", params.id);
    }

    return json(data);
  }

  // Authenticated access
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const updateSchema = z.object({
    line_items: z.array(z.object({
      description: z.string(),
      qty: z.number(),
      unit_price: z.number(),
      total: z.number(),
    })).optional(),
    discount_type: z.enum(["flat", "percent"]).optional(),
    discount_value: z.number().optional(),
    deposit_percent: z.number().int().optional(),
    subtotal: z.number().optional(),
    total: z.number().optional(),
    terms: z.string().optional(),
    internal_notes: z.string().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("quotes")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
