/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { sendSMS, normalizePhone } from "@/lib/twilio";
import {
  SMS_TEMPLATES,
  type TemplateType,
} from "@/lib/sms-templates";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Internal notification endpoint
// POST /api/comms/notify
//
// Called by the system (cron jobs, webhook handlers, dashboard actions) to
// send templated SMS notifications. NOT customer-facing.
//
// Body: {
//   type: TemplateType,
//   customer_id: string,
//   job_id?: string,
//   params: object (template-specific)
// }
// ---------------------------------------------------------------------------

// Metro Waste constants
const METRO_WASTE_OPERATOR_ID = "d216a6c0-d75d-4f87-a258-e8f0a6ce1328";
const METRO_WASTE_TWILIO_NUMBER = "+19088668216";

// Simple auth: require a shared secret so only internal callers can hit this
function validateInternalAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.INTERNAL_API_SECRET;
  // If no secret is configured, allow (dev mode). In production set INTERNAL_API_SECRET.
  if (!expected) return true;
  return authHeader === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  if (!validateInternalAuth(request)) {
    return error("Unauthorized", 401);
  }

  let body: {
    type: string;
    customer_id: string;
    job_id?: string;
    operator_id?: string;
    params?: Record<string, string>;
  };

  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const { type, customer_id, job_id, params = {} } = body;
  const operatorId = body.operator_id || METRO_WASTE_OPERATOR_ID;

  // Validate template type
  if (!type || !(type in SMS_TEMPLATES)) {
    return error(
      `Invalid template type: ${type}. Valid types: ${Object.keys(SMS_TEMPLATES).join(", ")}`,
      400
    );
  }

  if (!customer_id) {
    return error("customer_id is required", 400);
  }

  const admin = createAdminClient();

  // -----------------------------------------------------------------------
  // 1. Look up customer phone
  // -----------------------------------------------------------------------
  const { data: customer, error: custErr } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("id", customer_id)
    .eq("operator_id", operatorId)
    .single();

  if (custErr || !customer) {
    return error("Customer not found", 404);
  }

  const phone = customer.phone as string;
  if (!phone) {
    return error("Customer has no phone number on file", 400);
  }

  // -----------------------------------------------------------------------
  // 2. Look up operator Twilio number
  // -----------------------------------------------------------------------
  const { data: operator } = await admin
    .from("operators")
    .select("twilio_number")
    .eq("id", operatorId)
    .single();

  const fromNumber = (operator?.twilio_number as string) || METRO_WASTE_TWILIO_NUMBER;

  // -----------------------------------------------------------------------
  // 3. Format the template
  // -----------------------------------------------------------------------
  const templateFn = SMS_TEMPLATES[type as TemplateType];
  let messageBody: string;

  try {
    // Each template function takes its specific params object
    messageBody = (templateFn as (p: Record<string, string>) => string)(params);
  } catch (err) {
    return error(
      `Failed to format template "${type}": ${err instanceof Error ? err.message : "Unknown error"}`,
      400
    );
  }

  // -----------------------------------------------------------------------
  // 4. Send SMS via Twilio
  // -----------------------------------------------------------------------
  let twilioSid: string;

  try {
    const result = await sendSMS({
      to: phone,
      body: messageBody,
      from: fromNumber,
    });
    twilioSid = result.sid;
  } catch (err) {
    console.error("[notify] Twilio send failed:", err);
    return error(
      `SMS send failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      500
    );
  }

  // -----------------------------------------------------------------------
  // 5. Log outbound communication
  // -----------------------------------------------------------------------
  const { data: comm, error: dbError } = await admin
    .from("communications")
    .insert({
      operator_id: operatorId,
      customer_id: customer_id,
      job_id: job_id || null,
      direction: "outbound",
      channel: "sms",
      from_number: fromNumber,
      to_number: normalizePhone(phone),
      raw_content: messageBody,
      twilio_sid: twilioSid,
    } as any)
    .select()
    .single();

  if (dbError) {
    console.error("[notify] DB log error:", dbError);
    // SMS was sent successfully — don't fail the whole request
  }

  return json({
    success: true,
    sid: twilioSid,
    template: type,
    to: normalizePhone(phone),
    comm_id: (comm as any)?.id || null,
  });
}
