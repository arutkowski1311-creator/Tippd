/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";

/**
 * TIPPD Conversational SMS Engine
 *
 * Uses Claude to have natural, human-sounding conversations with customers.
 * The AI understands context (customer history, job status, schedule) and
 * responds conversationally while gathering information and taking action.
 *
 * Escalates to humans when:
 * - Customer is angry or uses strong language
 * - AI can't resolve the issue
 * - Customer explicitly asks to speak to someone
 * - Request requires overriding business rules (waiving fees, etc.)
 */

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─── Types ───

export interface CustomerContext {
  name: string | null;
  phone: string;
  customerId: string | null;
  activeJobs: Array<{
    id: string;
    status: string;
    address: string;
    dumpsterSize: string | null;
    dumpsterUnit: string | null;
    dropDate: string | null;
    pickupDate: string | null;
    daysOnSite: number | null;
    baseRate: number;
  }>;
  recentInvoices: Array<{
    id: string;
    number: string;
    amount: number;
    status: string;
    dueDate: string | null;
    daysPastDue: number;
  }>;
  lifetimeJobs: number;
  lifetimeRevenue: number;
}

export interface ConversationThread {
  messages: Array<{
    role: "customer" | "metro";
    content: string;
    timestamp: string;
  }>;
}

export interface ConversationResult {
  response: string;
  action: ConversationAction | null;
  escalate: boolean;
  escalateReason: string | null;
  intent: string;
  confidence: number;
}

export type ConversationAction =
  | { type: "schedule_pickup"; jobId: string }
  | { type: "reschedule"; jobId: string; requestedDates: string[] }
  | { type: "new_booking"; address?: string; date?: string; size?: string }
  | { type: "extend_rental"; jobId: string }
  | { type: "confirm_date"; jobId: string; date: string }
  | { type: "payment_plan"; invoiceId: string }
  | { type: "callback_request"; reason: string }
  | { type: "none" };

// ─── System Prompt ───

function buildSystemPrompt(
  customer: CustomerContext,
  schedule: { availableDates: string[]; nearCapacityDates: string[] },
  businessRules: {
    sizes: Array<{ size: string; price: number; includedTons: number }>;
    overagePerTon: number;
    dailyOverage: number;
    standardRentalDays: number;
    lateFee30: string;
    lateFee50: string;
    phone: string;
  }
): string {
  const jobSummary = customer.activeJobs.length > 0
    ? customer.activeJobs.map(j => {
        const days = j.daysOnSite ? `(${j.daysOnSite} days on site)` : "";
        return `- ${j.status.replace(/_/g, " ")} | ${j.dumpsterSize || "?"} at ${j.address} ${days} | $${j.baseRate}`;
      }).join("\n")
    : "No active jobs.";

  const invoiceSummary = customer.recentInvoices.length > 0
    ? customer.recentInvoices.map(i =>
        `- #${i.number}: $${i.amount} (${i.status}${i.daysPastDue > 0 ? `, ${i.daysPastDue} days past due` : ""})`
      ).join("\n")
    : "No outstanding invoices.";

  const availDates = schedule.availableDates.length > 0
    ? schedule.availableDates.join(", ")
    : "No availability in the next 7 days";

  return `You are a customer service representative for Metro Waste, a dumpster rental company in Central New Jersey. You communicate via text message.

PERSONALITY:
- Friendly, professional, brief. You're texting, not writing an essay.
- Sound like a real person, not a robot. Use natural language.
- Keep messages short — 1-3 sentences max per response.
- Use the customer's first name when you know it.
- Never use numbered reply options (no "Reply 1, 2, 3").
- Don't over-explain. Be direct and helpful.
- Match the customer's energy — casual if they're casual, more formal if they're formal.

CUSTOMER INFO:
Name: ${customer.name || "Unknown"}
Phone: ${customer.phone}
Lifetime jobs: ${customer.lifetimeJobs}
Lifetime revenue: $${customer.lifetimeRevenue}
${customer.lifetimeJobs >= 5 ? "⭐ Repeat customer — treat them well." : ""}

ACTIVE JOBS:
${jobSummary}

INVOICES:
${invoiceSummary}

SCHEDULE AVAILABILITY (next 7 days):
Available: ${availDates}
${schedule.nearCapacityDates.length > 0 ? `Near capacity: ${schedule.nearCapacityDates.join(", ")}` : ""}

PRICING:
${businessRules.sizes.map(s => `${s.size}: $${s.price} (includes ${s.includedTons} tons)`).join("\n")}
Overage: $${businessRules.overagePerTon}/ton over included weight
Daily overage after ${businessRules.standardRentalDays} days: $${businessRules.dailyOverage}/day
Late payment: ${businessRules.lateFee30} at 30 days, ${businessRules.lateFee50} at 50 days

BUSINESS PHONE: ${businessRules.phone}

RULES:
1. You CAN: confirm bookings, schedule pickups, answer pricing questions, reschedule within available dates, acknowledge extensions (mention overage rate), provide general info.
2. You CANNOT: waive fees, override pricing, make promises about exact delivery times, handle hazardous materials (direct them to call), resolve complaints alone.
3. ESCALATE to a human when: customer is upset/angry, requests fee waiver, asks to speak to someone, complex scheduling conflict, anything you're unsure about.
4. Always mention our terms page (metrowasteservice.com/terms) when discussing pricing, fees, or rental periods for the first time in a conversation.
5. If someone asks about hazardous materials, tell them to call ${businessRules.phone} directly.
6. When scheduling, suggest specific available dates rather than asking open-ended questions.

RESPOND WITH JSON:
{
  "response": "Your text message response to the customer",
  "action": { "type": "action_type", ...params } or null,
  "escalate": true/false,
  "escalateReason": "reason" or null,
  "intent": "booking|pickup|reschedule|extension|payment|complaint|question|greeting|other",
  "confidence": 0.0-1.0
}

Action types:
- schedule_pickup: { type: "schedule_pickup", jobId: "..." }
- reschedule: { type: "reschedule", jobId: "...", requestedDates: ["..."] }
- new_booking: { type: "new_booking", address: "...", date: "...", size: "..." }
- extend_rental: { type: "extend_rental", jobId: "..." }
- confirm_date: { type: "confirm_date", jobId: "...", date: "..." }
- payment_plan: { type: "payment_plan", invoiceId: "..." }
- callback_request: { type: "callback_request", reason: "..." }
- none: { type: "none" }

Use "none" when the message is just conversational (thanks, ok, etc.) and no action is needed.`;
}

// ─── Main Conversation Function ───

export async function handleConversation(
  customer: CustomerContext,
  thread: ConversationThread,
  incomingMessage: string,
  schedule: { availableDates: string[]; nearCapacityDates: string[] },
  businessRules: {
    sizes: Array<{ size: string; price: number; includedTons: number }>;
    overagePerTon: number;
    dailyOverage: number;
    standardRentalDays: number;
    lateFee30: string;
    lateFee50: string;
    phone: string;
  }
): Promise<ConversationResult> {
  const anthropic = getAnthropic();

  const systemPrompt = buildSystemPrompt(customer, schedule, businessRules);

  // Build conversation history for Claude
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of thread.messages) {
    messages.push({
      role: msg.role === "customer" ? "user" : "assistant",
      content: msg.role === "customer"
        ? msg.content
        : `{"response": ${JSON.stringify(msg.content)}, "action": null, "escalate": false, "escalateReason": null, "intent": "other", "confidence": 1.0}`,
    });
  }

  // Add the new incoming message
  messages.push({
    role: "user",
    content: incomingMessage,
  });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        response: text.slice(0, 300),
        action: null,
        escalate: false,
        escalateReason: null,
        intent: "other",
        confidence: 0.5,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      response: parsed.response || "Thanks for reaching out! Someone from our team will get back to you shortly.",
      action: parsed.action || null,
      escalate: parsed.escalate || false,
      escalateReason: parsed.escalateReason || null,
      intent: parsed.intent || "other",
      confidence: parsed.confidence || 0.8,
    };
  } catch (err) {
    console.error("[conversation-engine] Claude error:", err);
    return {
      response: "Thanks for your message! Someone from our team will follow up shortly.",
      action: { type: "callback_request", reason: "AI conversation failed" },
      escalate: true,
      escalateReason: "AI conversation engine error — needs human review",
      intent: "other",
      confidence: 0,
    };
  }
}

// ─── Build Thread from DB ───

export function buildThreadFromComms(
  comms: Array<{
    direction: string;
    message?: string;
    raw_content?: string;
    created_at: string;
  }>
): ConversationThread {
  return {
    messages: comms
      .filter(c => (c.message || c.raw_content))
      .map(c => ({
        role: (c.direction === "inbound" ? "customer" : "metro") as "customer" | "metro",
        content: (c.message || c.raw_content || "").trim(),
        timestamp: c.created_at,
      })),
  };
}

// ─── Get Available Dates (simplified) ───

export function getNextAvailableDates(daysAhead: number = 7): string[] {
  const dates: string[] = [];
  const now = new Date();

  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    // Skip Sundays
    if (d.getDay() === 0) continue;
    dates.push(d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }

  return dates;
}
