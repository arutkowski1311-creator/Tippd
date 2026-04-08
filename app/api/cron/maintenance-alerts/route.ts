import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

// Vercel Cron: checks truck service logs, alerts owner when due within 500 miles / 14 days
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();
  let alertsGenerated = 0;

  // Get all active trucks
  const { data: trucks } = await admin
    .from("trucks")
    .select("*, truck_service_log(*)")
    .eq("status", "active");

  if (!trucks) return json({ alerts: 0 });

  for (const truck of trucks) {
    const logs = (truck.truck_service_log as { next_due_miles?: number; next_due_date?: string; service_type: string }[]) || [];

    for (const log of logs) {
      // Check mileage-based alerts
      if (log.next_due_miles && truck.current_mileage) {
        const milesRemaining = log.next_due_miles - (truck.current_mileage as number);
        if (milesRemaining > 0 && milesRemaining <= 500) {
          // TODO: Send SMS to owner: "Truck X {service_type} due in {milesRemaining} miles"
          alertsGenerated++;
        }
      }

      // Check date-based alerts
      if (log.next_due_date) {
        const dueDate = new Date(log.next_due_date);
        const daysUntilDue = Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue > 0 && daysUntilDue <= 14) {
          // TODO: Send SMS to owner: "Truck X {service_type} due in {daysUntilDue} days"
          alertsGenerated++;
        }
      }
    }
  }

  return json({ alerts: alertsGenerated });
}
