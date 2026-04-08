import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
}

interface CreateCheckoutParams {
  customerEmail: string;
  jobId: string;
  operatorName: string;
  amount: number; // in cents
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession({
  customerEmail,
  jobId,
  operatorName,
  amount,
  description,
  successUrl,
  cancelUrl,
  metadata = {},
}: CreateCheckoutParams) {
  return getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${operatorName} — ${description}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      job_id: jobId,
      ...metadata,
    },
  });
}

// ─── Setup Session (save card without charging) ───

interface CreateSetupParams {
  customerEmail: string;
  customerName: string;
  stripeCustomerId?: string;
  jobId: string;
  operatorName: string;
  depositAmount: number; // dollars, for metadata only
  successUrl: string;
  cancelUrl: string;
}

export async function createSetupSession({
  customerEmail,
  customerName,
  stripeCustomerId,
  jobId,
  operatorName,
  depositAmount,
  successUrl,
  cancelUrl,
}: CreateSetupParams) {
  const stripe = getStripe();

  // Create or reuse Stripe customer
  const customerId =
    stripeCustomerId ||
    (
      await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: { source: "booking_form" },
      })
    ).id;

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      job_id: jobId,
      deposit_amount: String(depositAmount),
    },
  });

  return { session, stripeCustomerId: customerId };
}

// ─── Charge Deposit (off-session with saved payment method) ───

interface ChargeDepositParams {
  stripeCustomerId: string;
  paymentMethodId: string;
  amount: number; // in cents
  jobId: string;
  description: string;
}

export async function chargeDeposit({
  stripeCustomerId,
  paymentMethodId,
  amount,
  jobId,
  description,
}: ChargeDepositParams) {
  return getStripe().paymentIntents.create({
    amount,
    currency: "usd",
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    description,
    metadata: { job_id: jobId, type: "deposit" },
  });
}

// ─── Refund Deposit ───

export async function refundDeposit(paymentIntentId: string, reason?: string) {
  return getStripe().refunds.create({
    payment_intent: paymentIntentId,
    metadata: { reason: reason || "customer_cancellation" },
  });
}

// ─── Retrieve Setup Intent (for webhook) ───

export async function retrieveSetupIntent(setupIntentId: string) {
  return getStripe().setupIntents.retrieve(setupIntentId);
}

// ─── Webhook Event Construction ───

export async function constructWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  return getStripe().webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
