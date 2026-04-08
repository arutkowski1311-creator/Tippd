import twilio from "twilio";

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
}

// ---------------------------------------------------------------------------
// Phone number normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US numbers).
 * Strips all non-digit characters, then adds country code if needed.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits[0] === "1") return "+" + digits;
  return "+" + digits;
}

/**
 * Check whether two phone numbers are the same after normalization.
 */
export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

// ---------------------------------------------------------------------------
// Send SMS
// ---------------------------------------------------------------------------

interface SendSMSParams {
  to: string;
  body: string;
  from?: string;
}

export async function sendSMS({ to, body, from }: SendSMSParams) {
  return getClient().messages.create({
    to: normalizePhone(to),
    body,
    from: from || process.env.TWILIO_PHONE_NUMBER!,
  });
}

// ---------------------------------------------------------------------------
// Webhook validation
// ---------------------------------------------------------------------------

export function validateTwilioWebhook(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  );
}
