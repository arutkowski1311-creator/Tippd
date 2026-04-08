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
    current_mileage: z.number().int().optional(),
    current_hours: z.number().int().optional(),
    status: z.enum(["active", "repair", "retired"]).optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // If mileage is being updated, calculate the delta for maintenance counters
  let mileageDelta = 0;
  let hoursDelta = 0;

  if (parsed.data.current_mileage || parsed.data.current_hours) {
    const { data: currentTruck } = await ctx.supabase
      .from("trucks")
      .select("current_mileage, current_hours")
      .eq("id", params.id)
      .single() as any;

    if (currentTruck) {
      if (parsed.data.current_mileage && parsed.data.current_mileage > (currentTruck.current_mileage || 0)) {
        mileageDelta = parsed.data.current_mileage - (currentTruck.current_mileage || 0);
      }
      if (parsed.data.current_hours && parsed.data.current_hours > (currentTruck.current_hours || 0)) {
        hoursDelta = parsed.data.current_hours - (currentTruck.current_hours || 0);
      }
    }
  }

  const { data, error: dbError } = await ctx.supabase
    .from("trucks")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);

  // Update maintenance counters if mileage/hours changed
  if (mileageDelta > 0 || hoursDelta > 0) {
    const { data: maintSettings } = await ctx.supabase
      .from("maintenance_settings")
      .select("id, current_miles_since, current_hours_since")
      .eq("truck_id", params.id) as any;

    if (maintSettings) {
      for (const setting of maintSettings) {
        const updates: any = {};
        if (mileageDelta > 0) updates.current_miles_since = (setting.current_miles_since || 0) + mileageDelta;
        if (hoursDelta > 0) updates.current_hours_since = (setting.current_hours_since || 0) + hoursDelta;
        await ctx.supabase.from("maintenance_settings").update(updates).eq("id", setting.id);
      }
    }
  }

  return json(data);
}
