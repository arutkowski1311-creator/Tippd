import { getAuthContext, json, error } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNextInvoiceNumber } from "@/lib/document-numbers";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = ctx.supabase
    .from("invoices")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}

// System auto-generates invoices on job pickup + weight entry
const createSchema = z.object({
  job_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const admin = createAdminClient();

  // Get job details
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("*, customers(email)")
    .eq("id", parsed.data.job_id)
    .single();

  if (jobError || !job) return error("Job not found", 404);

  // Generate sequential invoice number
  const invoiceNumber = await getNextInvoiceNumber(admin, job.operator_id);

  const totalAmount =
    (job.base_rate || 0) +
    (job.weight_charge || 0) +
    (job.daily_overage_charge || 0) -
    (job.discount_amount || 0);

  const { data, error: dbError } = await admin
    .from("invoices")
    .insert({
      operator_id: job.operator_id,
      job_id: job.id,
      customer_id: job.customer_id,
      customer_name: job.customer_name,
      customer_email: ((job as Record<string, unknown>).customers as Record<string, string>)?.email || "",
      customer_phone: job.customer_phone,
      invoice_number: invoiceNumber,
      base_amount: job.base_rate,
      weight_amount: job.weight_charge || 0,
      daily_overage_amount: job.daily_overage_charge || 0,
      discount_amount: job.discount_amount || 0,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
