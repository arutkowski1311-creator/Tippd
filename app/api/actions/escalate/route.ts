import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/twilio";
import { getTier } from "@/lib/notification-tiers";

/**
 * POST /api/actions/escalate
 *
 * Checks for severity-3 (high priority) action items that have been open
 * longer than their escalationMinutes threshold without acknowledgment.
 * Escalates them to SMS and marks them escalated.
 *
 * Call this endpoint from a cron or from the dashboard polling loop.
 * Safe to call repeatedly — uses a `escalated_at` field to prevent re-sending.
 */
export async function POST() {
  const supabase = await createClient();

  // Auth check — must be internal call or owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Get operator ID
  const { data: profile } = await (supabase as any)
    .from("users")
    .select("operator_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const operatorId = profile.operator_id;
  const now = new Date();

  // Fetch all open high-priority items (severity 3) not yet escalated
  const { data: items, error } = await (supabase as any)
    .from("action_items")
    .select("*")
    .eq("operator_id", operatorId)
    .eq("status", "open")
    .eq("priority", "high") // severity 3
    .is("escalated_at", null);   // not yet escalated

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const escalated: string[] = [];

  for (const item of (items || [])) {
    const tier = getTier(item.type);

    // Skip items with no escalation timer, or ones that haven't hit their threshold yet
    if (!tier.escalationMinutes) continue;

    const createdAt = new Date(item.created_at);
    const ageMinutes = (now.getTime() - createdAt.getTime()) / 60000;

    if (ageMinutes < tier.escalationMinutes) continue;

    // Escalate: get owner/manager phone numbers
    const { data: staff } = await (supabase as any)
      .from("users")
      .select("phone")
      .eq("operator_id", operatorId)
      .in("role", ["owner", "manager"])
      .not("phone", "is", null);

    const phones: string[] = (staff || []).map((s: any) => s.phone).filter(Boolean);

    if (phones.length > 0) {
      const message =
        `⚠️ TIPPD ALERT [${tier.label.toUpperCase()}]\n` +
        `${item.title}\n` +
        (item.description ? `${item.description}\n` : "") +
        `Unacknowledged for ${Math.round(ageMinutes)} min. Action required now.\n` +
        `Open Tippd → Actions to resolve.`;

      await Promise.allSettled(
        phones.map(phone => sendSMS({ to: phone, body: message }))
      );
    }

    // Mark as escalated so we don't re-send
    await (supabase as any)
      .from("action_items")
      .update({ escalated_at: now.toISOString() })
      .eq("id", item.id);

    escalated.push(item.id);
  }

  return NextResponse.json({ escalated, count: escalated.length });
}
