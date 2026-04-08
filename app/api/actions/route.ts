import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

/**
 * GET /api/actions
 * Fetch action items for the current operator.
 * Supports filters: status, type, priority
 */
export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const priority = searchParams.get("priority");

  let query = (ctx.supabase as any)
    .from("action_items")
    .select("*")
    .eq("operator_id", ctx.operatorId);

  if (status) {
    query = query.eq("status", status);
  }
  if (type) {
    query = query.eq("type", type);
  }
  if (priority) {
    query = query.eq("priority", priority);
  }

  // Priority ordering: urgent first, then high, normal, low
  // Within each priority, newest first
  query = query
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);

  // Re-sort by priority weight since Supabase alphabetical sort isn't right
  const priorityWeight: Record<string, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  const sorted = (data ?? []).sort((a: any, b: any) => {
    const pa = priorityWeight[a.priority] ?? 2;
    const pb = priorityWeight[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return json(sorted);
}

/**
 * POST /api/actions
 * Create a new action item. Used by internal systems (SMS handler, driver app, crons, etc.)
 */
const createSchema = z.object({
  type: z.string(),
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  title: z.string().min(1),
  description: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  job_id: z.string().uuid().optional(),
  truck_id: z.string().uuid().optional(),
  dumpster_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  communication_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const { data, error: dbError } = await (ctx.supabase as any)
    .from("action_items")
    .insert({
      ...parsed.data,
      operator_id: ctx.operatorId,
      status: "open",
    })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
