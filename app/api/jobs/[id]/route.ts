import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager", "driver"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
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
    dumpster_id: z.string().uuid().optional(),
    dumpster_unit_number: z.string().optional(),
    truck_id: z.string().uuid().optional(),
    truck_name: z.string().optional(),
    assigned_driver_id: z.string().uuid().optional(),
    requested_drop_start: z.string().optional(),
    requested_drop_end: z.string().optional(),
    requested_pickup_start: z.string().optional(),
    requested_pickup_end: z.string().optional(),
    driver_notes: z.string().optional(),
    customer_notes: z.string().optional(),
    discount_amount: z.number().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner"]);
  if ("error" in ctx) return ctx.error;

  // Cancel the job instead of deleting — update status
  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .update({ status: "cancelled" })
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
