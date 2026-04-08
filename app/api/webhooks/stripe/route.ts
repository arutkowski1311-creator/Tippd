import { createAdminClient } from "@/lib/supabase/admin";
import { constructWebhookEvent, retrieveSetupIntent } from "@/lib/stripe";
import { json, error } from "@/lib/api-helpers";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) return error("Missing stripe-signature", 400);

  let event;
  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err) {
    return error(`Webhook verification failed: ${err instanceof Error ? err.message : "Unknown"}`, 400);
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const jobId = session.metadata?.job_id;
      const invoiceId = session.metadata?.invoice_id;

      if (session.mode === "setup" && jobId) {
        // Setup session — save payment method from booking deposit flow
        const setupIntentId = session.setup_intent as string;
        const setupIntent = await retrieveSetupIntent(setupIntentId);
        const paymentMethodId = setupIntent.payment_method as string;

        // Update job with saved payment method
        await admin
          .from("jobs")
          .update({
            stripe_setup_intent_id: setupIntentId,
            stripe_payment_method_id: paymentMethodId,
          })
          .eq("id", jobId);

        // Also update customer record for future use
        const { data: job } = await admin
          .from("jobs")
          .select("customer_id")
          .eq("id", jobId)
          .single();

        if (job?.customer_id) {
          await admin
            .from("customers")
            .update({ stripe_payment_method_id: paymentMethodId })
            .eq("id", job.customer_id);
        }
        break;
      }

      if (invoiceId) {
        // Payment for invoice
        await admin
          .from("invoices")
          .update({
            status: "paid",
            amount_paid: (session.amount_total || 0) / 100,
            stripe_payment_intent_id: session.payment_intent as string,
            paid_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        // Update job status to paid
        if (jobId) {
          await admin
            .from("jobs")
            .update({ status: "paid" })
            .eq("id", jobId);
        }
      }
      break;
    }

    case "payment_intent.succeeded": {
      // Deposit charge confirmed — update job deposit status
      const pi = event.data.object as any;
      const jobId = pi.metadata?.job_id;
      const type = pi.metadata?.type;

      if (jobId && type === "deposit") {
        await admin
          .from("jobs")
          .update({
            deposit_status: "charged",
            stripe_payment_intent_id: pi.id,
          })
          .eq("id", jobId);
      }
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return json({ received: true });
}
