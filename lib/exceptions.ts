/**
 * Exception Handling System — Blueprint Section 08
 *
 * Exceptions are operational events that disrupt the day. Every exception has
 * a severity, a resolution owner, a time sensitivity, and a cascade scope.
 * The system responds intelligently — never just logs and moves on.
 *
 * Key rule: DRIVER NEVER WAITS. On any exception requiring owner/customer
 * resolution, the driver immediately moves to the next stop.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { sendSMS } from "./twilio";
import {
  EXCEPTION_DEFAULTS,
  type ExceptionType,
  type ExceptionStatus,
} from "@/types/exception";

// ─── Create Exception ───

interface CreateExceptionParams {
  operatorId: string;
  jobId?: string;
  stopId?: string;
  driverId: string;
  truckId?: string;
  type: ExceptionType;
  driverNotes?: string;
  photoUrls?: string[];
  materialType?: string;
}

export async function createException(
  supabase: SupabaseClient,
  params: CreateExceptionParams
) {
  const defaults = EXCEPTION_DEFAULTS[params.type];

  const { data: exception, error } = await supabase
    .from("exceptions")
    .insert({
      operator_id: params.operatorId,
      job_id: params.jobId || null,
      stop_id: params.stopId || null,
      driver_id: params.driverId,
      truck_id: params.truckId || null,
      type: params.type,
      severity: defaults.severity,
      resolution_owner: defaults.resolution_owner,
      time_sensitivity: defaults.time_sensitivity,
      cascade_scope: defaults.cascade_scope,
      status: "open",
      driver_notes: params.driverNotes || null,
      photo_urls: params.photoUrls || [],
      material_type: params.materialType || null,
    } as any)
    .select()
    .single();

  if (error) throw error;

  // Fire automatic responses based on exception type
  await handleExceptionAutoResponse(supabase, exception, params);

  return exception;
}

// ─── Auto-Response Logic (per exception type) ───

async function handleExceptionAutoResponse(
  supabase: SupabaseClient,
  exception: any,
  params: CreateExceptionParams
) {
  // Fetch operator settings for auto-notify preference
  const { data: operator } = await supabase
    .from("operators")
    .select("exception_auto_notify_customer, phone, name")
    .eq("id", params.operatorId)
    .single();

  // Fetch job + customer info if we have a job_id
  let job: any = null;
  let customer: any = null;
  if (params.jobId) {
    const { data } = await supabase
      .from("jobs")
      .select("*, customers!inner(name, phone, email)")
      .eq("id", params.jobId)
      .single();
    job = data;
    customer = data?.customers;
  }

  // Fetch owner(s) for notifications
  const { data: owners } = await supabase
    .from("users")
    .select("id, name, phone")
    .eq("operator_id", params.operatorId)
    .in("role", ["owner", "manager"])
    .eq("is_active", true);

  const ownerPhones = (owners || []).filter((o: any) => o.phone).map((o: any) => o.phone);

  // Notify owner for medium+ severity
  if (exception.severity !== "low" && ownerPhones.length > 0) {
    const driverName = await getDriverName(supabase, params.driverId);
    const typeLabel = exception.type.replace(/_/g, " ");
    const msg = `⚠️ Exception: ${typeLabel} reported by ${driverName}${
      customer ? ` at ${customer.name}'s job` : ""
    }. ${params.driverNotes || "No notes."}`;

    for (const phone of ownerPhones) {
      try {
        await sendSMS({ to: phone, body: msg });
      } catch {
        // SMS failure shouldn't block exception creation
      }
    }

    await supabase
      .from("exceptions")
      .update({ owner_notified: true } as any)
      .eq("id", exception.id);
  }

  // Auto-notify customer if enabled and we have customer info
  if (operator?.exception_auto_notify_customer && customer?.phone) {
    const customerMsg = getCustomerNotificationMessage(
      exception.type,
      operator.name || "Your service provider",
      params.materialType
    );

    if (customerMsg) {
      try {
        await sendSMS({ to: customer.phone, body: customerMsg });
        await supabase
          .from("exceptions")
          .update({ customer_notified: true } as any)
          .eq("id", exception.id);
      } catch {
        // SMS failure shouldn't block
      }
    }
  }

  // Type-specific auto-actions
  switch (exception.type) {
    case "customer_change_request":
      // Auto-reschedule handled by dispatch system (Phase 3)
      break;

    case "truck_breakdown":
      // Mark the current stop as blocked
      if (params.stopId) {
        await supabase
          .from("route_segments")
          .update({ status: "skipped" } as any)
          .eq("id", params.stopId);
      }
      break;

    case "prohibited_material":
      // Job gets rescheduled — customer must remove material first
      if (params.jobId) {
        await supabase
          .from("jobs")
          .update({ driver_notes: `Prohibited material: ${params.materialType || "unknown"}. Pickup rescheduled.` } as any)
          .eq("id", params.jobId);
      }
      break;

    case "customer_not_present":
      // Driver moves on. System sends SMS. Will retry at end of route.
      break;
  }
}

// ─── Resolve Exception ───

export async function resolveException(
  supabase: SupabaseClient,
  exceptionId: string,
  resolvedBy: string,
  resolutionNotes: string
) {
  const { data, error } = await supabase
    .from("exceptions")
    .update({
      status: "resolved" as ExceptionStatus,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes,
    } as any)
    .eq("id", exceptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Escalate Exception ───

export async function escalateException(
  supabase: SupabaseClient,
  exceptionId: string
) {
  const { data, error } = await supabase
    .from("exceptions")
    .update({ status: "escalated" as ExceptionStatus } as any)
    .eq("id", exceptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Customer Notification Messages ───

function getCustomerNotificationMessage(
  type: ExceptionType,
  operatorName: string,
  materialType?: string | null
): string | null {
  switch (type) {
    case "box_inaccessible":
      return `${operatorName}: We attempted pickup but couldn't access your dumpster. Reply 1 for a callback, 2 to reschedule, or 3 to text us now.`;

    case "overloaded_container":
      return `${operatorName}: Our driver found your container is overloaded. We'll be in touch shortly to discuss next steps.`;

    case "prohibited_material":
      return `${operatorName}: Prohibited material found in your dumpster${
        materialType ? ` (${materialType})` : ""
      }. This must be removed before pickup can proceed. We've rescheduled your pickup automatically.`;

    case "customer_not_present":
      return `${operatorName}: Our driver arrived but couldn't complete the job — no one was available on site. We'll try again at the end of today's route. Reply 3 to text us.`;

    default:
      return null; // No customer notification for truck/route/access exceptions
  }
}

// ─── Helpers ───

async function getDriverName(
  supabase: SupabaseClient,
  driverId: string
): Promise<string> {
  const { data } = await supabase
    .from("users")
    .select("name")
    .eq("id", driverId)
    .single();
  return data?.name || "Driver";
}
