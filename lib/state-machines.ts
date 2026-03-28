import type { JobStatus } from "@/types/job";
import type { InvoiceStatus } from "@/types/invoice";
import type { QuoteStatus } from "@/types/quote";
import type { DumpsterStatus } from "@/types/dumpster";

// ─── Job State Machine ───
// Blueprint Section 03: A job can only move forward. Cancellation from any pre-active state.

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending_approval: ["scheduled", "cancelled"],
  scheduled: ["en_route_drop", "cancelled"],
  en_route_drop: ["dropped", "cancelled"],
  dropped: ["active", "pickup_requested", "pickup_scheduled", "cancelled"],
  active: ["pickup_requested", "pickup_scheduled", "cancelled"],
  pickup_requested: ["pickup_scheduled", "cancelled"],
  pickup_scheduled: ["en_route_pickup", "cancelled"],
  en_route_pickup: ["picked_up"],
  picked_up: ["invoiced"],
  invoiced: ["paid", "disputed"],
  paid: [],
  cancelled: [],
  disputed: [],
};

interface JobTransitionContext {
  hasDropPhoto?: boolean;
  hasPickupPhoto?: boolean;
  hasWeight?: boolean;
  hasDumpster?: boolean;
  hasTruck?: boolean;
  hasDriver?: boolean;
}

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidJobTransitions(from: JobStatus): JobStatus[] {
  return JOB_TRANSITIONS[from] ?? [];
}

export function validateJobTransition(
  from: JobStatus,
  to: JobStatus,
  context: JobTransitionContext = {}
): { valid: boolean; reason?: string } {
  if (!canTransitionJob(from, to)) {
    return { valid: false, reason: `Cannot transition from ${from} to ${to}` };
  }

  // scheduled requires dumpster + truck assignment
  if (to === "scheduled") {
    if (!context.hasDumpster) return { valid: false, reason: "Dumpster must be assigned before scheduling" };
    if (!context.hasTruck) return { valid: false, reason: "Truck must be assigned before scheduling" };
    if (!context.hasDriver) return { valid: false, reason: "Driver must be assigned before scheduling" };
  }

  // Photo and weight checks are advisory — don't block the transition
  // The driver app prompts for these but shouldn't prevent completing a stop
  // if conditions don't allow a photo (broken camera, etc.)

  return { valid: true };
}

// ─── Invoice State Machine ───

const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent"],
  sent: ["partial", "paid", "overdue_30", "disputed"],
  partial: ["paid", "overdue_30", "disputed"],
  paid: [],
  overdue_30: ["paid", "partial", "overdue_45", "disputed"],
  overdue_45: ["paid", "partial", "overdue_60", "disputed"],
  overdue_60: ["paid", "partial", "overdue_80", "disputed"],
  overdue_80: ["paid", "partial", "collections", "disputed"],
  collections: ["paid", "partial", "written_off", "disputed"],
  disputed: ["sent", "written_off", "paid"],
  written_off: [],
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidInvoiceTransitions(from: InvoiceStatus): InvoiceStatus[] {
  return INVOICE_TRANSITIONS[from] ?? [];
}

export function validateInvoiceTransition(
  from: InvoiceStatus,
  to: InvoiceStatus
): { valid: boolean; reason?: string } {
  if (!canTransitionInvoice(from, to)) {
    return { valid: false, reason: `Cannot transition invoice from ${from} to ${to}` };
  }
  return { valid: true };
}

// ─── Quote State Machine ───

const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent"],
  sent: ["viewed", "approved", "declined", "expired"],
  viewed: ["approved", "declined", "expired"],
  approved: ["converted"],
  declined: [],
  expired: ["sent"], // can resend an expired quote
  converted: [],
};

export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidQuoteTransitions(from: QuoteStatus): QuoteStatus[] {
  return QUOTE_TRANSITIONS[from] ?? [];
}

export function validateQuoteTransition(
  from: QuoteStatus,
  to: QuoteStatus
): { valid: boolean; reason?: string } {
  if (!canTransitionQuote(from, to)) {
    return { valid: false, reason: `Cannot transition quote from ${from} to ${to}` };
  }
  return { valid: true };
}

// ─── Dumpster State Machine ───

const DUMPSTER_TRANSITIONS: Record<DumpsterStatus, DumpsterStatus[]> = {
  available: ["assigned"],
  assigned: ["deployed", "available"], // available if job cancelled
  deployed: ["returning"],
  returning: ["in_yard"],
  in_yard: ["available", "repair"],
  repair: ["available", "retired"],
  retired: [],
};

export function canTransitionDumpster(from: DumpsterStatus, to: DumpsterStatus): boolean {
  return DUMPSTER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidDumpsterTransitions(from: DumpsterStatus): DumpsterStatus[] {
  return DUMPSTER_TRANSITIONS[from] ?? [];
}

export function validateDumpsterTransition(
  from: DumpsterStatus,
  to: DumpsterStatus
): { valid: boolean; reason?: string } {
  if (!canTransitionDumpster(from, to)) {
    return { valid: false, reason: `Cannot transition dumpster from ${from} to ${to}` };
  }
  return { valid: true };
}
