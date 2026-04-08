import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

// Vercel Cron: applies 7% late fee at Day 60, additional 10% at Day 80
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();
  const now = new Date();
  let feesApplied = 0;

  const { data: invoices } = await admin
    .from("invoices")
    .select("*")
    .in("status", ["overdue_60", "overdue_80"])
    .is("paid_at", null);

  if (!invoices) return json({ fees_applied: 0 });

  for (const invoice of invoices) {
    const issuedDate = new Date(invoice.issued_date as string);
    const daysOutstanding = Math.floor((now.getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentLateFee = (invoice.late_fee_amount as number) || 0;
    const baseTotal = (invoice.base_amount as number) + (invoice.weight_amount as number) + (invoice.daily_overage_amount as number) - (invoice.discount_amount as number);

    let newFee = currentLateFee;

    // Day 60: 7% late fee
    if (daysOutstanding >= 60 && currentLateFee === 0) {
      newFee = baseTotal * 0.07;
      feesApplied++;
    }

    // Day 80: additional 10% late fee
    if (daysOutstanding >= 80 && currentLateFee <= baseTotal * 0.07) {
      newFee = baseTotal * 0.07 + baseTotal * 0.10;
      feesApplied++;
    }

    if (newFee !== currentLateFee) {
      await admin
        .from("invoices")
        .update({
          late_fee_amount: newFee,
          total_amount: baseTotal + newFee,
        })
        .eq("id", invoice.id);
    }
  }

  return json({ fees_applied: feesApplied });
}
