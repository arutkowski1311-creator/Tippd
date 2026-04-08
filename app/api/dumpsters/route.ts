import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = ctx.supabase
    .from("dumpsters")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("unit_number");

  if (status) query = query.eq("status", status);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}

const createSchema = z.object({
  unit_number: z.string().min(1),
  size: z.enum(["10yd", "20yd"]),
  condition_grade: z.enum(["A", "B", "C", "D", "F"]).default("A"),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("dumpsters")
    .insert({ ...parsed.data, operator_id: ctx.operatorId })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
