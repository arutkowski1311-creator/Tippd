import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

// Called by cron — fires collection reminders
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify cron secret
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();

  const { data: invoice, error: fetchError } = await admin
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !invoice) return error("Invoice not found", 404);

  // TODO: Send reminder via SMS + email
  // TODO: Update reminder_log with new entry

  return json({ message: "Reminder sent", invoice_id: params.id });
}
