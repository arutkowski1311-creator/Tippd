import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager", "driver"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const updateSchema = z.object({
    condition_grade: z.enum(["A", "B", "C", "D", "F"]).optional(),
    status: z.enum(["available", "assigned", "deployed", "returning", "in_yard", "repair", "retired"]).optional(),
    repair_notes: z.string().optional(),
    repair_cost_estimate: z.number().optional(),
    repair_return_date: z.string().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("dumpsters")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
