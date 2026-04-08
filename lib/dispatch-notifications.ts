/**
 * Dispatch Notification System — Blueprint Section 07
 *
 * Three-layer dispatch:
 *   Layer 1 (Proactive) — Route built night before, windows sent to customers
 *   Layer 2 (Autonomous) — Running early/late, minor shifts, routine ETA updates
 *   Layer 3 (Escalation) — Stop may be bumped, window can't be met, truck down
 *
 * Customer notification flow:
 *   At booking:       Date only (no time window)
 *   Evening before:   4-hour window via SMS
 *   Day of:           Automatic ETA updates, delay notifications
 *   On delay:         Reply 1/2/3 options
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { sendSMS } from "./twilio";

// ─── Layer 1: Evening-Before Window Notifications ───

interface WindowNotificationParams {
  customerName: string;
  customerPhone: string;
  windowStart: string; // e.g. "9am"
  windowEnd: string; // e.g. "1pm"
  jobType: "delivery" | "pickup";
  operatorName: string;
}

export function formatEveningBeforeMessage(p: WindowNotificationParams): string {
  const first = p.customerName.split(" ")[0];
  if (p.jobType === "delivery") {
    return `Hey ${first}, your dumpster delivery is tomorrow. Your driver will arrive between ${p.windowStart} and ${p.windowEnd}. Any questions, just text back — ${p.operatorName}`;
  }
  return `Hey ${first}, your dumpster pickup is tomorrow. Our driver will be there between ${p.windowStart} and ${p.windowEnd}. Please make sure we have clear access. — ${p.operatorName}`;
}

export async function sendEveningBeforeWindows(
  supabase: SupabaseClient,
  routeId: string,
  operatorId: string
) {
  // Fetch route with segments and job/customer data
  const { data: segments } = await supabase
    .from("route_segments")
    .select("*, jobs!inner(id, customer_name, customer_phone, job_type, drop_address)")
    .eq("route_id", routeId)
    .in("type", ["drop", "pickup"])
    .order("sequence_number");

  if (!segments?.length) return [];

  const { data: operator } = await supabase
    .from("operators")
    .select("name, service_time_drop_minutes, service_time_pickup_minutes")
    .eq("id", operatorId)
    .single();

  const results: { jobId: string; sent: boolean; error?: string }[] = [];

  for (const seg of segments) {
    const job = (seg as any).jobs;
    if (!job?.customer_phone) continue;

    // Calculate 4-hour window based on planned timing
    const plannedMinutes = seg.depart_time_offset || 0;
    const windowStart = formatTimeFromMinutes(plannedMinutes);
    const windowEnd = formatTimeFromMinutes(plannedMinutes + 240); // 4 hours

    const jobType = seg.type === "drop" ? "delivery" : "pickup";
    const message = formatEveningBeforeMessage({
      customerName: job.customer_name,
      customerPhone: job.customer_phone,
      windowStart,
      windowEnd,
      jobType,
      operatorName: operator?.name || "Your hauler",
    });

    try {
      await sendSMS({ to: job.customer_phone, body: message });

      // Log the notification
      await supabase.from("communications").insert({
        operator_id: operatorId,
        customer_id: null, // we don't have customer_id on segment
        job_id: job.id,
        direction: "outbound",
        channel: "sms",
        to_number: job.customer_phone,
        raw_content: message,
        intent: "other",
        auto_responded: true,
      } as any);

      results.push({ jobId: job.id, sent: true });
    } catch (err: any) {
      results.push({ jobId: job.id, sent: false, error: err.message });
    }
  }

  return results;
}

// ─── Layer 2: Day-Of ETA Updates ───

type ETAStatus = "running_early" | "on_time" | "running_late_in_window" | "approaching_breach" | "window_missed";

interface ETAUpdateParams {
  customerName: string;
  customerPhone: string;
  newETA: string; // e.g. "10:15am"
  windowEnd: string; // e.g. "1pm"
  operatorName: string;
  status: ETAStatus;
}

export function classifyETAStatus(
  plannedArrivalMinutes: number,
  currentETAMinutes: number,
  windowEndMinutes: number
): ETAStatus {
  const diff = currentETAMinutes - plannedArrivalMinutes;

  if (diff <= -15) return "running_early";
  if (diff <= 15) return "on_time";
  if (currentETAMinutes <= windowEndMinutes) return "running_late_in_window";
  if (currentETAMinutes <= windowEndMinutes + 30) return "approaching_breach";
  return "window_missed";
}

export function formatETAUpdateMessage(p: ETAUpdateParams): string {
  const first = p.customerName.split(" ")[0];

  switch (p.status) {
    case "running_early":
      return `Good news, ${first} — your driver is running ahead of schedule. Updated arrival: ${p.newETA}. — ${p.operatorName}`;

    case "on_time":
      return ""; // No notification needed

    case "running_late_in_window":
      return `Hey ${first}, your driver is running a bit behind. Updated arrival: ${p.newETA}. Still within your window. — ${p.operatorName}`;

    case "approaching_breach":
      return `${first}, your driver is running behind. We expect arrival by ${p.newETA} — just outside your window. We apologize for the delay. — ${p.operatorName}`;

    case "window_missed":
      return `${first}, we're sorry — your driver has been delayed. New ETA: ${p.newETA}. Reply 1 for a callback, 2 to reschedule, or 3 to text with us now. — ${p.operatorName}`;
  }
}

// ─── Layer 3: Customer Reply Handling (1/2/3) ───

export type DelayReplyAction = "callback" | "reschedule" | "text_now" | "no_reply";

export function classifyDelayReply(message: string): DelayReplyAction {
  const trimmed = message.trim();
  if (trimmed === "1") return "callback";
  if (trimmed === "2") return "reschedule";
  if (trimmed === "3") return "text_now";
  return "no_reply"; // any other text passes to conversation engine
}

// ─── Auto-Reschedule Logic ───

interface RescheduleResult {
  found: boolean;
  newDate?: string;
  reason?: string;
}

/**
 * Search 3-4 days forward for the earliest available window.
 * Window selection is geographic — clusters with existing stops on that day.
 */
export async function findAutoRescheduleSlot(
  supabase: SupabaseClient,
  operatorId: string,
  jobId: string,
  extraMilesThreshold?: number
): Promise<RescheduleResult> {
  // Get job details
  const { data: job } = await supabase
    .from("jobs")
    .select("drop_lat, drop_lng, drop_address, truck_id")
    .eq("id", jobId)
    .single();

  if (!job?.drop_lat || !job?.drop_lng) {
    return { found: false, reason: "Job has no geocoded address" };
  }

  // Look at routes for the next 3-4 business days
  const today = new Date();
  const candidates: { date: string; routeId: string; proximity: number }[] = [];

  for (let dayOffset = 1; dayOffset <= 4; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split("T")[0];

    // Find routes on this day with segments near the job's location
    const { data: routes } = await supabase
      .from("routes")
      .select("id, truck_id")
      .eq("operator_id", operatorId)
      .eq("date", dateStr)
      .in("status", ["draft", "locked"]);

    if (!routes?.length) {
      // No route yet — this day is available but would be a new route
      candidates.push({ date: dateStr, routeId: "", proximity: 999 });
      continue;
    }

    // Check existing segments on each route for geographic proximity
    for (const route of routes) {
      const { data: segments } = await supabase
        .from("route_segments")
        .select("to_lat, to_lng")
        .eq("route_id", route.id)
        .not("to_lat", "is", null);

      if (!segments?.length) continue;

      // Simple haversine-like proximity check
      const minDist = segments.reduce((min: number, seg: any) => {
        const d = approxMiles(job.drop_lat, job.drop_lng, seg.to_lat, seg.to_lng);
        return Math.min(min, d);
      }, Infinity);

      candidates.push({ date: dateStr, routeId: route.id, proximity: minDist });
    }
  }

  if (candidates.length === 0) {
    return { found: false, reason: "No available slots in the next 3-4 business days" };
  }

  // Sort by proximity (geographic clustering) then by date
  candidates.sort((a, b) => a.proximity - b.proximity || a.date.localeCompare(b.date));

  const best = candidates[0];

  // Check extra miles threshold if configured
  if (extraMilesThreshold && best.proximity > extraMilesThreshold) {
    return {
      found: false,
      reason: `Best slot adds ${best.proximity.toFixed(1)} miles (threshold: ${extraMilesThreshold}). Requires manual scheduling.`,
    };
  }

  return { found: true, newDate: best.date };
}

// ─── Asset Constraint Checks ───

export interface AssetWarning {
  level: "yellow" | "orange" | "hard_block";
  entity: "truck" | "driver";
  entityId: string;
  entityName: string;
  message: string;
}

/**
 * Check truck and driver constraints before route confirmation.
 * Returns warnings — never blocks (except hard_block for repair-tagged trucks).
 */
export async function checkAssetConstraints(
  supabase: SupabaseClient,
  operatorId: string,
  truckId: string,
  driverId: string | null,
  routeMiles: number
): Promise<AssetWarning[]> {
  const warnings: AssetWarning[] = [];

  // Truck checks
  const { data: truck } = await supabase
    .from("trucks")
    .select("id, name, status, current_mileage")
    .eq("id", truckId)
    .single();

  if (truck) {
    if (truck.status === "repair") {
      warnings.push({
        level: "hard_block",
        entity: "truck",
        entityId: truck.id,
        entityName: truck.name,
        message: `${truck.name} is tagged for repair — not available.`,
      });
    }

    // Check distance from next service
    const { data: nextService } = await supabase
      .from("truck_service_log")
      .select("next_due_miles, service_type")
      .eq("truck_id", truckId)
      .not("next_due_miles", "is", null)
      .order("next_due_miles", { ascending: true })
      .limit(1)
      .single();

    if (nextService?.next_due_miles) {
      const milesUntilService = nextService.next_due_miles - truck.current_mileage;
      const milesAfterRoute = milesUntilService - routeMiles;

      if (milesAfterRoute < 100) {
        warnings.push({
          level: "orange",
          entity: "truck",
          entityId: truck.id,
          entityName: truck.name,
          message: `${truck.name} is ${milesUntilService} miles from ${nextService.service_type} service. This route adds ${routeMiles} miles, bringing it to ${milesAfterRoute} miles from service. Strongly advise servicing first.`,
        });
      } else if (milesAfterRoute < 500) {
        warnings.push({
          level: "yellow",
          entity: "truck",
          entityId: truck.id,
          entityName: truck.name,
          message: `${truck.name} is ${milesUntilService} miles from ${nextService.service_type} service. This route adds ${routeMiles} miles.`,
        });
      }
    }
  }

  // Driver checks
  if (driverId) {
    const { data: driver } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", driverId)
      .single();

    if (driver) {
      // Check today's hours
      const today = new Date().toISOString().split("T")[0];
      const { data: timecard } = await supabase
        .from("driver_timecards")
        .select("regular_hours, overtime_hours")
        .eq("driver_id", driverId)
        .eq("date", today)
        .single();

      if (timecard) {
        const totalHours = (timecard.regular_hours || 0) + (timecard.overtime_hours || 0);
        if (totalHours > 8) {
          warnings.push({
            level: "yellow",
            entity: "driver",
            entityId: driver.id,
            entityName: driver.name,
            message: `${driver.name} has logged ${totalHours.toFixed(1)} hours today. Overtime threshold approaching.`,
          });
        }
      }
    }
  }

  return warnings;
}

// ─── Override Cascade Preview ───

export interface CascadeEffect {
  jobId: string;
  customerName: string;
  effect: "delayed" | "pushed_to_tomorrow" | "window_breached";
  originalWindow?: string;
  newETA?: string;
}

/**
 * Preview the downstream effects of moving a stop in the route.
 * Shows which customers would be affected before the owner confirms.
 */
export async function previewOverrideCascade(
  supabase: SupabaseClient,
  routeId: string,
  movedSegmentId: string,
  newSequenceNumber: number
): Promise<CascadeEffect[]> {
  const { data: segments } = await supabase
    .from("route_segments")
    .select("id, sequence_number, job_id, customer_name, planned_drive_minutes, planned_stop_minutes, depart_time_offset")
    .eq("route_id", routeId)
    .order("sequence_number");

  if (!segments) return [];

  const effects: CascadeEffect[] = [];
  const movedSeg = segments.find((s: any) => s.id === movedSegmentId);
  if (!movedSeg) return [];

  // Calculate time shift for downstream segments
  const timeDelta = (movedSeg.planned_drive_minutes || 0) + (movedSeg.planned_stop_minutes || 0);

  // Get operator workday cap
  const { data: route } = await supabase
    .from("routes")
    .select("operator_id")
    .eq("id", routeId)
    .single();

  const { data: operator } = await supabase
    .from("operators")
    .select("workday_cap_hours")
    .eq("id", route?.operator_id)
    .single();

  const workdayCapMinutes = (operator?.workday_cap_hours || 10) * 60;

  for (const seg of segments) {
    if (seg.sequence_number <= newSequenceNumber) continue;
    if (!seg.job_id || !seg.customer_name) continue;

    const newOffset = (seg.depart_time_offset || 0) + timeDelta;

    if (newOffset > workdayCapMinutes) {
      effects.push({
        jobId: seg.job_id,
        customerName: seg.customer_name,
        effect: "pushed_to_tomorrow",
      });
    } else {
      effects.push({
        jobId: seg.job_id,
        customerName: seg.customer_name,
        effect: "delayed",
        newETA: formatTimeFromMinutes(newOffset),
      });
    }
  }

  return effects;
}

// ─── Helpers ───

function formatTimeFromMinutes(minutes: number): string {
  // Assuming route starts at 7am
  const totalMinutes = 7 * 60 + Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return mins === 0 ? `${displayHour}${period}` : `${displayHour}:${mins.toString().padStart(2, "0")}${period}`;
}

function approxMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Quick approximation using equirectangular projection
  const dLat = (lat2 - lat1) * 69; // ~69 miles per degree latitude
  const dLng = (lng2 - lng1) * 69 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
