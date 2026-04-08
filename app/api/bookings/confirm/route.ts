import { createAdminClient } from "@/lib/supabase/admin";
import { retrieveSetupIntent } from "@/lib/stripe";
import { json, error } from "@/lib/api-helpers";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
}

// Called from the confirm page after customer completes Stripe Checkout
// Retrieves the session, extracts the payment method, and saves it to the job
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return error("Missing session_id", 400);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.metadata?.job_id) return error("No job linked to this session", 400);

    const jobId = session.metadata.job_id;
    const setupIntentId = session.setup_intent as string;

    if (!setupIntentId) return error("No setup intent found", 400);

    // Get the payment method from the setup intent
    const setupIntent = await retrieveSetupIntent(setupIntentId);
    const paymentMethodId = setupIntent.payment_method as string;

    if (!paymentMethodId) return error("No payment method saved", 400);

    const admin = createAdminClient();

    // Update job with payment method
    await admin
      .from("jobs")
      .update({
        stripe_setup_intent_id: setupIntentId,
        stripe_payment_method_id: paymentMethodId,
      })
      .eq("id", jobId);

    // Also update customer record
    const { data: job } = await admin
      .from("jobs")
      .select("customer_id, deposit_amount")
      .eq("id", jobId)
      .single();

    if (job?.customer_id) {
      await admin
        .from("customers")
        .update({ stripe_payment_method_id: paymentMethodId })
        .eq("id", job.customer_id);
    }

    return json({
      ok: true,
      deposit_amount: job?.deposit_amount || 0,
      payment_method_saved: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to confirm booking";
    return error(message, 500);
  }
}
