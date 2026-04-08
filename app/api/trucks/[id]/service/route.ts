import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

interface TruckMileageRow {
  current_mileage: number;
  current_hours: number;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data, error: dbError } = await ctx.supabase
    .from("truck_service_log")
    .select("*")
    .eq("truck_id", params.id)
    .eq("operator_id", ctx.operatorId)
    .order("date_performed", { ascending: false });

  if (dbError) return error(dbError.message);
  return json(data);
}

const serviceSchema = z.object({
  service_type: z.string(),
  date_performed: z.string(),
  mileage_at_service: z.number().int(),
  hours_at_service: z.number().int().optional(),
  cost: z.number().optional().default(0),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // 1. Insert the service log record
  const insertPayload = {
    truck_id: params.id,
    operator_id: ctx.operatorId,
    service_type: parsed.data.service_type,
    date_performed: parsed.data.date_performed,
    mileage_at_service: parsed.data.mileage_at_service,
    cost: parsed.data.cost,
    vendor: parsed.data.vendor ?? null,
    notes: parsed.data.notes ?? null,
  };

  const { data, error: dbError } = await (ctx.supabase
    .from("truck_service_log")
    .insert(insertPayload as Record<string, unknown>)
    .select()
    .single());

  if (dbError) return error(dbError.message);

  // 2. Reset the maintenance_settings counter for this service type
  const updatePayload: Record<string, unknown> = {
    current_miles_since: 0,
    current_hours_since: 0,
    last_service_date: parsed.data.date_performed,
    last_service_miles: parsed.data.mileage_at_service,
  };

  if (parsed.data.hours_at_service !== undefined) {
    updatePayload.last_service_hours = parsed.data.hours_at_service;
  }

  await (ctx.supabase
    .from("maintenance_settings")
    .update(updatePayload)
    .eq("truck_id", params.id)
    .eq("service_type", parsed.data.service_type)
    .eq("operator_id", ctx.operatorId));

  // 3. Update truck mileage if this service was done at a higher mileage
  const { data: truckRaw } = await ctx.supabase
    .from("trucks")
    .select("current_mileage, current_hours")
    .eq("id", params.id)
    .single();

  if (truckRaw) {
    const truck = truckRaw as unknown as TruckMileageRow;
    const updates: Record<string, unknown> = {};

    if (parsed.data.mileage_at_service > (truck.current_mileage ?? 0)) {
      updates.current_mileage = parsed.data.mileage_at_service;
    }
    if (parsed.data.hours_at_service && parsed.data.hours_at_service > (truck.current_hours ?? 0)) {
      updates.current_hours = parsed.data.hours_at_service;
    }

    if (Object.keys(updates).length > 0) {
      await (ctx.supabase
        .from("trucks")
        .update(updates)
        .eq("id", params.id));
    }
  }

  return json(data, 201);
}
