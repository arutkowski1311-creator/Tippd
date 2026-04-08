import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";
import { TIRE_POSITIONS, TIRE_CONDITIONS } from "@/lib/maintenance-schedule";

interface TireRow {
  id: string;
  truck_id: string;
  position: string;
  brand: string | null;
  installed_date: string | null;
  installed_miles: number | null;
  current_tread_depth: number | null;
  condition: string;
  notes: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data: tiresRaw, error: dbError } = await ctx.supabase
    .from("tire_tracking")
    .select("*")
    .eq("truck_id", params.id)
    .eq("operator_id", ctx.operatorId);

  if (dbError) return error(dbError.message);

  const tires = (tiresRaw ?? []) as unknown as TireRow[];

  // Get truck mileage for computing miles on each tire
  const { data: truckRaw } = await ctx.supabase
    .from("trucks")
    .select("current_mileage")
    .eq("id", params.id)
    .single();

  const currentMileage = (truckRaw as unknown as { current_mileage: number })?.current_mileage ?? 0;

  // Build result for all 10 positions (fill in missing positions with defaults)
  const tireMap = new Map<string, TireRow>();
  for (const t of tires) {
    tireMap.set(t.position, t);
  }

  const result = TIRE_POSITIONS.map((pos) => {
    const tire = tireMap.get(pos);
    const installedMiles = tire?.installed_miles ?? null;
    const milesOnTire = installedMiles !== null ? currentMileage - installedMiles : null;

    return {
      position: pos,
      id: tire?.id ?? null,
      brand: tire?.brand ?? null,
      installedDate: tire?.installed_date ?? null,
      installedMiles: installedMiles,
      currentTreadDepth: tire?.current_tread_depth ?? null,
      condition: tire?.condition ?? "good",
      milesOnTire,
      notes: tire?.notes ?? null,
      hasData: !!tire,
    };
  });

  return json(result);
}

const tireUpdateSchema = z.object({
  position: z.enum(TIRE_POSITIONS as unknown as [string, ...string[]]),
  brand: z.string().optional(),
  installed_date: z.string().optional(),
  installed_miles: z.number().int().optional(),
  current_tread_depth: z.number().optional(),
  condition: z.enum(TIRE_CONDITIONS as unknown as [string, ...string[]]).optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = tireUpdateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const payload = {
    truck_id: params.id,
    operator_id: ctx.operatorId,
    position: parsed.data.position,
    brand: parsed.data.brand ?? null,
    installed_date: parsed.data.installed_date ?? null,
    installed_miles: parsed.data.installed_miles ?? null,
    current_tread_depth: parsed.data.current_tread_depth ?? null,
    condition: parsed.data.condition ?? "good",
    notes: parsed.data.notes ?? null,
  };

  const { data, error: dbError } = await (ctx.supabase
    .from("tire_tracking")
    .upsert(payload as Record<string, unknown>, { onConflict: "truck_id,position" })
    .select()
    .single());

  if (dbError) return error(dbError.message);
  return json(data, 201);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Same as POST - upsert
  return POST(request, { params });
}
