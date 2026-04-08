import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const updateSchema = z.object({
    jobs_sequence: z.array(z.string().uuid()).optional(),
    driver_id: z.string().uuid().optional(),
    status: z.enum(["draft", "locked", "in_progress", "completed"]).optional(),
    total_miles: z.number().optional(),
    fuel_used_gallons: z.number().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("routes")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
