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
    category: z.enum(["fuel", "repair", "wages", "tolls", "utilities", "office", "insurance", "registration", "other"]).optional(),
    amount: z.number().positive().optional(),
    notes: z.string().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("expenses")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
