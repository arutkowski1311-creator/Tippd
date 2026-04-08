import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

const weightSchema = z.object({
  weight_lbs: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["driver"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = weightSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // Get job to calculate weight charge
  const { data: job, error: fetchError } = await ctx.supabase
    .from("jobs")
    .select("operator_id")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (fetchError || !job) return error("Job not found", 404);

  // Get operator weight rate
  const { data: operator } = await ctx.supabase
    .from("operators")
    .select("weight_rate_per_lb")
    .eq("id", ctx.operatorId)
    .single();

  const weightRate = operator?.weight_rate_per_lb || 0.05;
  const weightCharge = parsed.data.weight_lbs * weightRate;

  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .update({
      weight_lbs: parsed.data.weight_lbs,
      weight_charge: weightCharge,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
