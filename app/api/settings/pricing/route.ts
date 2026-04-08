import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

const pricingSchema = z.object({
  base_rate_10yd: z.number().positive().optional(),
  base_rate_20yd: z.number().positive().optional(),
  weight_rate_per_lb: z.number().min(0).optional(),
  daily_overage_rate: z.number().min(0).optional(),
  standard_rental_days: z.number().int().positive().optional(),
  quote_expiry_days: z.number().int().positive().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await getAuthContext(["owner"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = pricingSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("operators")
    .update(parsed.data)
    .eq("id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
