import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";
import { validateJobTransition } from "@/lib/state-machines";
import type { JobStatus } from "@/types/job";

const statusSchema = z.object({
  status: z.enum([
    "pending_approval", "scheduled", "en_route_drop", "dropped", "active",
    "pickup_requested", "pickup_scheduled", "en_route_pickup", "picked_up",
    "invoiced", "paid", "cancelled", "disputed",
  ]),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager", "driver"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();

  // Get current job first (needed for action-to-status mapping)
  const { data: job, error: fetchError } = await ctx.supabase
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (fetchError || !job) return error("Job not found", 404);

  const currentStatus = job.status as JobStatus;

  // Support both formats: { status: "dropped" } or { action: "arrived" }
  let newStatus: string;
  if (body.status) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.message);
    newStatus = parsed.data.status;
  } else if (body.action) {
    // Map driver actions to job statuses
    // Map driver actions to the correct next status based on current state
    const arrivedStatus = ["pickup_requested", "pickup_scheduled", "en_route_pickup"].includes(currentStatus)
      ? "en_route_pickup"
      : "en_route_drop";

    const actionMap: Record<string, string> = {
      arrived: arrivedStatus,
      dropped: "dropped",
      picked_up: "picked_up",
      dump_arrived: currentStatus, // no job status change for dump
      dump_complete: currentStatus, // no job status change for dump
      schedule_pickup: "pickup_scheduled",
      cancel: "cancelled",
    };
    newStatus = actionMap[body.action] || currentStatus;

    // For dump actions, just return ok without changing status
    if (body.action === "dump_arrived" || body.action === "dump_complete") {
      return json({ ok: true, status: currentStatus });
    }
  } else {
    return error("status or action required");
  }

  // Enforce state machine
  const validation = validateJobTransition(currentStatus, newStatus as JobStatus, {
    hasDropPhoto: (job.photos_drop as string[])?.length > 0,
    hasPickupPhoto: (job.photos_pickup as string[])?.length > 0,
    hasWeight: job.weight_lbs != null,
    hasDumpster: job.dumpster_id != null,
    hasTruck: job.truck_id != null,
    hasDriver: job.assigned_driver_id != null,
  });

  if (!validation.valid) {
    return error(validation.reason || "Invalid transition", 422);
  }

  // Build update payload with auto-timestamps
  const update: Record<string, unknown> = { status: newStatus };

  if (newStatus === "dropped") {
    update.actual_drop_time = new Date().toISOString();

    // Auto-schedule pickup based on operator's standard_rental_days
    const { data: operator } = await ctx.supabase
      .from("operators")
      .select("standard_rental_days")
      .eq("id", ctx.operatorId)
      .single();

    const rentalDays = (operator as any)?.standard_rental_days ?? 7;
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + rentalDays);
    // Set pickup window for 7am-5pm on the scheduled pickup day
    const pickupDay = pickupDate.toISOString().split("T")[0];
    update.requested_pickup_start = `${pickupDay}T07:00:00`;
    update.requested_pickup_end = `${pickupDay}T17:00:00`;
  }

  if (newStatus === "picked_up") {
    update.actual_pickup_time = new Date().toISOString();

    // Calculate days on site
    if (job.actual_drop_time) {
      const dropDate = new Date(job.actual_drop_time as string);
      const now = new Date();
      const daysOnSite = Math.ceil(
        (now.getTime() - dropDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      update.days_on_site = daysOnSite;
    }
  }

  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (dbError) return error(dbError.message);

  // Update dumpster condition if provided (after pickup)
  if (body.condition && job.dumpster_id) {
    await ctx.supabase
      .from("dumpsters")
      .update({ condition_grade: body.condition })
      .eq("id", job.dumpster_id);
  }

  return json({ ok: true, ...data });
}
