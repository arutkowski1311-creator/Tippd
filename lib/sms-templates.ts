/**
 * TIPPD SMS Templates — Conversational Style
 *
 * Messaging philosophy:
 * - Sound like a real person, not a robot
 * - No numbered reply options — customers reply naturally
 * - Keep it brief. This is texting, not email.
 * - AI handles all inbound responses conversationally
 * - Only escalate to humans when necessary
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TemplateType =
  | "booking_confirmation"
  | "evening_before_delivery"
  | "delivery_complete"
  | "pickup_approaching"
  | "pickup_confirmed"
  | "evening_before_pickup"
  | "pickup_complete"
  | "invoice_sent"
  | "payment_reminder_30"
  | "payment_reminder_45"
  | "payment_overdue_60"
  | "payment_overdue_80"
  | "payment_thank_you"
  | "booking_request_start"
  | "pickup_request_ack"
  | "reschedule_by_company"
  | "severe_weather"
  | "special_offer"
  | "extension_ack";

export const SMS_TEMPLATES: Record<TemplateType, (...args: any[]) => string> = {

  // ── BOOKING FLOW ──

  booking_confirmation: (p: { date: string; customerName?: string }) =>
    p.customerName
      ? `Hey ${p.customerName.split(" ")[0]}, your dumpster is confirmed for ${p.date}. We'll send you a heads up the evening before. Any questions, just text back!`
      : `Your dumpster is confirmed for ${p.date}. We'll send you a heads up the evening before. Any questions, just text back!`,

  evening_before_delivery: (p: { customerName?: string }) =>
    p.customerName
      ? `Hey ${p.customerName.split(" ")[0]}, just a heads up — your dumpster delivery is confirmed for tomorrow. Our driver will reach out when he's on the way.`
      : `Just a heads up — your dumpster delivery is confirmed for tomorrow. Our driver will reach out when he's on the way.`,

  delivery_complete: (p: { customerName?: string }) =>
    p.customerName
      ? `${p.customerName.split(" ")[0]}, your dumpster has been delivered! Standard rental is 7 days. When you're done with it, just text us and we'll come get it.`
      : `Your dumpster has been delivered! Standard rental is 7 days. When you're done with it, just text us and we'll come get it.`,

  // ── PICKUP FLOW ──

  pickup_approaching: (p: { customerName?: string; daysOnSite?: number }) =>
    p.customerName
      ? `Hey ${p.customerName.split(" ")[0]}, your dumpster rental is coming up on the end of the 7-day period. Are you ready for us to come grab it, or do you need a few more days?`
      : `Your dumpster rental is coming up on the end of the 7-day period. Are you ready for us to come grab it, or do you need a few more days?`,

  extension_ack: (p: { customerName?: string }) =>
    p.customerName
      ? `No problem, ${p.customerName.split(" ")[0]}. Just a heads up — after the 7-day rental period there's a $25/day overage. Just text us whenever you're ready for pickup!`
      : `No problem. Just a heads up — after the 7-day rental period there's a $25/day overage. Just text us whenever you're ready for pickup!`,

  pickup_confirmed: (p: { date: string; customerName?: string }) =>
    p.customerName
      ? `${p.customerName.split(" ")[0]}, your pickup is scheduled for ${p.date}. We'll confirm the evening before. Please make sure we have clear access to the dumpster.`
      : `Your pickup is scheduled for ${p.date}. We'll confirm the evening before. Please make sure we have clear access to the dumpster.`,

  evening_before_pickup: (p: { customerName?: string }) =>
    p.customerName
      ? `Hey ${p.customerName.split(" ")[0]}, just confirming your dumpster pickup is on for tomorrow. Please make sure there's clear access. Thanks!`
      : `Just confirming your dumpster pickup is on for tomorrow. Please make sure there's clear access. Thanks!`,

  pickup_complete: (p: { customerName?: string }) =>
    p.customerName
      ? `${p.customerName.split(" ")[0]}, your dumpster has been picked up. You'll receive your invoice shortly. Thanks for choosing Metro Waste!`
      : `Your dumpster has been picked up. You'll receive your invoice shortly. Thanks for choosing Metro Waste!`,

  // ── CUSTOMER TEXTS IN ──

  booking_request_start: () =>
    `Thanks for reaching out to Metro Waste! To get you set up, I just need a few things — what's the delivery address, what date works for you, and what size are you thinking? We have 10yd ($550), 20yd ($750), and 30yd ($850).`,

  pickup_request_ack: () =>
    `Got it! We're working on getting a truck out to you. We'll let you know as soon as it's on the schedule.`,

  // ── INVOICING ──

  invoice_sent: (p: { number: string; amount: string; link: string; customerName?: string }) =>
    p.customerName
      ? `Hey ${p.customerName.split(" ")[0]}, your invoice #${p.number} for $${p.amount} is ready. You can pay online here: ${p.link}`
      : `Your invoice #${p.number} for $${p.amount} is ready. You can pay online here: ${p.link}`,

  // ── PAYMENT REMINDERS ──

  payment_reminder_30: (p: { number: string; amount: string; link: string; customerName?: string }) =>
    p.customerName
      ? `Hey ${p.customerName.split(" ")[0]}, friendly reminder that invoice #${p.number} for $${p.amount} is due. Pay here: ${p.link}`
      : `Friendly reminder: invoice #${p.number} for $${p.amount} is due. Pay here: ${p.link}`,

  payment_reminder_45: (p: { number: string; amount: string; link: string }) =>
    `Second notice: Invoice #${p.number} for $${p.amount} is now 15 days past due. Please remit payment to avoid late fees per our service agreement (metrowasteservice.com/terms). Pay here: ${p.link}`,

  payment_overdue_60: (p: { number: string; fee: string; total: string; link: string }) =>
    `Invoice #${p.number} is 30 days past due. A 7% late fee of $${p.fee} has been applied per our terms. Total now due: $${p.total}. Pay here: ${p.link} — or text us if you need to discuss a payment arrangement.`,

  payment_overdue_80: (p: { number: string; total: string; link: string }) =>
    `FINAL NOTICE: Invoice #${p.number} is 50 days past due. An additional 10% fee has been applied. Total: $${p.total}. Please pay immediately: ${p.link} — or text us to discuss.`,

  // ── PAYMENT RECEIVED ──
  // Only ask for review if paid on time AND not rescheduled by company

  payment_thank_you: (p: { amount: string; reviewLink: string; eligible: boolean; customerName?: string }) => {
    const name = p.customerName ? p.customerName.split(" ")[0] : null;
    if (p.eligible) {
      return name
        ? `${name}, payment of $${p.amount} received — thank you! If you had a great experience, we'd really appreciate a review: ${p.reviewLink}`
        : `Payment of $${p.amount} received — thank you for your business!`;
    }
    return name
      ? `${name}, payment of $${p.amount} received. Thank you!`
      : `Payment of $${p.amount} received. Thank you for your business!`;
  },

  // ── SCHEDULE CHANGES ──

  reschedule_by_company: (p: { type: string; oldDate: string; newDate: string; customerName?: string }) =>
    p.customerName
      ? `Hey ${p.customerName.split(" ")[0]}, we had to move your ${p.type} from ${p.oldDate} to ${p.newDate}. We apologize for the inconvenience. If that doesn't work for you, just text us back and we'll figure something out.`
      : `We had to move your ${p.type} from ${p.oldDate} to ${p.newDate}. We apologize for the inconvenience. If that doesn't work, just text us back and we'll figure something out.`,

  severe_weather: (p: { type: string }) =>
    `Metro Waste: Due to severe weather, our operations are limited. Your ${p.type} may be rescheduled. We'll confirm your new date as soon as conditions allow. Stay safe!`,

  // ── SPECIALS ──

  special_offer: (p: { customerName: string; offerText: string; code: string; expiresDate: string }) =>
    `Hey ${p.customerName.split(" ")[0]}! As a valued Metro Waste customer, we wanted to offer you ${p.offerText}. Use code ${p.code} — good through ${p.expiresDate}. Just mention it when you book!`,
};

// ─── Review Eligibility ───

export function isEligibleForReview(job: {
  hadLateFees?: boolean;
  wasRescheduledByCompany?: boolean;
}): boolean {
  if (job.hadLateFees) return false;
  if (job.wasRescheduledByCompany) return false;
  return true;
}

// ─── Coupon Code Generator ───

export function generateCouponCode(prefix: string = "MW"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Reply Actions (kept for backward compat but not used in conversational mode) ───

export const REPLY_ACTIONS: Record<string, Record<string, { action: string; description: string }>> = {};
