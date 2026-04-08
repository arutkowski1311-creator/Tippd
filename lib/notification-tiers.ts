/**
 * Tippd Notification Tier System
 *
 * The core rule: notify on CONSEQUENCES, not events.
 * Ask: "Will missing this in the next 15–30 minutes create double work,
 * a missed stop, customer dissatisfaction, billing cleanup, or lost capacity?"
 *
 * Severity levels:
 *   1 — FYI:        No alert. Update feed/history only.
 *   2 — Review:     Bell badge + action center. No interruption.
 *   3 — Act Today:  In-app toast + red badge. Escalates to SMS if unacknowledged.
 *   4 — Act Now:    Push/SMS immediately + persistent banner until acknowledged.
 */

export type NotificationSeverity = 1 | 2 | 3 | 4;
export type NotificationAudience = "owner" | "driver" | "both";
export type NotificationChannel = "feed" | "bell" | "toast" | "banner" | "sms" | "push";

export interface NotificationTier {
  severity: NotificationSeverity;
  audience: NotificationAudience;
  /** Channels used at this severity, in order of escalation */
  channels: NotificationChannel[];
  /** Minutes before severity-3 escalates to SMS if unacknowledged (null = no escalation) */
  escalationMinutes: number | null;
  /** Deduplication window in minutes — bundle related events within this window */
  dedupeWindowMinutes: number;
  /** Human-readable label for admin UI */
  label: string;
  /** Description of why this tier is configured this way */
  reason: string;
}

// ─── Event Type → Tier Mapping ─────────────────────────────────────────────
// Every action_item.type maps to exactly one tier config.
// When in doubt, go one tier LOWER — alert fatigue is the bigger risk.

export const NOTIFICATION_TIERS: Record<string, NotificationTier> = {

  // ── SEVERITY 1: FYI — feed only, no interruption ─────────────────────────

  stop_completed_normal: {
    severity: 1,
    audience: "owner",
    channels: ["feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Stop completed (normal)",
    reason: "Expected workflow. Owner doesn't need to know until end-of-day summary.",
  },
  photo_uploaded: {
    severity: 1,
    audience: "owner",
    channels: ["feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Photo uploaded",
    reason: "Informational. No action required.",
  },
  note_added: {
    severity: 1,
    audience: "owner",
    channels: ["feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Note added to job",
    reason: "No action required, review at convenience.",
  },
  driver_started_stop: {
    severity: 1,
    audience: "owner",
    channels: ["feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Driver started stop",
    reason: "Normal progress. No action needed.",
  },
  route_optimized_minor: {
    severity: 1,
    audience: "driver",
    channels: ["feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 30,
    label: "Route minor reorder",
    reason: "Doesn't change what driver does next. No interruption warranted.",
  },

  // ── SEVERITY 2: Review Soon — bell badge + action center only ─────────────

  low_inventory_warning: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 120,
    label: "Low box inventory warning",
    reason: "Needs attention today but not urgently. Bell badge is enough.",
  },
  stop_running_late_recoverable: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 60,
    label: "Stop running late (still in window)",
    reason: "Still recoverable. Monitor but don't interrupt.",
  },
  box_needs_cleaning: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 240,
    label: "Box flagged for cleaning",
    reason: "Maintenance item. No same-day urgency.",
  },
  document_attached: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Document attached to job",
    reason: "Review at convenience.",
  },
  maintenance: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 60,
    label: "Maintenance reminder",
    reason: "Schedule soon but not urgent.",
  },
  pickup_request: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 30,
    label: "Customer pickup request",
    reason: "Needs scheduling, but customer can wait for a callback.",
  },
  overdue_invoice: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 1440, // 24 hours
    label: "Overdue invoice",
    reason: "Financial item — review today but not time-critical.",
  },

  // ── SEVERITY 3: Act Today — toast + badge, escalates to SMS ──────────────

  stop_failed: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 15,
    dedupeWindowMinutes: 5,
    label: "Stop failed",
    reason: "Customer will not be served today unless rescheduled now.",
  },
  box_damaged: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 20,
    dedupeWindowMinutes: 0,
    label: "Box damaged / flagged",
    reason: "Affects fleet capacity and may impact today's jobs.",
  },
  box_pulled: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 20,
    dedupeWindowMinutes: 0,
    label: "Box pulled from service",
    reason: "Immediate fleet capacity impact.",
  },
  weight_discrepancy: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 30,
    dedupeWindowMinutes: 10,
    label: "Weight / disposal discrepancy",
    reason: "Will cause billing or compliance rework if not caught today.",
  },
  driver_flag: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 15,
    dedupeWindowMinutes: 5,
    label: "Driver flagged an issue",
    reason: "Driver identified something that may require dispatch action.",
  },
  callback: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 20,
    dedupeWindowMinutes: 0,
    label: "Customer callback request",
    reason: "Customer is waiting. Delayed response hurts retention.",
  },
  complaint: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 15,
    dedupeWindowMinutes: 0,
    label: "Customer complaint",
    reason: "High churn risk if unacknowledged.",
  },
  route_conflict: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 10,
    dedupeWindowMinutes: 5,
    label: "Route conflict after edit",
    reason: "Route change created a scheduling or capacity problem.",
  },
  overtime_warning: {
    severity: 3,
    audience: "owner",
    channels: ["toast", "bell", "feed"],
    escalationMinutes: 15,
    dedupeWindowMinutes: 30,
    label: "Driver approaching overtime",
    reason: "Labor cost and compliance issue if not managed.",
  },

  // ── SEVERITY 4: Act Now — push/SMS + persistent banner immediately ────────

  driver_stranded: {
    severity: 4,
    audience: "owner",
    channels: ["sms", "push", "toast", "bell", "feed"],
    escalationMinutes: null, // already max severity
    dedupeWindowMinutes: 0,
    label: "Driver stranded / truck problem",
    reason: "Active route cannot be completed. Immediate dispatch action required.",
  },
  truck_alert: {
    severity: 4,
    audience: "owner",
    channels: ["sms", "push", "toast", "bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Truck breakdown / safety issue",
    reason: "Safety and capacity critical.",
  },
  stop_skipped_no_disposition: {
    severity: 4,
    audience: "owner",
    channels: ["sms", "push", "toast", "bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Stop skipped without explanation",
    reason: "Customer will be missed with no knowledge. Highest service risk.",
  },
  route_cannot_complete: {
    severity: 4,
    audience: "owner",
    channels: ["sms", "push", "toast", "bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Route cannot be completed today",
    reason: "Business impact is immediate and certain.",
  },
  compliance_critical: {
    severity: 4,
    audience: "owner",
    channels: ["sms", "push", "toast", "bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Compliance / regulatory event",
    reason: "Legal or regulatory exposure — always severity 4.",
  },

  // ── DRIVER TIERS ──────────────────────────────────────────────────────────

  route_stop_added: {
    severity: 4,
    audience: "driver",
    channels: ["banner", "push"],
    escalationMinutes: null,
    dedupeWindowMinutes: 2,
    label: "Stop added to route",
    reason: "Changes what driver does next. Must be acknowledged.",
  },
  route_stop_removed: {
    severity: 4,
    audience: "driver",
    channels: ["banner", "push"],
    escalationMinutes: null,
    dedupeWindowMinutes: 2,
    label: "Stop removed from route",
    reason: "Driver may be en route to a stop that no longer exists.",
  },
  route_resequenced: {
    severity: 3,
    audience: "driver",
    channels: ["banner"],
    escalationMinutes: null,
    dedupeWindowMinutes: 5,
    label: "Route resequenced",
    reason: "Changes next stop. Banner required but not push-worthy alone.",
  },
  service_instructions_changed: {
    severity: 4,
    audience: "driver",
    channels: ["banner", "push"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Service instructions changed",
    reason: "Driver may do the wrong thing at site without this.",
  },
  disposal_destination_changed: {
    severity: 4,
    audience: "driver",
    channels: ["banner", "push"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Disposal destination changed",
    reason: "Driver will go to wrong facility if not notified.",
  },
  priority_job_inserted: {
    severity: 4,
    audience: "driver",
    channels: ["banner", "push"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Priority job inserted",
    reason: "Urgent customer need — driver must know immediately.",
  },
  call_before_arrival: {
    severity: 4,
    audience: "driver",
    channels: ["banner", "push"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Must call customer before arrival",
    reason: "Driver will arrive at unannounced/inaccessible site without this.",
  },
  site_safety_note: {
    severity: 4,
    audience: "driver",
    channels: ["banner", "push"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Unsafe / blocked site note added",
    reason: "Safety-critical. Always severity 4.",
  },
  owner_note_urgent: {
    severity: 3,
    audience: "driver",
    channels: ["banner"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "Urgent owner note",
    reason: "Tagged for driver to read before next stop.",
  },
  owner_note_general: {
    severity: 1,
    audience: "driver",
    channels: ["feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 0,
    label: "General owner note",
    reason: "No operational impact. No interruption.",
  },

  // ── DEFAULT fallback ──────────────────────────────────────────────────────
  general: {
    severity: 2,
    audience: "owner",
    channels: ["bell", "feed"],
    escalationMinutes: null,
    dedupeWindowMinutes: 30,
    label: "General notification",
    reason: "Unknown type — default to review-soon tier.",
  },
};

// ─── Helper functions ────────────────────────────────────────────────────────

/** Get tier config for an action type, falling back to 'general' */
export function getTier(actionType: string): NotificationTier {
  return NOTIFICATION_TIERS[actionType] ?? NOTIFICATION_TIERS.general;
}

/** Map priority string (from action_items table) to severity number */
export function priorityToSeverity(priority: string): NotificationSeverity {
  switch (priority) {
    case "urgent": return 4;
    case "high":   return 3;
    case "normal": return 2;
    case "low":    return 1;
    default:       return 2;
  }
}

/** Map severity to action_items priority string */
export function severityToPriority(severity: NotificationSeverity): string {
  switch (severity) {
    case 4: return "urgent";
    case 3: return "high";
    case 2: return "normal";
    case 1: return "low";
  }
}

/** Should this tier trigger an interruptive in-app toast? */
export function shouldToast(tier: NotificationTier): boolean {
  return tier.severity >= 3 && tier.channels.includes("toast");
}

/** Should this tier trigger immediate SMS? */
export function shouldSMSImmediately(tier: NotificationTier): boolean {
  return tier.severity === 4 && tier.channels.includes("sms");
}

/** Should this tier trigger the driver banner? */
export function shouldShowDriverBanner(tier: NotificationTier): boolean {
  return tier.audience !== "owner" && tier.channels.includes("banner");
}

/**
 * Build a dedupe key for bundling related notifications.
 * Events with the same type within their dedupeWindow get collapsed.
 */
export function buildDedupeKey(actionType: string, windowMinutes: number): string {
  if (windowMinutes === 0) return `${actionType}-${Date.now()}`;
  const windowMs = windowMinutes * 60 * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  return `${actionType}-${bucket}`;
}

/**
 * Given a list of action items of the same type, build a bundled message.
 * Used when dedupeWindow > 0 and multiple events arrive together.
 */
export function bundleMessage(type: string, count: number, firstTitle: string): string {
  if (count === 1) return firstTitle;
  const tier = getTier(type);
  return `${count} new ${tier.label.toLowerCase()} alerts`;
}
