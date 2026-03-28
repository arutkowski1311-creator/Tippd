/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/admin";
import { error } from "@/lib/api-helpers";
import { sendSMS, normalizePhone } from "@/lib/twilio";
import {
  handleConversation,
  buildThreadFromComms,
  getNextAvailableDates,
  type CustomerContext,
} from "@/lib/conversation-engine";
import { DUMPSTER_SIZE_INFO, OVERAGE_PER_TON } from "@/lib/constants";

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function twiml(): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

async function findCustomer(
  admin: ReturnType<typeof createAdminClient>,
  operatorId: string,
  phone: string
) {
  const normalized = normalizePhone(phone);
  const digits10 = normalized.replace(/^\+1/, "");

  const { data: exact } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("operator_id", operatorId)
    .eq("phone", normalized)
    .single();
  if (exact) return exact;

  const { data: tenDigit } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("operator_id", operatorId)
    .eq("phone", digits10)
    .single();
  if (tenDigit) return tenDigit;

  const formatted = `(${digits10.slice(0, 3)}) ${digits10.slice(3, 6)}-${digits10.slice(6)}`;
  const { data: fmtMatch } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("operator_id", operatorId)
    .eq("phone", formatted)
    .single();

  return fmtMatch || null;
}

// ---------------------------------------------------------------------------
// Build rich customer context for the AI
// ---------------------------------------------------------------------------

async function buildCustomerContext(
  admin: ReturnType<typeof createAdminClient>,
  operatorId: string,
  customer: any | null,
  phone: string
): Promise<CustomerContext> {
  if (!customer) {
    return {
      name: null,
      phone,
      customerId: null,
      activeJobs: [],
      recentInvoices: [],
      lifetimeJobs: 0,
      lifetimeRevenue: 0,
    };
  }

  // Get active jobs
  const { data: jobs } = await admin
    .from("jobs")
    .select("id, status, drop_address, dumpster_unit_number, base_rate, requested_drop_start, requested_pickup_start, actual_drop_time, days_on_site")
    .eq("customer_id", customer.id)
    .not("status", "in", '("paid","cancelled")')
    .order("created_at", { ascending: false })
    .limit(5);

  // Get dumpster sizes for active jobs
  const activeJobs = (jobs || []).map((j: any) => {
    const unitNum = j.dumpster_unit_number || "";
    let size = null;
    if (unitNum.startsWith("M-1")) size = "10yd";
    else if (unitNum.startsWith("M-2")) size = "20yd";
    else if (unitNum.startsWith("M-3")) size = "30yd";

    return {
      id: j.id,
      status: j.status,
      address: j.drop_address,
      dumpsterSize: size,
      dumpsterUnit: j.dumpster_unit_number,
      dropDate: j.actual_drop_time || j.requested_drop_start,
      pickupDate: j.requested_pickup_start,
      daysOnSite: j.days_on_site,
      baseRate: j.base_rate || 0,
    };
  });

  // Get recent invoices
  const { data: invoices } = await admin
    .from("invoices")
    .select("id, invoice_number, total_amount, amount_paid, status, due_date")
    .eq("customer_id", customer.id)
    .in("status", ["sent", "overdue", "partial"])
    .order("created_at", { ascending: false })
    .limit(5);

  const recentInvoices = (invoices || []).map((inv: any) => {
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    const daysPastDue = dueDate ? Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000)) : 0;
    return {
      id: inv.id,
      number: inv.invoice_number || "?",
      amount: inv.total_amount - (inv.amount_paid || 0),
      status: inv.status,
      dueDate: inv.due_date,
      daysPastDue,
    };
  });

  // Lifetime stats
  const { count: lifetimeJobs } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id);

  const { data: revenueData } = await admin
    .from("jobs")
    .select("base_rate")
    .eq("customer_id", customer.id)
    .eq("status", "paid");

  const lifetimeRevenue = (revenueData || []).reduce((sum: number, j: any) => sum + (j.base_rate || 0), 0);

  return {
    name: customer.name,
    phone,
    customerId: customer.id,
    activeJobs,
    recentInvoices,
    lifetimeJobs: lifetimeJobs || 0,
    lifetimeRevenue,
  };
}

// ---------------------------------------------------------------------------
// Main POST handler — Twilio webhook
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string || "").trim();
  const sid = formData.get("MessageSid") as string;
  const to = formData.get("To") as string;

  if (!from || !body) return error("Missing From or Body", 400);

  // Handle STOP/opt-out (Twilio handles at carrier level, just log)
  if (body.toUpperCase() === "STOP") {
    return twiml();
  }

  const admin = createAdminClient();

  // 1. Find operator by Twilio number
  const { data: operator } = await admin
    .from("operators")
    .select("id, name, owner_id")
    .eq("twilio_number", to)
    .single();

  if (!operator) return error("Operator not found", 404);
  const operatorId = operator.id as string;

  // 2. Find customer
  const customer = await findCustomer(admin, operatorId, from);
  const customerId = customer?.id as string | null;

  // 3. Build rich customer context
  const customerCtx = await buildCustomerContext(admin, operatorId, customer, from);

  // 4. Get conversation thread (last 20 messages with this phone)
  const normalized = normalizePhone(from);
  const { data: threadComms } = await admin
    .from("communications")
    .select("direction, raw_content, message, created_at")
    .eq("operator_id", operatorId)
    .or(`from_number.eq.${normalized},to_number.eq.${normalized}`)
    .order("created_at", { ascending: true })
    .limit(20);

  const thread = buildThreadFromComms(threadComms || []);

  // 5. Get schedule availability
  const availableDates = getNextAvailableDates(7);

  // 6. Build business rules
  const sizes = Object.entries(DUMPSTER_SIZE_INFO).map(([key, info]) => ({
    size: key,
    price: info.price,
    includedTons: info.includedTons,
  }));

  const businessRules = {
    sizes,
    overagePerTon: OVERAGE_PER_TON,
    dailyOverage: 25,
    standardRentalDays: 7,
    lateFee30: "7%",
    lateFee50: "additional 10%",
    phone: "(908) 725-0456",
  };

  // 7. Run conversation engine
  const result = await handleConversation(
    customerCtx,
    thread,
    body,
    { availableDates, nearCapacityDates: [] },
    businessRules
  );

  // 8. Log inbound message
  await admin.from("communications").insert({
    operator_id: operatorId,
    customer_id: customerId,
    direction: "inbound",
    channel: "sms",
    from_number: normalized,
    to_number: to,
    raw_content: body,
    twilio_sid: sid,
    intent: result.intent,
    intent_confidence: result.confidence,
    auto_responded: true,
    response_content: result.response,
    responded_at: new Date().toISOString(),
  } as any);

  // 9. Send AI response via Twilio
  try {
    const outMsg = await sendSMS({
      to: from,
      body: result.response,
      from: to,
    });

    // Log outbound
    await admin.from("communications").insert({
      operator_id: operatorId,
      customer_id: customerId,
      direction: "outbound",
      channel: "sms",
      from_number: to,
      to_number: normalized,
      raw_content: result.response,
      twilio_sid: outMsg.sid,
    } as any);
  } catch (err) {
    console.error("[inbound-sms] Failed to send response:", err);
  }

  // 10. Handle actions
  if (result.action && result.action.type !== "none") {
    await handleAction(admin, operatorId, customerId, result);
  }

  // 11. Escalate if needed
  if (result.escalate) {
    await admin.from("action_items").insert({
      operator_id: operatorId,
      type: "callback_request",
      priority: result.intent === "complaint" ? "urgent" : "high",
      title: `Customer needs attention: ${customer?.name || from}`,
      description: `${result.escalateReason || "AI escalated this conversation."}\n\nCustomer said: "${body}"\n\nAI responded: "${result.response}"`,
      customer_id: customerId,
      customer_name: customer?.name,
      customer_phone: from,
      status: "open",
    });
  }

  return twiml();
}

// ---------------------------------------------------------------------------
// Action Handler
// ---------------------------------------------------------------------------

async function handleAction(
  admin: ReturnType<typeof createAdminClient>,
  operatorId: string,
  customerId: string | null,
  result: { action: any; intent: string }
) {
  const action = result.action;
  if (!action) return;

  switch (action.type) {
    case "schedule_pickup":
      if (action.jobId) {
        await admin
          .from("jobs")
          .update({ status: "pickup_requested" })
          .eq("id", action.jobId);
      }
      break;

    case "reschedule":
      // Create action item for manual review
      await admin.from("action_items").insert({
        operator_id: operatorId,
        type: "reschedule_request",
        priority: "normal",
        title: `Reschedule request`,
        description: `Customer wants to reschedule. Preferred dates: ${(action.requestedDates || []).join(", ")}`,
        customer_id: customerId,
        job_id: action.jobId || null,
        status: "open",
      });
      break;

    case "new_booking":
      await admin.from("action_items").insert({
        operator_id: operatorId,
        type: "new_booking",
        priority: "normal",
        title: `New booking request via text`,
        description: `Address: ${action.address || "TBD"}\nDate: ${action.date || "TBD"}\nSize: ${action.size || "TBD"}`,
        customer_id: customerId,
        status: "open",
      });
      break;

    case "extend_rental":
      // Note the extension — daily overage will auto-apply
      if (action.jobId) {
        await admin.from("action_items").insert({
          operator_id: operatorId,
          type: "general",
          priority: "low",
          title: `Rental extension acknowledged`,
          description: `Customer acknowledged daily overage rate for extended rental.`,
          customer_id: customerId,
          job_id: action.jobId,
          status: "open",
        });
      }
      break;

    case "callback_request":
      await admin.from("action_items").insert({
        operator_id: operatorId,
        type: "callback_request",
        priority: "high",
        title: `Callback requested`,
        description: action.reason || "Customer requested a callback.",
        customer_id: customerId,
        status: "open",
      });
      break;

    case "payment_plan":
      await admin.from("action_items").insert({
        operator_id: operatorId,
        type: "payment_plan_request",
        priority: "high",
        title: `Payment plan requested`,
        description: `Customer wants to discuss payment arrangement for invoice.`,
        customer_id: customerId,
        status: "open",
      });
      break;
  }
}
