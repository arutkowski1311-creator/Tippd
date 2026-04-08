import { getAuthContext, json, error } from "@/lib/api-helpers";
import { chargeDeposit } from "@/lib/stripe";
import { DEPOSIT_PERCENT } from "@/lib/constants";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  // Load job
  const { data: job, error: fetchError } = await ctx.supabase
    .from("jobs")
    .select("*, customers!inner(stripe_customer_id)")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (fetchError || !job) return error("Job not found", 404);

  if (job.status !== "pending_approval") {
    return error("Job is not pending approval", 422);
  }

  const stripeCustomerId = (job as any).customers?.stripe_customer_id;
  const paymentMethodId = job.stripe_payment_method_id;

  // If payment method exists, charge the deposit
  if (paymentMethodId && stripeCustomerId) {
    const depositCents = Math.round((job.deposit_amount || job.base_rate * DEPOSIT_PERCENT) * 100);

    try {
      const paymentIntent = await chargeDeposit({
        stripeCustomerId,
        paymentMethodId,
        amount: depositCents,
        jobId: job.id,
        description: `Deposit — ${job.drop_address}`,
      });

      if (paymentIntent.status !== "succeeded") {
        return error("Payment requires additional action. Please contact the customer.", 402);
      }

      // Update job: scheduled + deposit charged
      const { error: updateError } = await ctx.supabase
        .from("jobs")
        .update({
          status: "scheduled",
          deposit_status: "charged",
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq("id", params.id);

      if (updateError) return error(updateError.message);

      return json({ ok: true, status: "scheduled", deposit_status: "charged" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed";
      return error(`Deposit charge failed: ${message}`, 402);
    }
  }

  // No payment method (legacy job or Stripe setup was abandoned) — approve without charging
  const { error: updateError } = await ctx.supabase
    .from("jobs")
    .update({ status: "scheduled" })
    .eq("id", params.id);

  if (updateError) return error(updateError.message);

  return json({ ok: true, status: "scheduled", deposit_status: "none" });
}
