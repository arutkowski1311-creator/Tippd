/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Build realistic route segments from a list of jobs.
 *
 * LOGISTICS RULES:
 * - Truck carries ONE box at a time (roll-off)
 * - Every DROP requires having a box on the truck
 * - Every PICKUP produces a full box that must go to the dump
 * - After dumping, box can be REUSED if same size needed + good condition (A/B)
 * - If no reuse match or bad condition → return to yard for next box
 * - Two drops in a row require a yard trip between them
 * - Pickup → Dump is ALWAYS inserted after every pickup
 *
 * SEGMENT TYPES:
 * yard_depart  — leave yard with a box (for drops) or empty (for pickups)
 * drop         — deliver box to customer
 * pickup       — pick up full box from customer
 * dump         — take full box to transfer station, unload
 * yard_return  — return to yard (to swap box, end of day, etc.)
 * lunch        — 30 min break
 */

import { haversineDistance } from "@/lib/geo";

const YARD = { lat: 40.5683, lng: -74.5384, address: "1 Drake St, Bound Brook, NJ 08805" };
const DEFAULT_DUMP = { lat: 40.5934, lng: -74.6241, name: "Bridgewater Resources", address: "15 Polhemus Lane, Bridgewater, NJ" };

// Time estimates (will be replaced by learned averages)
const DROP_MINUTES = 20;
const PICKUP_MINUTES = 20;
const DUMP_MINUTES = 25;
const LUNCH_MINUTES = 30;
const AVG_SPEED_MPH = 30; // for drive time estimates

export interface RouteJob {
  id: string;
  customer_name: string;
  customer_phone?: string;
  drop_address: string;
  drop_lat: number | null;
  drop_lng: number | null;
  status: string;
  job_type?: string;
  dumpster_id?: string | null;
  dumpster_unit_number?: string | null;
  dumpster_size?: string | null;
  dumpster_condition?: string | null;
}

export interface DumpStation {
  id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteSegment {
  id: string;
  sequence_number: number;
  type: "yard_depart" | "drop" | "pickup" | "dump" | "yard_return" | "lunch";
  label: string;
  job_id?: string;
  customer_name?: string;
  to_address?: string;
  to_lat?: number;
  to_lng?: number;
  box_id?: string;
  box_size?: string;
  box_condition?: string;
  box_reused?: boolean;
  box_action?: string;
  decision?: string;
  decision_reason?: string;
  planned_drive_minutes: number;
  planned_stop_minutes: number;
  planned_total_minutes: number;
  planned_drive_miles: number;
  status: "pending" | "active" | "completed";
  job_type?: string;
}

function getJobType(job: RouteJob): "drop" | "pickup" {
  return ["pickup_requested", "pickup_scheduled", "en_route_pickup", "picked_up"].includes(job.status)
    ? "pickup"
    : "drop";
}

function isJobCompleted(job: RouteJob): boolean {
  // These statuses mean the driver already did their part
  return ["dropped", "picked_up"].includes(job.status);
}

function getDumpsterSize(job: RouteJob): string | null {
  if (job.dumpster_size) return job.dumpster_size;
  const unit = job.dumpster_unit_number || "";
  if (unit.startsWith("M-1")) return "10yd";
  if (unit.startsWith("M-2")) return "20yd";
  if (unit.startsWith("M-3")) return "30yd";
  return null;
}

function estimateDrive(fromLat: number, fromLng: number, toLat: number, toLng: number): { miles: number; minutes: number } {
  // Guard against null/NaN coordinates
  if (!fromLat || !fromLng || !toLat || !toLng || isNaN(fromLat) || isNaN(toLat)) {
    return { miles: 5, minutes: 10 }; // default fallback
  }
  const miles = haversineDistance(fromLat, fromLng, toLat, toLng);
  // Add 30% for road vs straight-line
  const roadMiles = miles * 1.3;
  const minutes = (roadMiles / AVG_SPEED_MPH) * 60;
  return { miles: Math.round(roadMiles * 10) / 10, minutes: Math.round(minutes) };
}

function findNearestDump(lat: number, lng: number, dumps: DumpStation[]): DumpStation {
  // Filter to dumps that have valid coordinates
  const validDumps = dumps.filter(d => d.lat != null && d.lng != null && !isNaN(d.lat) && !isNaN(d.lng));
  if (validDumps.length === 0) return DEFAULT_DUMP;
  let nearest = validDumps[0];
  let nearestDist = haversineDistance(lat, lng, nearest.lat, nearest.lng);
  for (const d of validDumps.slice(1)) {
    const dist = haversineDistance(lat, lng, d.lat, d.lng);
    if (dist < nearestDist) {
      nearest = d;
      nearestDist = dist;
    }
  }
  return nearest;
}

export function buildRouteSegments(
  jobs: RouteJob[],
  dumps: DumpStation[] = [],
  options: { insertLunch?: boolean; lunchAfterStop?: number } = {}
): { segments: RouteSegment[]; totalMiles: number; totalMinutes: number } {
  const segments: RouteSegment[] = [];
  let seq = 0;
  let totalMiles = 0;
  let totalMinutes = 0;

  // Current truck state
  let truckLat = YARD.lat;
  let truckLng = YARD.lng;
  let hasBoxOnTruck = false;
  let boxSizeOnTruck: string | null = null;
  let boxConditionOnTruck: string | null = null;
  let stopCount = 0;
  let lunchInserted = false;
  const lunchAfter = options.lunchAfterStop ?? 4; // default: lunch after 4th stop

  // Separate jobs by type
  const orderedJobs = [...jobs];

  // Start at yard
  segments.push({
    id: "generated-yard-depart-0",
    sequence_number: seq++,
    type: "yard_depart",
    label: "Start at yard",
    to_address: YARD.address,
    to_lat: YARD.lat,
    to_lng: YARD.lng,
    planned_drive_minutes: 0,
    planned_stop_minutes: 0,
    planned_total_minutes: 0,
    planned_drive_miles: 0,
    status: "pending",
  });

  for (let i = 0; i < orderedJobs.length; i++) {
    const job = orderedJobs[i];
    const jobType = getJobType(job);
    const completed = isJobCompleted(job);
    const jobLat = job.drop_lat || YARD.lat;
    const jobLng = job.drop_lng || YARD.lng;
    const boxSize = getDumpsterSize(job);

    // ── INSERT LUNCH if needed ──
    if (!lunchInserted && stopCount >= lunchAfter) {
      segments.push({
        id: `generated-lunch-${seq}`,
        sequence_number: seq++,
        type: "lunch",
        label: "Lunch Break",
        planned_drive_minutes: 0,
        planned_stop_minutes: LUNCH_MINUTES,
        planned_total_minutes: LUNCH_MINUTES,
        planned_drive_miles: 0,
        status: "pending",
      });
      totalMinutes += LUNCH_MINUTES;
      lunchInserted = true;
    }

    if (jobType === "drop") {
      // ── DROP: Need a box on the truck ──

      if (!hasBoxOnTruck) {
        // Must go to yard to get a box (unless we're already at yard)
        const distToYard = haversineDistance(truckLat, truckLng, YARD.lat, YARD.lng);
        if (distToYard > 0.5) {
          // Not at yard — drive back
          const drive = estimateDrive(truckLat, truckLng, YARD.lat, YARD.lng);
          segments.push({
            id: `generated-yard-return-${seq}`,
            sequence_number: seq++,
            type: "yard_return",
            label: "Return to yard — get box",
            to_address: YARD.address,
            to_lat: YARD.lat,
            to_lng: YARD.lng,
            decision: "need_box",
            decision_reason: `Need ${boxSize || "a"} box for next drop`,
            planned_drive_minutes: drive.minutes,
            planned_stop_minutes: 10, // load box
            planned_total_minutes: drive.minutes + 10,
            planned_drive_miles: drive.miles,
            status: completed ? "completed" : "pending",
          });
          totalMiles += drive.miles;
          totalMinutes += drive.minutes + 10;
          truckLat = YARD.lat;
          truckLng = YARD.lng;

          // Depart yard with box
          segments.push({
            id: `generated-yard-depart-${seq}`,
            sequence_number: seq++,
            type: "yard_depart",
            label: `Leave yard with ${boxSize || "box"}`,
            to_address: YARD.address,
            to_lat: YARD.lat,
            to_lng: YARD.lng,
            box_size: boxSize || undefined,
            planned_drive_minutes: 0,
            planned_stop_minutes: 0,
            planned_total_minutes: 0,
            planned_drive_miles: 0,
            status: completed ? "completed" : "pending",
          });
        }
        hasBoxOnTruck = true;
        boxSizeOnTruck = boxSize;
      }

      // Drive to customer for drop
      const drive = estimateDrive(truckLat, truckLng, jobLat, jobLng);
      segments.push({
        id: job.id,
        job_id: job.id,
        sequence_number: seq++,
        type: "drop",
        label: job.customer_name,
        customer_name: job.customer_name,
        to_address: job.drop_address,
        to_lat: jobLat,
        to_lng: jobLng,
        box_id: job.dumpster_id || undefined,
        box_size: boxSize || undefined,
        box_condition: job.dumpster_condition || undefined,
        box_reused: boxConditionOnTruck !== null, // true if we reused from a previous pickup
        job_type: job.job_type,
        planned_drive_minutes: drive.minutes,
        planned_stop_minutes: DROP_MINUTES,
        planned_total_minutes: drive.minutes + DROP_MINUTES,
        planned_drive_miles: drive.miles,
        status: completed ? "completed" : "pending",
      });
      totalMiles += drive.miles;
      totalMinutes += drive.minutes + DROP_MINUTES;
      truckLat = jobLat;
      truckLng = jobLng;

      // After drop: truck is EMPTY
      hasBoxOnTruck = false;
      boxSizeOnTruck = null;
      boxConditionOnTruck = null;
      stopCount++;

    } else {
      // ── PICKUP: Truck arrives empty, leaves with full box ──

      const drive = estimateDrive(truckLat, truckLng, jobLat, jobLng);
      segments.push({
        id: job.id,
        job_id: job.id,
        sequence_number: seq++,
        type: "pickup",
        label: job.customer_name,
        customer_name: job.customer_name,
        to_address: job.drop_address,
        to_lat: jobLat,
        to_lng: jobLng,
        box_id: job.dumpster_id || undefined,
        box_size: boxSize || undefined,
        box_condition: job.dumpster_condition || undefined,
        job_type: job.job_type,
        planned_drive_minutes: drive.minutes,
        planned_stop_minutes: PICKUP_MINUTES,
        planned_total_minutes: drive.minutes + PICKUP_MINUTES,
        planned_drive_miles: drive.miles,
        status: completed ? "completed" : "pending",
      });
      totalMiles += drive.miles;
      totalMinutes += drive.minutes + PICKUP_MINUTES;
      truckLat = jobLat;
      truckLng = jobLng;
      stopCount++;

      // After pickup: truck has FULL box → must go to dump
      const nearestDump = findNearestDump(truckLat, truckLng, dumps);
      const dumpDrive = estimateDrive(truckLat, truckLng, nearestDump.lat, nearestDump.lng);

      segments.push({
        id: `generated-dump-${job.id}`,
        sequence_number: seq++,
        type: "dump",
        label: nearestDump.name,
        job_id: job.id,
        to_address: nearestDump.address,
        to_lat: nearestDump.lat,
        to_lng: nearestDump.lng,
        box_size: boxSize || undefined,
        planned_drive_minutes: dumpDrive.minutes,
        planned_stop_minutes: DUMP_MINUTES,
        planned_total_minutes: dumpDrive.minutes + DUMP_MINUTES,
        planned_drive_miles: dumpDrive.miles,
        status: "pending",
      });
      totalMiles += dumpDrive.miles;
      totalMinutes += dumpDrive.minutes + DUMP_MINUTES;
      truckLat = nearestDump.lat;
      truckLng = nearestDump.lng;

      // After dump: check if we can reuse this box for the next job
      const nextJob = orderedJobs[i + 1];
      if (nextJob) {
        const nextType = getJobType(nextJob);
        const nextSize = getDumpsterSize(nextJob);
        const condition = job.dumpster_condition || "B";
        const conditionOk = condition === "A" || condition === "B";

        if (nextType === "drop" && nextSize === boxSize && conditionOk) {
          // REUSE! Skip yard trip — box goes straight to next drop
          hasBoxOnTruck = true;
          boxSizeOnTruck = boxSize;
          boxConditionOnTruck = condition;

          // Add decision note to the dump segment
          const dumpSeg = segments[segments.length - 1];
          dumpSeg.decision = "reuse";
          dumpSeg.decision_reason = `Reusing ${boxSize} box (Grade ${condition}) for next drop → ${nextJob.customer_name}`;
          dumpSeg.box_reused = true;
        } else if (nextType === "pickup") {
          // Next is a pickup — truck needs to be empty, which it is after dumping
          hasBoxOnTruck = false;
          boxSizeOnTruck = null;
          boxConditionOnTruck = null;
        } else {
          // Can't reuse — need to return to yard
          hasBoxOnTruck = false;
          boxSizeOnTruck = null;
          boxConditionOnTruck = null;
        }
      } else {
        // No next job — truck is empty
        hasBoxOnTruck = false;
      }
    }
  }

  // End of day: return to yard (from wherever we are)
  const distToYard = haversineDistance(truckLat, truckLng, YARD.lat, YARD.lng);
  if (distToYard > 0.3) {
    const drive = estimateDrive(truckLat, truckLng, YARD.lat, YARD.lng);
    segments.push({
      id: `generated-yard-return-end`,
      sequence_number: seq++,
      type: "yard_return",
      label: "Return to yard — end of day",
      to_address: YARD.address,
      to_lat: YARD.lat,
      to_lng: YARD.lng,
      planned_drive_minutes: drive.minutes,
      planned_stop_minutes: 0,
      planned_total_minutes: drive.minutes,
      planned_drive_miles: drive.miles,
      status: "pending",
    });
    totalMiles += drive.miles;
    totalMinutes += drive.minutes;
  }

  // Mark first actionable segment as active, yard_depart as completed
  let foundFirst = false;
  for (const seg of segments) {
    if (seg.type === "yard_depart" && seg.sequence_number === 0) {
      seg.status = "completed";
    } else if (!foundFirst && seg.status === "pending" && ["drop", "pickup", "dump"].includes(seg.type)) {
      seg.status = "active";
      foundFirst = true;
    }
  }

  return {
    segments,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalMinutes: Math.round(totalMinutes),
  };
}
