import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("customers")
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
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    billing_address: z.string().optional(),
    autopay_enabled: z.boolean().optional(),
    notes: z.string().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
