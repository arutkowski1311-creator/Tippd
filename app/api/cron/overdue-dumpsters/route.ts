import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { NextRequest } from "next/server";
import { OVERDUE_DUMPSTER_DAYS } from "@/lib/constants";

// Vercel Cron: checks days_on_site, fires customer SMS at Day 10/14/21
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();
  let alertsSent = 0;

  // Get active jobs with dumpsters on site
  const { data: jobs } = await admin
    .from("jobs")
    .select("*")
    .in("status", ["active", "dropped"]);

  if (!jobs) return json({ alerts_sent: 0 });

  const now = new Date();

  for (const job of jobs) {
    if (!job.actual_drop_time) continue;

    const dropDate = new Date(job.actual_drop_time as string);
    const daysOnSite = Math.floor((now.getTime() - dropDate.getTime()) / (1000 * 60 * 60 * 24));

    for (const threshold of OVERDUE_DUMPSTER_DAYS) {
      if (daysOnSite === threshold) {
        // TODO: Send SMS to customer about dumpster on site for {threshold} days
        // "Your dumpster has been on site for {threshold} days. Your 7-day rental period has ended.
        //  Daily overage of $25/day applies. Ready for pickup? Reply PICKUP or call us."
        alertsSent++;
      }
    }
  }

  return json({ alerts_sent: alertsSent });
}
