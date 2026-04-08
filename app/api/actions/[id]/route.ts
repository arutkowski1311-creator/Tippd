import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

/**
 * PATCH /api/actions/[id]
 * Update an action item — change status, priority, assign, or resolve.
 */
const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
  assigned_to: z.string().uuid().optional(),
  resolution_notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const updates: Record<string, unknown> = { ...parsed.data };

  // If resolving, stamp resolved_by and resolved_at
  if (parsed.data.status === "resolved") {
    updates.resolved_by = ctx.user.id;
    updates.resolved_at = new Date().toISOString();
    if (parsed.data.resolution_notes) {
      updates.resolution_notes = parsed.data.resolution_notes;
    }
  }

  const { data, error: dbError } = await (ctx.supabase as any)
    .from("action_items")
    .update(updates)
    .eq("id", id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  if (!data) return error("Action item not found", 404);
  return json(data);
}
