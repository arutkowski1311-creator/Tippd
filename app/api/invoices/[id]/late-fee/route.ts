import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

// Called by cron — applies late fees at Day 60 (7%) and Day 80 (+10%)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const body = await request.json();
  const { fee_percent } = body as { fee_percent: number };

  if (!fee_percent) return error("fee_percent required", 400);

  const admin = createAdminClient();

  const { data: invoice, error: fetchError } = await admin
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !invoice) return error("Invoice not found", 404);

  const feeAmount = (invoice.total_amount as number) * (fee_percent / 100);
  const newLateFee = (invoice.late_fee_amount as number) + feeAmount;
  const newTotal = (invoice.total_amount as number) + feeAmount;

  const { data, error: dbError } = await admin
    .from("invoices")
    .update({
      late_fee_amount: newLateFee,
      total_amount: newTotal,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
