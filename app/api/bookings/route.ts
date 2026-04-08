import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { createSetupSession } from "@/lib/stripe";
import { DEPOSIT_PERCENT } from "@/lib/constants";
import { z } from "zod";

const bookingSchema = z.object({
  operator_id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  drop_address: z.string().min(1),
  drop_lat: z.number().optional(),
  drop_lng: z.number().optional(),
  size: z.enum(["10yd", "20yd", "30yd"]),
  job_type: z.enum(["residential", "commercial", "construction", "industrial", "estate_cleanout", "other"]).default("residential"),
  requested_drop_start: z.string(),
  requested_drop_end: z.string().optional(),
  customer_notes: z.string().optional(),
  sms_consent: z.boolean().optional().default(true),
  terms_accepted_at: z.string(),
});

// Public — no auth required
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  const admin = createAdminClient();

  // Get operator pricing + name
  const { data: operator, error: opError } = await admin
    .from("operators")
    .select("name, base_rate_10yd, base_rate_20yd, base_rate_30yd, standard_rental_days")
    .eq("id", parsed.data.operator_id)
    .single();

  if (opError || !operator) return error("Operator not found", 404);

  const baseRate = parsed.data.size === "10yd"
    ? operator.base_rate_10yd
    : parsed.data.size === "20yd"
    ? operator.base_rate_20yd
    : operator.base_rate_30yd;

  // Auto-schedule pickup based on standard_rental_days (default 7)
  const rentalDays = (operator as any).standard_rental_days || 7;
  const dropDate = new Date(parsed.data.requested_drop_start);
  const pickupDate = new Date(dropDate);
  pickupDate.setDate(pickupDate.getDate() + rentalDays);

  // Find or create customer
  let { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("operator_id", parsed.data.operator_id)
    .eq("phone", parsed.data.phone)
    .single();

  if (!customer) {
    const { data: newCustomer } = await admin
      .from("customers")
      .insert({
        operator_id: parsed.data.operator_id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        type: "residential",
        sms_consent: parsed.data.sms_consent ?? true,
        sms_consent_at: new Date().toISOString(),
        sms_consent_source: "booking_form",
      } as any)
      .select()
      .single();
    customer = newCustomer;
  } else if (parsed.data.sms_consent) {
    // Update consent if customer already exists (re-booking)
    await admin
      .from("customers")
      .update({
        sms_consent: true,
        sms_consent_at: new Date().toISOString(),
        sms_consent_source: "booking_form",
        sms_opted_out_at: null,
      } as any)
      .eq("id", (customer as any).id);
  }

  if (!customer) return error("Failed to create customer", 500);

  // Create job
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .insert({
      operator_id: parsed.data.operator_id,
      customer_id: customer.id,
      customer_name: parsed.data.name,
      customer_phone: parsed.data.phone,
      drop_address: parsed.data.drop_address,
      drop_lat: parsed.data.drop_lat,
      drop_lng: parsed.data.drop_lng,
      job_type: parsed.data.job_type,
      requested_drop_start: parsed.data.requested_drop_start,
      requested_drop_end: parsed.data.requested_drop_end,
      customer_notes: parsed.data.customer_notes,
      base_rate: baseRate,
      requested_pickup_start: pickupDate.toISOString(),
      requested_pickup_end: pickupDate.toISOString(),
      status: "pending_approval",
    })
    .select()
    .single();

  if (jobError) return error(jobError.message);

  // Calculate deposit and create Stripe setup session
  const depositAmount = Math.round(baseRate * DEPOSIT_PERCENT * 100) / 100;
  const origin = new URL(request.url).origin;

  try {
    const { session, stripeCustomerId } = await createSetupSession({
      customerEmail: parsed.data.email,
      customerName: parsed.data.name,
      stripeCustomerId: (customer as any).stripe_customer_id || undefined,
      jobId: job.id,
      operatorName: operator.name,
      depositAmount,
      successUrl: `${origin}/book/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/book/cancel`,
    });

    // Update job with deposit info + terms acceptance
    await admin
      .from("jobs")
      .update({
        deposit_amount: depositAmount,
        deposit_status: "pending",
        stripe_checkout_session_id: session.id,
        terms_accepted_at: parsed.data.terms_accepted_at,
      })
      .eq("id", job.id);

    // Store Stripe customer ID on customer record
    if (stripeCustomerId) {
      await admin
        .from("customers")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", customer!.id);
    }

    return json({ ...job, deposit_amount: depositAmount, checkout_url: session.url }, 201);
  } catch (stripeError) {
    // Job was created but Stripe failed — return job without checkout URL
    // Operator can see the job and follow up manually
    return json(
      { ...job, deposit_amount: 0, checkout_url: null, stripe_error: true },
      201
    );
  }
}
