import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let query = ctx.supabase
    .from("customers")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("name");

  if (type) query = query.eq("type", type);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  type: z.enum(["residential", "contractor"]),
  billing_address: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("customers")
    .insert({ ...parsed.data, operator_id: ctx.operatorId })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
