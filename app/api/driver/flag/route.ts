import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * POST /api/driver/flag
 *
 * Allows drivers to report exceptions on-road.
 * Creates an action_item with type "driver_flag" (severity 3 per notification-tiers.ts).
 * The dashboard polling loop will surface this as a toast + bell badge within 60 seconds,
 * and it will auto-escalate to SMS after 15 minutes if unacknowledged.
 */

const flagSchema = z.object({
  exception_type: z.enum([
    "box_inaccessible",
    "customer_not_present",
    "prohibited_material",
    "wrong_address",
    "site_blocked",
    "truck_problem",
    "damage_at_site",
    "other",
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  job_id: z.string().uuid().optional(),
  segment_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // Require any authenticated user (driver, owner, manager all OK)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await (supabase as any)
    .from("users")
    .select("operator_id, role, id")
    .eq("id", authUser.id)
    .single();

  if (!profile || !profile.operator_id) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { exception_type, title, description, job_id, segment_id } = parsed.data;

  // Insert the action item
  const { data: item, error: dbError } = await (supabase as any)
    .from("action_items")
    .insert({
      operator_id: profile.operator_id,
      type: "driver_flag",
      priority: "high",           // severity 3 — toast + 15-min SMS escalation
      status: "open",
      title,
      description: description || null,
      driver_id: profile.id,
      job_id: job_id || null,
      // Store the segment reference in description if no dedicated column
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: item.id, exception_type }, { status: 201 });
}
