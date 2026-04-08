import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const truckId = searchParams.get("truck_id");

  let query = ctx.supabase
    .from("expenses")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("date", { ascending: false });

  if (category) query = query.eq("category", category);
  if (truckId) query = query.eq("truck_id", truckId);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}

const createSchema = z.object({
  date: z.string(),
  category: z.enum(["fuel", "repair", "wages", "tolls", "utilities", "office", "insurance", "registration", "other"]),
  tax_bucket: z.enum(["COGS", "vehicle", "payroll", "SGA"]),
  amount: z.number().positive(),
  vendor: z.string().optional(),
  truck_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  receipt_url: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("expenses")
    .insert({
      ...parsed.data,
      operator_id: ctx.operatorId,
      created_by: ctx.user.id,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
