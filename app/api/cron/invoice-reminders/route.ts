import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { NextRequest } from "next/server";
import { COLLECTION_SCHEDULE } from "@/lib/constants";

// Vercel Cron: runs daily, checks all invoices and fires reminders at Day 30/45/60/80/90
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();
  const now = new Date();
  let reminderssSent = 0;

  // Get all sent/overdue invoices that haven't been paid
  const { data: invoices } = await admin
    .from("invoices")
    .select("*")
    .in("status", ["sent", "overdue_30", "overdue_45", "overdue_60", "overdue_80"])
    .is("paid_at", null);

  if (!invoices) return json({ reminders_sent: 0 });

  for (const invoice of invoices) {
    const issuedDate = new Date(invoice.issued_date as string);
    const daysOutstanding = Math.floor((now.getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24));

    for (const schedule of COLLECTION_SCHEDULE) {
      if (daysOutstanding >= schedule.day) {
        const reminderLog = (invoice.reminder_log as { day: number }[]) || [];
        const alreadySent = reminderLog.some((r) => r.day === schedule.day);

        if (!alreadySent) {
          // Update status
          const newStatus =
            schedule.day >= 90 ? "collections" :
            schedule.day >= 80 ? "overdue_80" :
            schedule.day >= 60 ? "overdue_60" :
            schedule.day >= 45 ? "overdue_45" :
            "overdue_30";

          await admin
            .from("invoices")
            .update({
              status: newStatus,
              reminder_log: [...reminderLog, { day: schedule.day, sent_at: now.toISOString(), channel: "sms" }],
            })
            .eq("id", invoice.id);

          // TODO: Send SMS/email reminder to customer
          reminderssSent++;
          break; // Only fire the latest applicable reminder
        }
      }
    }
  }

  return json({ reminders_sent: reminderssSent });
}
