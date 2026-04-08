/**
 * TIPPD ROUTING ENGINE
 *
 * Segment-based route builder with 5-bucket scoring.
 * Every route is a sequence of segments: yard → drop/pickup → dump → yard
 * Each segment is scored on: time, miles, cost, inventory impact, service risk.
 *
 * The engine:
 * 1. Takes a list of jobs + yard + dumps + config
 * 2. Builds every possible segment sequence
 * 3. Scores each using the 5-bucket model
 * 4. Picks the lowest composite score sequence
 * 5. Returns the full route with timing, miles, and segment details
 */

import { getTruckRouteMultiStop, getTruckRoute, type RoutePoint } from "./here";
import { haversineDistance, totalRouteMiles, estimateDriveTime, findNearest, type LatLng } from "./geo";

// ─── Types ───

export interface RouteJob {
  id: string;
  type: "drop" | "pickup";
  lat: number;
  lng: number;
  address: string;
  customer_name: string;
  customer_id?: string;
  box_id?: string;
  box_size: string; // 10yd, 20yd, 30yd
  box_condition?: string; // A, B, C, D, F — only for pickups
  job_type?: string; // residential, commercial, construction, etc.
  access_restrictions?: string;
  preferred_time?: string; // morning, afternoon, anytime
  no_early_am?: boolean;
}

export interface DumpStation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  cost_per_ton: number;
  estimated_wait_minutes: number;
}

export interface YardLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface ScoringWeights {
  time: number;
  miles: number;
  cost: number;
  inventory: number;
  service_risk: number;
}

export interface RoutingConfig {
  yard: YardLocation;
  dumps: DumpStation[];
  weights: ScoringWeights;
  operating_mode: string;
  drop_minutes: number;
  pickup_minutes: number;
  dump_minutes: number;
  lunch_minutes: number;
  max_shift_minutes: number;
  fuel_cost_per_mile: number; // ~$0.65 for diesel roll-off
  driver_hourly_wage: number; // ~$25/hr
}

export interface RouteSegment {
  sequence: number;
  type: "yard_depart" | "drop" | "pickup" | "dump" | "yard_return" | "lunch" | "reposition";
  job_id?: string;
  dump_id?: string;
  from: LatLng & { address: string };
  to: LatLng & { address: string };
  drive_miles: number;
  drive_minutes: number;
  stop_minutes: number;
  total_minutes: number;
  depart_time_offset: number; // minutes from route start
  arrive_time_offset: number;
  // Box tracking
  box_id?: string;
  box_size?: string;
  box_condition?: string;
  box_reused: boolean;
  box_action?: string;
  decision?: string;
  decision_reason?: string;
  // Scores
  scores: {
    time: number;
    miles: number;
    cost: number;
    inventory: number;
    service_risk: number;
    composite: number;
  };
  // Display
  label: string;
  customer_name?: string;
}

export interface BuiltRoute {
  segments: RouteSegment[];
  total_miles: number;
  total_minutes: number;
  total_stops: number;
  total_dump_visits: number;
  reuse_count: number;
  lunch_at_segment: number;
  is_over_capacity: boolean;
  overtime_minutes: number;
  composite_score: number;
  // Path for map
  route_path: Array<{ lat: number; lng: number }>;
  // Summary
  drops: number;
  pickups: number;
  summary: string;
}

// ─── Default Config ───

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  time: 0.25,
  miles: 0.25,
  cost: 0.20,
  inventory: 0.15,
  service_risk: 0.15,
};

export const OPERATING_MODE_WEIGHTS: Record<string, ScoringWeights> = {
  balanced: { time: 0.25, miles: 0.25, cost: 0.20, inventory: 0.15, service_risk: 0.15 },
  maximize_jobs: { time: 0.35, miles: 0.15, cost: 0.15, inventory: 0.20, service_risk: 0.15 },
  protect_ontime: { time: 0.20, miles: 0.10, cost: 0.10, inventory: 0.10, service_risk: 0.50 },
  minimize_overtime: { time: 0.40, miles: 0.20, cost: 0.20, inventory: 0.10, service_risk: 0.10 },
  reduce_dump_cost: { time: 0.15, miles: 0.15, cost: 0.40, inventory: 0.15, service_risk: 0.15 },
  clear_aged_boxes: { time: 0.15, miles: 0.15, cost: 0.15, inventory: 0.40, service_risk: 0.15 },
};

// ─── Core Engine ───

/**
 * Build a complete route from a list of jobs.
 *
 * This is the main entry point. It:
 * 1. Sequences jobs (drops first when geographically sensible, pickups clustered)
 * 2. Inserts dump visits after every pickup
 * 3. Decides box reuse vs yard return
 * 4. Inserts lunch break at midpoint
 * 5. Scores every segment
 * 6. Returns the complete route
 */
export async function buildRoute(
  jobs: RouteJob[],
  config: RoutingConfig,
  useHere: boolean = true
): Promise<BuiltRoute> {
  const { yard, dumps, weights } = config;

  if (jobs.length === 0) {
    return emptyRoute();
  }

  // Step 1: Sequence jobs intelligently
  const sequenced = sequenceJobs(jobs, yard, dumps);

  // Step 2: Build segments (expand pickups into pickup → dump → decision)
  const rawSegments = buildSegments(sequenced, yard, dumps, config);

  // Step 3: Insert lunch break at midpoint
  const withLunch = insertLunchBreak(rawSegments, config);

  // Step 4: Calculate drive times (HERE or haversine fallback)
  const timed = await calculateDriveTimes(withLunch, useHere);

  // Step 5: Calculate time offsets (cumulative timeline)
  const timeline = calculateTimeline(timed, config);

  // Step 6: Score every segment
  const scored = scoreSegments(timeline, config);

  // Step 7: Build final route object
  return assembleRoute(scored, config);
}

// ─── Step 1: Job Sequencing ───

function sequenceJobs(
  jobs: RouteJob[],
  yard: YardLocation,
  dumps: DumpStation[]
): RouteJob[] {
  const drops = jobs.filter((j) => j.type === "drop");
  const pickups = jobs.filter((j) => j.type === "pickup");

  // Strategy: interleave drops and pickups geographically
  // Start with drops near the yard, then pickups, maximizing reuse opportunities

  // Sort drops by distance from yard (nearest first)
  const sortedDrops = [...drops].sort((a, b) => {
    const da = haversineDistance(yard.lat, yard.lng, a.lat, a.lng);
    const db = haversineDistance(yard.lat, yard.lng, b.lat, b.lng);
    return da - db;
  });

  // Sort pickups by distance from yard (nearest first)
  const sortedPickups = [...pickups].sort((a, b) => {
    const da = haversineDistance(yard.lat, yard.lng, a.lat, a.lng);
    const db = haversineDistance(yard.lat, yard.lng, b.lat, b.lng);
    return da - db;
  });

  // Interleave: try to pair pickups with drops of matching size
  // For each pickup, find the best drop to serve after dumping
  const result: RouteJob[] = [];
  const usedDrops = new Set<string>();
  const usedPickups = new Set<string>();

  // First, pair pickups with matching drops (reuse opportunities)
  for (const pickup of sortedPickups) {
    const matchingDrop = sortedDrops.find(
      (d) => !usedDrops.has(d.id) && d.box_size === pickup.box_size
    );
    if (matchingDrop && canReuse(pickup.box_condition)) {
      // Pickup → dump → reuse to matching drop
      result.push(pickup);
      result.push(matchingDrop);
      usedPickups.add(pickup.id);
      usedDrops.add(matchingDrop.id);
    }
  }

  // Remaining drops (no reuse pair) — do first
  const remainingDrops = sortedDrops.filter((d) => !usedDrops.has(d.id));
  const remainingPickups = sortedPickups.filter((p) => !usedPickups.has(p.id));

  // Final sequence: remaining drops first, then paired pickup-drops, then remaining pickups
  const finalSequence = [
    ...remainingDrops,
    ...result,
    ...remainingPickups,
  ];

  return finalSequence;
}

function canReuse(condition?: string): boolean {
  if (!condition) return true; // assume good if unknown
  return condition !== "F" && condition !== "D";
}

// ─── Step 2: Build Segments ───

function buildSegments(
  sequencedJobs: RouteJob[],
  yard: YardLocation,
  dumps: DumpStation[],
  config: RoutingConfig
): RouteSegment[] {
  const segments: RouteSegment[] = [];
  let seq = 0;
  let currentLat = yard.lat;
  let currentLng = yard.lng;
  let currentAddress = yard.address;

  // Segment 0: Yard depart
  segments.push(makeSegment({
    sequence: seq++,
    type: "yard_depart",
    from: { lat: yard.lat, lng: yard.lng, address: yard.address },
    to: { lat: yard.lat, lng: yard.lng, address: yard.address },
    stop_minutes: 0,
    label: "Start — Metro Waste Yard",
  }));

  // Track pending drops after pickups (for reuse detection)
  const pendingDropSizes = new Map<string, RouteJob>(); // size → next drop job
  for (let i = 0; i < sequencedJobs.length; i++) {
    const nextJob = sequencedJobs[i + 1];
    if (nextJob?.type === "drop") {
      pendingDropSizes.set(nextJob.box_size, nextJob);
    }
  }

  for (let i = 0; i < sequencedJobs.length; i++) {
    const job = sequencedJobs[i];
    const nextJob = sequencedJobs[i + 1];

    if (job.type === "drop") {
      // DROP: drive to customer, unload box
      segments.push(makeSegment({
        sequence: seq++,
        type: "drop",
        job_id: job.id,
        from: { lat: currentLat, lng: currentLng, address: currentAddress },
        to: { lat: job.lat, lng: job.lng, address: job.address },
        stop_minutes: config.drop_minutes,
        label: `↓ DROP — ${job.customer_name}`,
        customer_name: job.customer_name,
        box_id: job.box_id,
        box_size: job.box_size,
        box_action: "dropped",
        scores: { time: 0, miles: 0, cost: 0, inventory: -1, service_risk: 0, composite: 0 },
      }));

      currentLat = job.lat;
      currentLng = job.lng;
      currentAddress = job.address;

      // After dropping, truck is empty — needs to go get next box
      // If next job is also a drop, we need to go back to yard for a box
      if (nextJob?.type === "drop") {
        segments.push(makeSegment({
          sequence: seq++,
          type: "reposition",
          from: { lat: currentLat, lng: currentLng, address: currentAddress },
          to: { lat: yard.lat, lng: yard.lng, address: yard.address },
          stop_minutes: 5, // quick box swap
          label: "→ Return to yard for next box",
          box_action: "loaded_from_yard",
          decision: "return_for_next_box",
        }));
        currentLat = yard.lat;
        currentLng = yard.lng;
        currentAddress = yard.address;
      }

    } else if (job.type === "pickup") {
      // PICKUP: drive to customer, load full box
      segments.push(makeSegment({
        sequence: seq++,
        type: "pickup",
        job_id: job.id,
        from: { lat: currentLat, lng: currentLng, address: currentAddress },
        to: { lat: job.lat, lng: job.lng, address: job.address },
        stop_minutes: config.pickup_minutes,
        label: `↑ PICKUP — ${job.customer_name}`,
        customer_name: job.customer_name,
        box_id: job.box_id,
        box_size: job.box_size,
        box_condition: job.box_condition,
        box_action: "picked_up",
        scores: { time: 0, miles: 0, cost: 0, inventory: 1, service_risk: 0, composite: 0 },
      }));

      currentLat = job.lat;
      currentLng = job.lng;
      currentAddress = job.address;

      // After pickup: go to dump
      const nearestDump = findSmartDump(
        { lat: currentLat, lng: currentLng },
        nextJob ? { lat: nextJob.lat, lng: nextJob.lng } : { lat: yard.lat, lng: yard.lng },
        dumps
      );

      if (nearestDump) {
        segments.push(makeSegment({
          sequence: seq++,
          type: "dump",
          dump_id: nearestDump.id,
          from: { lat: currentLat, lng: currentLng, address: currentAddress },
          to: { lat: nearestDump.lat, lng: nearestDump.lng, address: nearestDump.address || nearestDump.name },
          stop_minutes: config.dump_minutes,
          label: `🏭 DUMP — ${nearestDump.name}`,
          box_action: "dumped",
        }));

        currentLat = nearestDump.lat;
        currentLng = nearestDump.lng;
        currentAddress = nearestDump.name;
      }

      // After dump: reuse decision
      const condition = job.box_condition || "A";
      const canReuseBox = canReuse(condition);
      const nextIsDrop = nextJob?.type === "drop";
      const sizeMatch = nextIsDrop && nextJob.box_size === job.box_size;

      if (canReuseBox && sizeMatch && nextIsDrop) {
        // Reuse! Drive straight to next drop
        const reuseNote = condition === "C"
          ? `Reuse box (Grade C — ${nextJob.job_type === "residential" ? "needs approval" : "OK for commercial"})`
          : `Reuse box (Grade ${condition})`;

        segments[segments.length - 1].decision = "reuse_to_next_drop";
        segments[segments.length - 1].decision_reason = reuseNote;
        segments[segments.length - 1].box_reused = true;
      } else if (condition === "F") {
        // Grade F: pull from service, return to yard
        segments.push(makeSegment({
          sequence: seq++,
          type: "reposition",
          from: { lat: currentLat, lng: currentLng, address: currentAddress },
          to: { lat: yard.lat, lng: yard.lng, address: yard.address },
          stop_minutes: 5,
          label: "⚠ Return to yard — box pulled from service",
          box_action: "pulled_from_service",
          decision: "grade_f_return",
          decision_reason: "Box graded F — removed from service",
        }));
        currentLat = yard.lat;
        currentLng = yard.lng;
        currentAddress = yard.address;
      } else if (!nextIsDrop || !sizeMatch) {
        // No matching drop — return to yard
        if (nextJob) {
          // More jobs to do, need to go back to yard for correct box
          segments.push(makeSegment({
            sequence: seq++,
            type: "reposition",
            from: { lat: currentLat, lng: currentLng, address: currentAddress },
            to: { lat: yard.lat, lng: yard.lng, address: yard.address },
            stop_minutes: 5,
            label: "→ Return to yard",
            box_action: "returned_to_yard",
            decision: "no_matching_drop",
            decision_reason: nextIsDrop
              ? `Next drop needs ${nextJob.box_size}, picked up ${job.box_size}`
              : "No drop to reuse, returning empty box",
          }));
          currentLat = yard.lat;
          currentLng = yard.lng;
          currentAddress = yard.address;
        }
      }
    }
  }

  // Final segment: return to yard
  if (currentLat !== yard.lat || currentLng !== yard.lng) {
    segments.push(makeSegment({
      sequence: seq++,
      type: "yard_return",
      from: { lat: currentLat, lng: currentLng, address: currentAddress },
      to: { lat: yard.lat, lng: yard.lng, address: yard.address },
      stop_minutes: 0,
      label: "End — Return to Yard",
    }));
  }

  return segments;
}

/**
 * Find the best dump location considering the next stop.
 * Not just nearest to current position — nearest that minimizes total distance
 * to current + dump + next stop.
 */
function findSmartDump(
  current: LatLng,
  nextStop: LatLng,
  dumps: DumpStation[]
): DumpStation | null {
  if (dumps.length === 0) return null;

  let best = dumps[0];
  let bestTotal = Infinity;

  for (const dump of dumps) {
    const toDump = haversineDistance(current.lat, current.lng, dump.lat, dump.lng);
    const dumpToNext = haversineDistance(dump.lat, dump.lng, nextStop.lat, nextStop.lng);
    const total = toDump + dumpToNext;

    if (total < bestTotal) {
      bestTotal = total;
      best = dump;
    }
  }

  return best;
}

// ─── Step 3: Insert Lunch Break ───

function insertLunchBreak(segments: RouteSegment[], config: RoutingConfig): RouteSegment[] {
  // Insert lunch roughly at the midpoint of the route
  const midpoint = Math.floor(segments.length / 2);
  const result = [...segments];

  // Find the best spot near midpoint (after a job, not mid-drive)
  let insertIdx = midpoint;
  for (let i = midpoint; i < segments.length; i++) {
    if (["drop", "pickup", "dump"].includes(segments[i].type)) {
      insertIdx = i + 1;
      break;
    }
  }

  const lunchSegment = makeSegment({
    sequence: 0, // will be re-sequenced
    type: "lunch",
    from: segments[insertIdx - 1]?.to || { lat: 0, lng: 0, address: "" },
    to: segments[insertIdx - 1]?.to || { lat: 0, lng: 0, address: "" },
    stop_minutes: config.lunch_minutes,
    label: "🍔 Lunch Break",
  });

  result.splice(insertIdx, 0, lunchSegment);

  // Re-sequence
  result.forEach((s, i) => { s.sequence = i; });

  return result;
}

// ─── Step 4: Calculate Drive Times ───

async function calculateDriveTimes(
  segments: RouteSegment[],
  useHere: boolean
): Promise<RouteSegment[]> {
  const result = [...segments];

  for (const seg of result) {
    if (seg.type === "lunch" || seg.type === "yard_depart") {
      seg.drive_miles = 0;
      seg.drive_minutes = 0;
      continue;
    }

    const from = seg.from;
    const to = seg.to;

    if (from.lat === to.lat && from.lng === to.lng) {
      seg.drive_miles = 0;
      seg.drive_minutes = 0;
      continue;
    }

    if (useHere) {
      const hereResult = await getTruckRoute(
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng }
      );

      if (hereResult) {
        seg.drive_miles = hereResult.distanceMiles;
        seg.drive_minutes = hereResult.durationMinutes;
        continue;
      }
    }

    // Fallback to haversine
    const miles = haversineDistance(from.lat, from.lng, to.lat, to.lng);
    seg.drive_miles = Math.round(miles * 10) / 10;
    seg.drive_minutes = estimateDriveTime(miles);
  }

  return result;
}

// ─── Step 5: Calculate Timeline ───

function calculateTimeline(segments: RouteSegment[], config: RoutingConfig): RouteSegment[] {
  let offset = 0; // minutes from route start

  for (const seg of segments) {
    seg.depart_time_offset = offset;
    seg.total_minutes = seg.drive_minutes + seg.stop_minutes;
    offset += seg.total_minutes;
    seg.arrive_time_offset = offset;
  }

  return segments;
}

// ─── Step 6: Score Segments ───

function scoreSegments(segments: RouteSegment[], config: RoutingConfig): RouteSegment[] {
  const { weights } = config;

  for (const seg of segments) {
    // Time score: total minutes for this segment
    seg.scores.time = seg.total_minutes;

    // Miles score: drive distance
    seg.scores.miles = seg.drive_miles;

    // Cost score: fuel + dump fee + driver wage
    const fuelCost = seg.drive_miles * config.fuel_cost_per_mile;
    const wageCost = (seg.total_minutes / 60) * config.driver_hourly_wage;
    const dumpCost = seg.type === "dump" ? 85 : 0; // avg dump cost
    seg.scores.cost = fuelCost + wageCost + dumpCost;

    // Inventory score: already set during build (+1 for pickup, -1 for drop)
    // Keep as-is

    // Service risk: higher if route is running long
    if (seg.arrive_time_offset > config.max_shift_minutes - config.lunch_minutes) {
      seg.scores.service_risk = 0.8; // high risk — might not get to this stop
    } else if (seg.arrive_time_offset > (config.max_shift_minutes - config.lunch_minutes) * 0.8) {
      seg.scores.service_risk = 0.4; // moderate risk
    } else {
      seg.scores.service_risk = 0.1; // low risk
    }

    // Composite score (weighted sum — normalize each bucket first)
    const maxTime = config.max_shift_minutes;
    const maxMiles = 100;
    const maxCost = 500;

    seg.scores.composite =
      weights.time * (seg.scores.time / maxTime) +
      weights.miles * (seg.scores.miles / maxMiles) +
      weights.cost * (seg.scores.cost / maxCost) +
      weights.inventory * Math.abs(seg.scores.inventory) +
      weights.service_risk * seg.scores.service_risk;
  }

  return segments;
}

// ─── Step 7: Assemble Route ───

function assembleRoute(segments: RouteSegment[], config: RoutingConfig): BuiltRoute {
  const totalMiles = segments.reduce((s, seg) => s + seg.drive_miles, 0);
  const totalMinutes = segments.length > 0
    ? segments[segments.length - 1].arrive_time_offset
    : 0;
  const drops = segments.filter((s) => s.type === "drop").length;
  const pickups = segments.filter((s) => s.type === "pickup").length;
  const dumpVisits = segments.filter((s) => s.type === "dump").length;
  const reuseCount = segments.filter((s) => s.box_reused).length;
  const lunchIdx = segments.findIndex((s) => s.type === "lunch");
  const compositeScore = segments.reduce((s, seg) => s + seg.scores.composite, 0);

  const productiveMinutes = config.max_shift_minutes - config.lunch_minutes;
  const isOver = totalMinutes > config.max_shift_minutes;
  const overtime = Math.max(0, totalMinutes - config.max_shift_minutes);

  // Route path for map
  const routePath = segments
    .filter((s) => s.to.lat !== 0)
    .map((s) => ({ lat: s.to.lat, lng: s.to.lng }));

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  let summary = `${drops} drops, ${pickups} pickups, ${dumpVisits} dump visits. `;
  summary += `${Math.round(totalMiles * 10) / 10} miles, ~${hours}h ${mins}m. `;
  if (reuseCount > 0) summary += `${reuseCount} box reuse${reuseCount > 1 ? "s" : ""} (saved ${reuseCount} yard trips). `;
  if (isOver) summary += `⚠ OVER CAPACITY by ${Math.floor(overtime / 60)}h ${overtime % 60}m. `;

  return {
    segments,
    total_miles: Math.round(totalMiles * 10) / 10,
    total_minutes: totalMinutes,
    total_stops: drops + pickups,
    total_dump_visits: dumpVisits,
    reuse_count: reuseCount,
    lunch_at_segment: lunchIdx,
    is_over_capacity: isOver,
    overtime_minutes: overtime,
    composite_score: Math.round(compositeScore * 1000) / 1000,
    route_path: routePath,
    drops,
    pickups,
    summary,
  };
}

// ─── Helpers ───

function makeSegment(partial: Partial<RouteSegment> & {
  sequence: number;
  type: RouteSegment["type"];
  from: { lat: number; lng: number; address: string };
  to: { lat: number; lng: number; address: string };
  stop_minutes: number;
  label: string;
}): RouteSegment {
  return {
    sequence: partial.sequence,
    type: partial.type,
    job_id: partial.job_id,
    dump_id: partial.dump_id,
    from: partial.from,
    to: partial.to,
    drive_miles: 0,
    drive_minutes: 0,
    stop_minutes: partial.stop_minutes,
    total_minutes: partial.stop_minutes,
    depart_time_offset: 0,
    arrive_time_offset: 0,
    box_id: partial.box_id,
    box_size: partial.box_size,
    box_condition: partial.box_condition,
    box_reused: partial.box_reused || false,
    box_action: partial.box_action,
    decision: partial.decision,
    decision_reason: partial.decision_reason,
    scores: partial.scores || { time: 0, miles: 0, cost: 0, inventory: 0, service_risk: 0, composite: 0 },
    label: partial.label,
    customer_name: partial.customer_name,
  };
}

function emptyRoute(): BuiltRoute {
  return {
    segments: [],
    total_miles: 0,
    total_minutes: 0,
    total_stops: 0,
    total_dump_visits: 0,
    reuse_count: 0,
    lunch_at_segment: -1,
    is_over_capacity: false,
    overtime_minutes: 0,
    composite_score: 0,
    route_path: [],
    drops: 0,
    pickups: 0,
    summary: "No jobs scheduled.",
  };
}

// ─── Learning System ───

export interface LearnedAverages {
  drop_minutes: number;
  pickup_minutes: number;
  dump_minutes: Record<string, number>; // by dump ID
  drive_factor: number; // multiplier on HERE estimates (1.0 = accurate)
}

/**
 * Query learned averages from route_learning table.
 * Falls back to defaults if not enough samples.
 */
export async function getLearnedAverages(
  supabase: any,
  operatorId: string,
  minSamples: number = 30
): Promise<LearnedAverages | null> {
  const { data: dropData } = await supabase
    .from("route_learning")
    .select("actual_minutes")
    .eq("operator_id", operatorId)
    .eq("segment_type", "drop");

  const { data: pickupData } = await supabase
    .from("route_learning")
    .select("actual_minutes")
    .eq("operator_id", operatorId)
    .eq("segment_type", "pickup");

  const { data: dumpData } = await supabase
    .from("route_learning")
    .select("entity_id, actual_minutes")
    .eq("operator_id", operatorId)
    .eq("segment_type", "dump");

  if (!dropData || dropData.length < minSamples) return null;

  const avgDrop = dropData.reduce((s: number, d: any) => s + d.actual_minutes, 0) / dropData.length;
  const avgPickup = pickupData && pickupData.length >= minSamples
    ? pickupData.reduce((s: number, d: any) => s + d.actual_minutes, 0) / pickupData.length
    : 20;

  // Dump averages by location
  const dumpAvgs: Record<string, number> = {};
  if (dumpData) {
    const byDump: Record<string, number[]> = {};
    dumpData.forEach((d: any) => {
      if (!byDump[d.entity_id]) byDump[d.entity_id] = [];
      byDump[d.entity_id].push(d.actual_minutes);
    });
    for (const [id, times] of Object.entries(byDump)) {
      if (times.length >= 10) {
        dumpAvgs[id] = times.reduce((s, t) => s + t, 0) / times.length;
      }
    }
  }

  return {
    drop_minutes: Math.round(avgDrop),
    pickup_minutes: Math.round(avgPickup),
    dump_minutes: dumpAvgs,
    drive_factor: 1.0,
  };
}

/**
 * Log a completed segment to the learning table.
 */
export async function logSegmentLearning(
  supabase: any,
  operatorId: string,
  segment: RouteSegment,
  actualMinutes: number,
  actualMiles?: number
): Promise<void> {
  const hour = new Date().getHours();
  const timeOfDay = hour < 10 ? "morning" : hour < 14 ? "midday" : hour < 17 ? "afternoon" : "evening";

  await supabase.from("route_learning").insert({
    operator_id: operatorId,
    segment_type: segment.type,
    entity_id: segment.job_id || segment.dump_id || null,
    box_size: segment.box_size || null,
    time_of_day: timeOfDay,
    day_of_week: new Date().getDay(),
    planned_minutes: segment.total_minutes,
    actual_minutes: actualMinutes,
    planned_miles: segment.drive_miles,
    actual_miles: actualMiles || null,
  });
}
