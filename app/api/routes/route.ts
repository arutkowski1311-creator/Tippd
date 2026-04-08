import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  let query = ctx.supabase
    .from("routes")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("date", { ascending: false });

  if (date) query = query.eq("date", date);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}

const createSchema = z.object({
  truck_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  date: z.string(),
  jobs_sequence: z.array(z.string().uuid()).default([]),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("routes")
    .insert({ ...parsed.data, operator_id: ctx.operatorId })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
