import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { sendEveningBeforeWindows } from "@/lib/dispatch-notifications";
import { NextRequest } from "next/server";

/**
 * Vercel Cron: runs every evening at 6pm.
 * Sends 4-hour arrival windows to customers with jobs on tomorrow's routes.
 * Blueprint Section 07 — Layer 1 (Proactive Dispatch)
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Find all locked routes for tomorrow
  const { data: routes } = await admin
    .from("routes")
    .select("id, operator_id")
    .eq("date", tomorrowStr)
    .eq("status", "locked");

  if (!routes?.length) return json({ message: "No locked routes for tomorrow", sent: 0 });

  let totalSent = 0;
  const errors: string[] = [];

  for (const route of routes) {
    try {
      const results = await sendEveningBeforeWindows(admin, route.id, route.operator_id);
      totalSent += results.filter((r) => r.sent).length;
      results.filter((r) => !r.sent).forEach((r) => errors.push(r.error || "Unknown"));
    } catch (err: any) {
      errors.push(`Route ${route.id}: ${err.message}`);
    }
  }

  return json({
    date: tomorrowStr,
    routes_processed: routes.length,
    notifications_sent: totalSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
