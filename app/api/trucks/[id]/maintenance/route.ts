import { getAuthContext, json, error } from "@/lib/api-helpers";
import {
  MAINTENANCE_ITEMS,
  CATEGORY_ORDER,
  getLifeRemaining,
  getDayLifeRemaining,
  getDaysRemaining,
  getStatusFromPercent,
  statusLabel,
} from "@/lib/maintenance-schedule";

interface TruckRow {
  id: string;
  current_mileage: number;
  current_hours: number;
}

interface MaintenanceSettingRow {
  service_type: string;
  mile_interval: number | null;
  hour_interval: number | null;
  day_interval: number | null;
  warning_miles: number;
  warning_days: number;
  current_miles_since: number;
  current_hours_since: number;
  last_service_date: string | null;
  last_service_miles: number | null;
  last_service_hours: number | null;
  notes: string | null;
  is_active: boolean;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  // Fetch truck
  const { data: truckRaw, error: truckErr } = await ctx.supabase
    .from("trucks")
    .select("id, current_mileage, current_hours")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (truckErr || !truckRaw) return error("Truck not found", 404);
  const truck = truckRaw as unknown as TruckRow;

  // Fetch maintenance settings for this truck
  const { data: settingsRaw, error: settingsErr } = await ctx.supabase
    .from("maintenance_settings")
    .select("*")
    .eq("truck_id", params.id)
    .eq("operator_id", ctx.operatorId);

  if (settingsErr) return error(settingsErr.message);
  const settings = (settingsRaw ?? []) as unknown as MaintenanceSettingRow[];

  // Build a map of settings by service_type
  const settingsMap = new Map<string, MaintenanceSettingRow>();
  for (const s of settings) {
    settingsMap.set(s.service_type, s);
  }

  // For each maintenance item, compute status
  const items = MAINTENANCE_ITEMS.map((item) => {
    const setting = settingsMap.get(item.type);

    // Use setting overrides or defaults
    const mileInterval = setting?.mile_interval ?? item.defaultMileInterval;
    const hourInterval = setting?.hour_interval ?? item.defaultHourInterval;
    const dayInterval = setting?.day_interval ?? item.defaultDayInterval;
    const currentMilesSince = setting?.current_miles_since ?? 0;
    const currentHoursSince = setting?.current_hours_since ?? 0;
    const lastServiceDate = setting?.last_service_date ?? null;
    const lastServiceMiles = setting?.last_service_miles ?? null;

    // Calculate life remaining for each tracking dimension
    let lifePercent = 100;
    let milesRemaining: number | null = null;
    let hoursRemaining: number | null = null;
    let daysRemaining: number | null = null;

    if (mileInterval && mileInterval > 0) {
      const mileLife = getLifeRemaining(currentMilesSince, mileInterval);
      lifePercent = Math.min(lifePercent, mileLife);
      milesRemaining = mileInterval - currentMilesSince;
    }

    if (hourInterval && hourInterval > 0) {
      const hourLife = getLifeRemaining(currentHoursSince, hourInterval);
      lifePercent = Math.min(lifePercent, hourLife);
      hoursRemaining = hourInterval - currentHoursSince;
    }

    if (dayInterval && dayInterval > 0 && lastServiceDate) {
      const dayLife = getDayLifeRemaining(lastServiceDate, dayInterval);
      lifePercent = Math.min(lifePercent, dayLife);
      daysRemaining = getDaysRemaining(lastServiceDate, dayInterval);
    } else if (dayInterval && dayInterval > 0 && !lastServiceDate && !setting) {
      // No setting at all — unknown, show as needing setup
      lifePercent = 100;
    }

    const status = getStatusFromPercent(lifePercent);

    return {
      type: item.type,
      label: item.label,
      category: item.category,
      description: item.description,
      status,
      statusText: statusLabel(status),
      lifePercent: Math.round(lifePercent),
      mileInterval,
      hourInterval,
      dayInterval,
      currentMilesSince,
      currentHoursSince,
      milesRemaining,
      hoursRemaining,
      daysRemaining,
      lastServiceDate,
      lastServiceMiles,
      isConfigured: !!setting,
    };
  });

  // Summary counts
  const summary = {
    total: items.length,
    green: items.filter((i) => i.status === "green").length,
    yellow: items.filter((i) => i.status === "yellow").length,
    orange: items.filter((i) => i.status === "orange").length,
    red: items.filter((i) => i.status === "red").length,
  };

  // Overall health score: average life percent
  const healthScore = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.lifePercent, 0) / items.length)
    : 100;

  return json({
    truckId: truck.id,
    currentMileage: truck.current_mileage,
    currentHours: truck.current_hours ?? 0,
    healthScore,
    items,
    summary,
    categoryOrder: CATEGORY_ORDER,
  });
}

// POST: Initialize/update maintenance settings for a truck
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();

  // Body can be a single setting or an array
  const settingsToUpsert = Array.isArray(body) ? body : [body];

  const results = [];

  for (const s of settingsToUpsert) {
    const payload = {
      truck_id: params.id,
      operator_id: ctx.operatorId,
      service_type: s.service_type,
      mile_interval: s.mile_interval ?? null,
      hour_interval: s.hour_interval ?? null,
      day_interval: s.day_interval ?? null,
      warning_miles: s.warning_miles ?? 500,
      warning_days: s.warning_days ?? 14,
      current_miles_since: s.current_miles_since ?? 0,
      current_hours_since: s.current_hours_since ?? 0,
      last_service_date: s.last_service_date ?? null,
      last_service_miles: s.last_service_miles ?? null,
      last_service_hours: s.last_service_hours ?? null,
      notes: s.notes ?? null,
      is_active: s.is_active ?? true,
    };

    const { data, error: dbError } = await (ctx.supabase
      .from("maintenance_settings")
      .upsert(payload as Record<string, unknown>, { onConflict: "truck_id,service_type" })
      .select()
      .single());

    if (dbError) {
      results.push({ service_type: s.service_type, error: dbError.message });
    } else {
      results.push(data);
    }
  }

  return json(results, 201);
}
