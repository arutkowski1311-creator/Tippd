import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager", "driver"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const truckId = searchParams.get("truck_id");

  let query = ctx.supabase
    .from("jobs")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: false });

  // Drivers only see their assigned jobs
  if (ctx.user.role === "driver") {
    query = query.eq("assigned_driver_id", ctx.user.id);
  }

  if (status) query = query.eq("status", status);
  if (truckId) query = query.eq("truck_id", truckId);
  if (date) {
    query = query
      .gte("requested_drop_start", `${date}T00:00:00`)
      .lte("requested_drop_start", `${date}T23:59:59`);
  }

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}

const createSchema = z.object({
  customer_id: z.string().uuid(),
  customer_name: z.string(),
  customer_phone: z.string(),
  drop_address: z.string(),
  drop_lat: z.number().optional(),
  drop_lng: z.number().optional(),
  job_type: z.enum(["residential", "commercial", "construction", "industrial", "estate_cleanout", "other"]).default("residential"),
  requested_drop_start: z.string().optional(),
  requested_drop_end: z.string().optional(),
  base_rate: z.number(),
  customer_notes: z.string().optional(),
  quote_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .insert({
      ...parsed.data,
      operator_id: ctx.operatorId,
      status: "pending_approval",
    })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
