"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  MapPin, Truck, Clock, Route, Sparkles, ChevronLeft, ChevronRight,
  Package, ArrowUp, ArrowDown, Loader2, Plus, X, AlertTriangle,
  ArrowRightLeft, Minus, ChevronDown, Save, RotateCcw, GripVertical,
  Phone, Hash, Navigation, List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import DispatchMap, { type TruckLocation } from "@/components/dispatch/DispatchMap";
import { haversineDistance, totalRouteMiles, estimateDriveTime } from "@/lib/geo";
import { buildRouteSegments } from "@/lib/build-route-segments";

/* ═══════════════════════════════════════════════════════════════════════════
   Constants & Types
   ═══════════════════════════════════════════════════════════════════════════ */

const YARD = { lat: 40.5683, lng: -74.5384, address: "1 Drake St, Bound Brook, NJ 08805" };

type Job = {
  id: string;
  customer_name: string;
  customer_phone: string;
  drop_address: string;
  drop_lat: number | null;
  drop_lng: number | null;
  status: string;
  job_type: string;
  dumpster_unit_number: string | null;
  dumpster_id: string | null;
  dumpster_size: string | null;
  truck_id: string | null;
  truck_name: string | null;
  assigned_driver_id: string | null;
  requested_drop_start: string | null;
  requested_pickup_start: string | null;
  actual_drop_time: string | null;
  base_rate: number;
  route_order: number | null;
};

type TruckData = {
  id: string;
  name: string;
  plate: string;
  status: string;
};

type DumpLocation = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type RouteSegmentDisplay = {
  sequence: number;
  type: string;
  job_id?: string;
  label: string;
  customer_name?: string;
  drive_miles: number;
  drive_minutes: number;
  stop_minutes: number;
  total_minutes: number;
  depart_time_offset: number;
  arrive_time_offset: number;
  box_size?: string;
  box_condition?: string;
  box_reused: boolean;
  box_action?: string;
  decision?: string;
  decision_reason?: string;
  scores: { time: number; miles: number; cost: number; inventory: number; service_risk: number; composite: number };
};

type OptimizedRoute = {
  optimized_sequence: string[];
  estimated_miles: number;
  estimated_minutes: number;
  reasoning: string;
  route_path: Array<{ lat: number; lng: number }>;
  // New segment data
  segments?: RouteSegmentDisplay[];
  drops?: number;
  pickups?: number;
  total_dump_visits?: number;
  reuse_opportunities?: number;
  is_over_capacity?: boolean;
  overtime_minutes?: number;
  composite_score?: number;
  operating_mode?: string;
  config_used?: {
    drop_minutes: number;
    pickup_minutes: number;
    dump_minutes: number;
    lunch_minutes: number;
    max_shift_minutes: number;
    used_learned_times: boolean;
  };
};

type ImpactAnalysis = {
  milesBefore: number;
  milesAfter: number;
  milesChange: number;
  minutesChange: number;
  affectedCustomers: string[];
};

type DraftChange =
  | { type: "move"; jobId: string; from: number; to: number }
  | { type: "add"; jobId: string; position: number }
  | { type: "remove"; jobId: string }
  | { type: "reassign"; jobId: string; fromTruckId: string | null }
  | { type: "optimize"; truckId: string }
  | { type: "new_job"; jobId: string };

type AddModalTab = "unassigned" | "other_trucks" | "all_jobs" | "new_job";

/* ═══════════════════════════════════════════════════════════════════════════
   Utility Functions
   ═══════════════════════════════════════════════════════════════════════════ */

function getJobType(job: Job): "drop" | "pickup" {
  return ["pickup_requested", "pickup_scheduled", "en_route_pickup"].includes(job.status)
    ? "pickup"
    : "drop";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    en_route_drop: "En Route (Drop)",
    dropped: "Just Dropped",
    pickup_requested: "Pickup Requested",
    pickup_scheduled: "Pickup Scheduled",
    en_route_pickup: "En Route (Pickup)",
    pending_approval: "Pending",
    active: "Active",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  if (["en_route_drop", "en_route_pickup"].includes(status)) return "text-indigo-400";
  if (["scheduled", "pickup_scheduled"].includes(status)) return "text-blue-400";
  if (status === "dropped") return "text-emerald-400";
  if (status === "pickup_requested") return "text-orange-400";
  return "text-tippd-ash";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Derive dumpster size from unit_number prefix: M-1xx=10yd, M-2xx=20yd, M-3xx=30yd */
function deriveDumpsterSize(unitNumber: string | null): string {
  if (!unitNumber) return "?";
  const match = unitNumber.match(/M-(\d)/);
  if (!match) return "?";
  const prefix = parseInt(match[1]);
  if (prefix === 1) return "10yd";
  if (prefix === 2) return "20yd";
  if (prefix === 3) return "30yd";
  return "?";
}

/** Build route: Yard -> ordered stops -> Yard, return total miles */
function calcRouteMiles(orderedJobs: Job[]): number {
  const geoJobs = orderedJobs.filter((j) => j.drop_lat && j.drop_lng);
  if (geoJobs.length === 0) return 0;
  const stops = [
    { lat: YARD.lat, lng: YARD.lng },
    ...geoJobs.map((j) => ({ lat: j.drop_lat!, lng: j.drop_lng! })),
    { lat: YARD.lat, lng: YARD.lng },
  ];
  return totalRouteMiles(stops);
}

/** Calculate impact of inserting a job at a position in an ordered list */
function calcInsertImpact(
  currentJobs: Job[],
  jobToAdd: Job,
  insertPosition: number
): ImpactAnalysis {
  const milesBefore = calcRouteMiles(currentJobs);
  const newJobs = [...currentJobs];
  newJobs.splice(insertPosition, 0, jobToAdd);
  const milesAfter = calcRouteMiles(newJobs);
  const milesChange = Math.round((milesAfter - milesBefore) * 10) / 10;
  const minutesChange = estimateDriveTime(Math.abs(milesChange)) * (milesChange >= 0 ? 1 : -1);

  const affectedCustomers: string[] = [];
  if (currentJobs.length >= 3 && minutesChange > 15) {
    const lastJob = currentJobs[currentJobs.length - 1];
    if (lastJob?.requested_drop_start || lastJob?.requested_pickup_start) {
      affectedCustomers.push(lastJob.customer_name);
    }
  }

  return { milesBefore, milesAfter, milesChange, minutesChange, affectedCustomers };
}

/** Calculate impact of removing a job from ordered list */
function calcRemoveImpact(currentJobs: Job[], jobToRemove: Job): ImpactAnalysis {
  const milesBefore = calcRouteMiles(currentJobs);
  const newJobs = currentJobs.filter((j) => j.id !== jobToRemove.id);
  const milesAfter = calcRouteMiles(newJobs);
  const milesChange = Math.round((milesAfter - milesBefore) * 10) / 10;
  const minutesChange = estimateDriveTime(Math.abs(milesChange)) * (milesChange >= 0 ? 1 : -1);

  return {
    milesBefore,
    milesAfter,
    milesChange,
    minutesChange,
    affectedCustomers: [jobToRemove.customer_name],
  };
}

/** Calculate impact of moving a job from one position to another */
function calcMoveImpact(currentJobs: Job[], fromIdx: number, toIdx: number): ImpactAnalysis {
  const milesBefore = calcRouteMiles(currentJobs);
  const reordered = [...currentJobs];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);
  const milesAfter = calcRouteMiles(reordered);
  const milesChange = Math.round((milesAfter - milesBefore) * 10) / 10;
  const minutesChange = estimateDriveTime(Math.abs(milesChange)) * (milesChange >= 0 ? 1 : -1);

  return { milesBefore, milesAfter, milesChange, minutesChange, affectedCustomers: [] };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component: Impact Badge (inline)
   ═══════════════════════════════════════════════════════════════════════════ */

function ImpactBadge({ impact }: { impact: ImpactAnalysis }) {
  const positive = impact.milesChange <= 0; // less miles = positive
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 rounded-md text-xs font-medium",
        positive ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
      )}
    >
      <span>
        {impact.milesChange >= 0 ? "+" : ""}
        {impact.milesChange} mi
      </span>
      <span>
        {impact.minutesChange >= 0 ? "+" : ""}
        {impact.minutesChange} min
      </span>
      {impact.affectedCustomers.length > 0 && (
        <span className="flex items-center gap-1 text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          {impact.affectedCustomers.join(", ")}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DispatchPage() {
  // ─── Server State ───
  const [date, setDate] = useState(new Date());
  const [serverJobs, setServerJobs] = useState<Job[]>([]);
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [transferStations, setTransferStations] = useState<DumpLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Draft State (local-only until save) ───
  const [draftJobs, setDraftJobs] = useState<Job[]>([]);
  const [draftChanges, setDraftChanges] = useState<DraftChange[]>([]);
  const isDirty = draftChanges.length > 0;

  // ─── UI State ───
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizedRoute | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapError, setMapError] = useState(false);

  // ─── View Mode ───
  const [viewMode, setViewMode] = useState<"jobs" | "segments">("segments");
  const [fullSegments, setFullSegments] = useState<any[]>([]);

  // ─── Live Truck Locations ───
  const [truckLocations, setTruckLocations] = useState<TruckLocation[]>([]);

  // Poll truck locations every 30s
  useEffect(() => {
    let cancelled = false;
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/dispatch/truck-locations");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTruckLocations(data.locations || []);
        }
      } catch {
        // silently ignore — truck locations are best-effort
      }
    };
    fetchLocations();
    const interval = setInterval(fetchLocations, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ─── Add Job Modal ───
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<AddModalTab>("unassigned");
  const [addTargetJob, setAddTargetJob] = useState<Job | null>(null);
  const [addInsertPosition, setAddInsertPosition] = useState<number>(-1); // -1 = end
  const [addImpact, setAddImpact] = useState<ImpactAnalysis | null>(null);

  // ─── New Job (quick-create inside modal) ───
  const [newJobForm, setNewJobForm] = useState({
    customer_name: "",
    customer_phone: "",
    drop_address: "",
    size: "20yd",
    job_type: "delivery",
  });
  const [newJobSaving, setNewJobSaving] = useState(false);

  // ─── Remove Job ───
  const [removeTarget, setRemoveTarget] = useState<Job | null>(null);
  const [removeImpact, setRemoveImpact] = useState<ImpactAnalysis | null>(null);

  // ─── Move Impact (shown briefly after reorder) ───
  const [moveImpact, setMoveImpact] = useState<ImpactAnalysis | null>(null);
  const moveImpactTimer = useRef<ReturnType<typeof setTimeout>>();

  /* ─── Load Data ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: jobData } = await supabase
      .from("jobs")
      .select("*")
      .in("status", [
        "scheduled", "en_route_drop",
        "pickup_scheduled", "en_route_pickup",
        "pending_approval",
      ])
      .order("created_at", { ascending: false });

    const loadedJobs: Job[] = (jobData || []).map((j: any) => ({
      ...j,
      dumpster_size: j.dumpster_size || deriveDumpsterSize(j.dumpster_unit_number),
      route_order: j.route_order ?? null,
    }));

    setServerJobs(loadedJobs);
    setDraftJobs(loadedJobs);
    setDraftChanges([]);

    const { data: truckData } = await supabase
      .from("trucks")
      .select("*")
      .eq("status", "active");
    if (truckData) setTrucks(truckData);

    const { data: tsData } = await supabase
      .from("dump_locations")
      .select("*")
      .eq("is_active", true);
    if (tsData) setTransferStations(tsData);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, date]);

  // Auto-select first truck
  useEffect(() => {
    if (trucks.length > 0 && !selectedTruck) {
      setSelectedTruck(trucks[0].id);
    }
  }, [trucks, selectedTruck]);

  /* ─── Derived Data ─── */

  // Jobs for the selected truck, ordered
  const truckJobs = useMemo(() => {
    const tj = draftJobs.filter((j) => j.truck_id === selectedTruck);
    // Sort by route_order if available, otherwise by original array position
    return tj.sort((a, b) => {
      const aOrder = a.route_order ?? 9999;
      const bOrder = b.route_order ?? 9999;
      return aOrder - bOrder;
    });
  }, [draftJobs, selectedTruck]);

  // Build full segments when truck jobs change
  useEffect(() => {
    if (truckJobs.length === 0) {
      setFullSegments([]);
      return;
    }
    try {
      const routeJobs = truckJobs.map((j) => ({
        id: j.id,
        customer_name: j.customer_name,
        drop_address: j.drop_address,
        drop_lat: j.drop_lat,
        drop_lng: j.drop_lng,
        status: j.status,
        job_type: j.job_type,
        dumpster_id: j.dumpster_id,
        dumpster_unit_number: j.dumpster_unit_number,
        dumpster_size: j.dumpster_size || deriveDumpsterSize(j.dumpster_unit_number),
        dumpster_condition: null,
      }));
      const dumps = transferStations.map((ts) => ({
        id: ts.id,
        name: ts.name,
        address: ts.address,
        lat: ts.lat,
        lng: ts.lng,
      }));
      const { segments } = buildRouteSegments(routeJobs, dumps, { insertLunch: true });
      setFullSegments(segments);
    } catch (e) {
      console.error("Segment build error:", e);
      setFullSegments([]);
    }
  }, [truckJobs, transferStations]);

  // Route miles for each truck
  const truckMilesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trucks) {
      const tj = draftJobs
        .filter((j) => j.truck_id === t.id)
        .sort((a, b) => (a.route_order ?? 9999) - (b.route_order ?? 9999));
      map[t.id] = calcRouteMiles(tj);
    }
    return map;
  }, [draftJobs, trucks]);

  const totalRouteAllTrucks = useMemo(
    () => Object.values(truckMilesMap).reduce((s, m) => s + m, 0),
    [truckMilesMap]
  );

  const currentRouteMiles = selectedTruck ? (truckMilesMap[selectedTruck] || 0) : 0;
  const currentRouteTime = estimateDriveTime(currentRouteMiles);
  const MAX_SHIFT_MINUTES = 480; // 8 hours
  const isOverCapacity = currentRouteTime > MAX_SHIFT_MINUTES;
  const overtimeMinutes = Math.max(0, currentRouteTime - MAX_SHIFT_MINUTES);

  // Unassigned
  const unassigned = useMemo(
    () => draftJobs.filter((j) => !j.truck_id && j.status !== "pending_approval"),
    [draftJobs]
  );

  // All jobs (for "All Jobs" tab in modal)
  const allActiveJobs = useMemo(
    () => draftJobs.filter((j) => j.status !== "pending_approval"),
    [draftJobs]
  );

  // Other trucks' jobs (for "Other Trucks" tab)
  const otherTruckJobs = useMemo(
    () => draftJobs.filter((j) => j.truck_id && j.truck_id !== selectedTruck && j.status !== "pending_approval"),
    [draftJobs, selectedTruck]
  );

  // Pending
  const pending = useMemo(
    () => draftJobs.filter((j) => j.status === "pending_approval"),
    [draftJobs]
  );

  // Stats
  const totalJobsCount = allActiveJobs.length;
  const dropsToday = draftJobs.filter((j) => ["scheduled", "en_route_drop"].includes(j.status)).length;
  const pickupsToday = draftJobs.filter((j) => ["pickup_scheduled", "pickup_requested", "en_route_pickup"].includes(j.status)).length;
  const activeTrucks = new Set(draftJobs.filter((j) => j.truck_id).map((j) => j.truck_id)).size;

  // Map data
  const mapJobs = useMemo(() => {
    return draftJobs
      .filter((j) => j.drop_lat && j.drop_lng)
      .map((j) => {
        let daysOnSite: number | undefined;
        if (j.actual_drop_time) {
          const dropDate = new Date(j.actual_drop_time);
          daysOnSite = Math.floor((Date.now() - dropDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        return {
          id: j.id,
          lat: j.drop_lat!,
          lng: j.drop_lng!,
          address: j.drop_address,
          customer_name: j.customer_name,
          type: getJobType(j),
          status: j.status,
          unit_number: j.dumpster_unit_number || undefined,
          size: j.dumpster_size || undefined,
          base_rate: j.base_rate,
          actual_drop_time: j.actual_drop_time || undefined,
          requested_pickup_start: j.requested_pickup_start || undefined,
          days_on_site: daysOnSite,
        };
      });
  }, [draftJobs]);

  const mapTransferStations = useMemo(
    () => transferStations.map((ts) => ({ id: ts.id, lat: ts.lat, lng: ts.lng, name: ts.name })),
    [transferStations]
  );

  // Route path for map — use optimized route path (real roads) if available,
  // otherwise fall back to straight lines between waypoints
  const draftRoutePath = useMemo(() => {
    // If we have an optimized route with a real road polyline, use that
    if (optimizationResult?.route_path && optimizationResult.route_path.length > 2) {
      return optimizationResult.route_path;
    }
    // Fallback: straight lines between stops (less accurate but shows the route)
    const geoJobs = truckJobs.filter((j) => j.drop_lat && j.drop_lng);
    if (geoJobs.length === 0) return undefined;
    return [
      { lat: YARD.lat, lng: YARD.lng },
      ...geoJobs.map((j) => ({ lat: j.drop_lat!, lng: j.drop_lng! })),
      { lat: YARD.lat, lng: YARD.lng },
    ];
  }, [truckJobs, optimizationResult]);

  /* ═══════════════════════════════════════════════════════════════════════
     Draft Operations (local state only)
     ═══════════════════════════════════════════════════════════════════════ */

  /** Reorder: assign sequential route_order values to truck's jobs */
  function reorderTruckJobs(jobs: Job[], truckId: string): Job[] {
    let order = 0;
    return jobs.map((j) => {
      if (j.truck_id === truckId) {
        return { ...j, route_order: order++ };
      }
      return j;
    });
  }

  /** Move a job up or down in the current truck's route */
  function moveJob(jobId: string, direction: "up" | "down") {
    const idx = truckJobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= truckJobs.length) return;

    // Calculate impact before moving
    const impact = calcMoveImpact(truckJobs, idx, newIdx);

    // Reorder
    const reordered = [...truckJobs];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);

    // Assign new route_order values
    const newDraft = draftJobs.map((j) => {
      if (j.truck_id !== selectedTruck) return j;
      const orderIdx = reordered.findIndex((rj) => rj.id === j.id);
      return orderIdx >= 0 ? { ...j, route_order: orderIdx } : j;
    });

    setDraftJobs(newDraft);
    setDraftChanges((prev) => [...prev, { type: "move", jobId, from: idx, to: newIdx }]);

    // Show move impact — stays visible until next action
    setMoveImpact(impact);
    setOptimizationResult(null); // clear old optimization since route changed
    if (moveImpactTimer.current) clearTimeout(moveImpactTimer.current);
    moveImpactTimer.current = setTimeout(() => setMoveImpact(null), 8000);
  }

  /** Add a job to the selected truck's route at a given position */
  function addJobToRoute(job: Job, position: number) {
    if (!selectedTruck) return;
    const truck = trucks.find((t) => t.id === selectedTruck);
    const currentOrder = truckJobs.length;
    const insertAt = position === -1 ? currentOrder : position;

    // Update the draft
    const fromTruckId = job.truck_id;

    // First: remove from any current truck assignment in route ordering
    let updated = draftJobs.map((j) => {
      if (j.id === job.id) {
        return {
          ...j,
          truck_id: selectedTruck,
          truck_name: truck?.name || null,
          status: j.truck_id ? j.status : "scheduled",
          route_order: insertAt,
        };
      }
      return j;
    });

    // Re-sequence: push everything at or after insertAt down by 1 for this truck
    updated = updated.map((j) => {
      if (j.truck_id === selectedTruck && j.id !== job.id && j.route_order !== null && j.route_order >= insertAt) {
        return { ...j, route_order: j.route_order + 1 };
      }
      return j;
    });

    setDraftJobs(updated);
    setDraftChanges((prev) => [
      ...prev,
      fromTruckId && fromTruckId !== selectedTruck
        ? { type: "reassign", jobId: job.id, fromTruckId }
        : { type: "add", jobId: job.id, position: insertAt },
    ]);

    // Reset modal state
    setAddTargetJob(null);
    setAddImpact(null);
    setShowAddModal(false);
    setAddInsertPosition(-1);
  }

  /** Remove a job from its truck (goes back to unassigned) */
  function removeJobFromRoute(job: Job) {
    const updated = draftJobs.map((j) => {
      if (j.id === job.id) {
        return { ...j, truck_id: null, truck_name: null, route_order: null, status: "scheduled" };
      }
      return j;
    });

    // Re-sequence remaining jobs on this truck
    const truckId = job.truck_id;
    if (truckId) {
      const remaining = updated
        .filter((j) => j.truck_id === truckId)
        .sort((a, b) => (a.route_order ?? 9999) - (b.route_order ?? 9999));
      let order = 0;
      const resequenced = updated.map((j) => {
        if (j.truck_id === truckId) {
          const ri = remaining.findIndex((rj) => rj.id === j.id);
          return ri >= 0 ? { ...j, route_order: order++ } : j;
        }
        return j;
      });
      setDraftJobs(resequenced);
    } else {
      setDraftJobs(updated);
    }

    setDraftChanges((prev) => [...prev, { type: "remove", jobId: job.id }]);
    setRemoveTarget(null);
    setRemoveImpact(null);
  }

  /** Revert all draft changes back to server state */
  function revertDraft() {
    setDraftJobs(serverJobs);
    setDraftChanges([]);
    setMoveImpact(null);
  }

  /** Save all draft changes to Supabase */
  async function saveDraft() {
    if (!isDirty) return;
    setSaving(true);

    try {
      const supabase = createClient();

      // Find all jobs that differ from server state
      const changedJobs = draftJobs.filter((dj) => {
        const sj = serverJobs.find((s) => s.id === dj.id);
        if (!sj) return true; // new job
        return (
          dj.truck_id !== sj.truck_id ||
          dj.truck_name !== sj.truck_name ||
          dj.route_order !== sj.route_order ||
          dj.status !== sj.status
        );
      });

      // Batch update
      for (const job of changedJobs) {
        await supabase
          .from("jobs")
          .update({
            truck_id: job.truck_id,
            truck_name: job.truck_name,
            status: job.status,
          })
          .eq("id", job.id);
      }

      // Sync server state
      setServerJobs([...draftJobs]);
      setDraftChanges([]);
    } catch (err) {
      console.error("Save failed:", err);
    }

    setSaving(false);
  }

  /* ─── Optimize Route ─── */
  async function optimizeRoute() {
    if (!selectedTruck || truckJobs.length === 0) return;
    setOptimizing(true);

    const optimizeJobs = truckJobs
      .filter((j) => j.drop_lat && j.drop_lng)
      .map((j) => ({
        id: j.id,
        lat: j.drop_lat!,
        lng: j.drop_lng!,
        type: getJobType(j),
        address: j.drop_address,
        customer_name: j.customer_name,
        box_size: j.dumpster_size || deriveDumpsterSize(j.dumpster_unit_number),
        box_id: j.dumpster_id || undefined,
        job_type: j.job_type,
      }));

    try {
      const res = await fetch("/api/routes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: optimizeJobs,
          yard: YARD,
          transfer_stations: mapTransferStations,
        }),
      });
      const data: OptimizedRoute = await res.json();

      if (data.optimized_sequence) {
        // Apply the optimized sequence to draft
        const sequenceMap = new Map(data.optimized_sequence.map((id: string, i: number) => [id, i]));
        const updated = draftJobs.map((j) => {
          if (j.truck_id === selectedTruck && sequenceMap.has(j.id)) {
            return { ...j, route_order: sequenceMap.get(j.id)! };
          }
          return j;
        });
        setDraftJobs(updated);
        setDraftChanges((prev) => [...prev, { type: "optimize", truckId: selectedTruck }]);
        setOptimizationResult(data);
      }
    } catch (e) {
      console.error("Optimization failed:", e);
    }
    setOptimizing(false);
  }

  // Auto-optimize on initial load — applies result WITHOUT marking as dirty
  const hasAutoOptimized = useRef(false);
  useEffect(() => {
    if (hasAutoOptimized.current) return;
    if (!selectedTruck || truckJobs.length === 0 || loading || transferStations.length === 0) return;
    hasAutoOptimized.current = true;

    // Run optimization silently (don't add to draftChanges)
    const silentOptimize = async () => {
      const optimizeJobs = truckJobs
        .filter((j) => j.drop_lat && j.drop_lng)
        .map((j) => ({
          id: j.id, lat: j.drop_lat!, lng: j.drop_lng!, type: getJobType(j),
          address: j.drop_address, customer_name: j.customer_name,
          box_size: j.dumpster_size || deriveDumpsterSize(j.dumpster_unit_number),
          box_id: j.dumpster_id || undefined, job_type: j.job_type,
        }));
      try {
        const res = await fetch("/api/routes/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobs: optimizeJobs, yard: YARD, transfer_stations: mapTransferStations }),
        });
        const data: OptimizedRoute = await res.json();
        if (data.optimized_sequence) {
          const sequenceMap = new Map(data.optimized_sequence.map((id: string, i: number) => [id, i]));
          setDraftJobs((prev) => prev.map((j) =>
            j.truck_id === selectedTruck && sequenceMap.has(j.id)
              ? { ...j, route_order: sequenceMap.get(j.id)! }
              : j
          ));
          setServerJobs((prev) => prev.map((j) =>
            j.truck_id === selectedTruck && sequenceMap.has(j.id)
              ? { ...j, route_order: sequenceMap.get(j.id)! }
              : j
          ));
          setOptimizationResult(data);
          // NO draftChanges push — this is the baseline, not a user change
        }
      } catch (e) {
        console.error("Auto-optimize failed:", e);
      }
    };
    setTimeout(silentOptimize, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTruck, truckJobs.length, loading, transferStations.length]);

  /* ─── Add Modal: select job and show impact ─── */
  function selectJobToAdd(job: Job) {
    const pos = addInsertPosition === -1 ? truckJobs.length : addInsertPosition;
    const impact = calcInsertImpact(truckJobs, job, pos);
    setAddTargetJob(job);
    setAddImpact(impact);
  }

  // Recalculate impact when insert position changes
  useEffect(() => {
    if (addTargetJob && showAddModal) {
      const pos = addInsertPosition === -1 ? truckJobs.length : addInsertPosition;
      const impact = calcInsertImpact(truckJobs, addTargetJob, pos);
      setAddImpact(impact);
    }
  }, [addInsertPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Quick-create new job ─── */
  async function createNewJob() {
    if (!newJobForm.customer_name || !newJobForm.drop_address) return;
    setNewJobSaving(true);

    try {
      const supabase = createClient();
      const truck = selectedTruck ? trucks.find((t) => t.id === selectedTruck) : null;

      const { data, error } = await supabase
        .from("jobs")
        .insert({
          customer_name: newJobForm.customer_name,
          customer_phone: newJobForm.customer_phone,
          drop_address: newJobForm.drop_address,
          job_type: newJobForm.job_type,
          status: selectedTruck ? "scheduled" : "scheduled",
          truck_id: selectedTruck,
          truck_name: truck?.name || null,
          route_order: selectedTruck ? truckJobs.length : null,
          base_rate: 0,
        } as any)
        .select("*")
        .single();

      if (data) {
        const newJob: Job = {
          ...data,
          dumpster_size: newJobForm.size,
          route_order: data.route_order ?? null,
        } as any;

        setDraftJobs((prev) => [...prev, newJob]);
        setServerJobs((prev) => [...prev, newJob]);
        setDraftChanges((prev) => [...prev, { type: "new_job", jobId: newJob.id }]);
        setNewJobForm({ customer_name: "", customer_phone: "", drop_address: "", size: "20yd", job_type: "delivery" });
        setShowAddModal(false);
      }
    } catch (err) {
      console.error("Failed to create job:", err);
    }

    setNewJobSaving(false);
  }

  /* ─── Remove: initiate ─── */
  function initiateRemove(job: Job) {
    const impact = calcRemoveImpact(truckJobs, job);
    setRemoveTarget(job);
    setRemoveImpact(impact);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-tippd-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* ──── Header ──── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Dispatch</h1>
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
              className="p-1 text-tippd-smoke hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-white min-w-[140px] text-center">{formatDate(date)}</span>
            <button
              onClick={() => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
              className="p-1 text-tippd-smoke hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-tippd-smoke">
            <Package className="w-4 h-4" />
            <span><span className="text-white font-bold">{totalJobsCount}</span> jobs</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <ArrowDown className="w-4 h-4" />
            <span className="font-bold">{dropsToday}</span> drops
          </div>
          <div className="flex items-center gap-1.5 text-orange-400">
            <ArrowUp className="w-4 h-4" />
            <span className="font-bold">{pickupsToday}</span> pickups
          </div>
          <div className="flex items-center gap-1.5 text-tippd-smoke">
            <Truck className="w-4 h-4" />
            <span><span className="text-white font-bold">{activeTrucks}</span>/{trucks.length} trucks</span>
          </div>
          <div className="flex items-center gap-1.5 text-tippd-smoke">
            <Route className="w-4 h-4" />
            <span><span className="text-white font-bold">{totalRouteAllTrucks.toFixed(1)}</span> mi total</span>
          </div>
        </div>
      </div>

      {/* ──── Main Content: Left Panel + Map ──── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
        {/* ── Left Panel ── */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-3 overflow-y-auto pb-20 pr-1 lg:pr-3">
          {/* Truck Tabs */}
          <div className="flex gap-2">
            {trucks.map((t) => {
              const jobCount = draftJobs.filter((j) => j.truck_id === t.id).length;
              const miles = truckMilesMap[t.id] || 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTruck(t.id)}
                  className={cn(
                    "flex-1 p-2.5 rounded-lg border text-sm font-medium transition-all text-left",
                    selectedTruck === t.id
                      ? "border-tippd-blue bg-tippd-blue/10 text-white"
                      : "border-white/10 bg-tippd-charcoal text-tippd-smoke hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    <span>{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-tippd-ash">{jobCount} jobs</span>
                    <span className="text-xs text-tippd-ash">&middot;</span>
                    <span className="text-xs text-tippd-ash">{miles.toFixed(1)} mi</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Buttons — always visible */}
          <div className="flex gap-2">
            <button
              onClick={optimizeRoute}
              disabled={optimizing || truckJobs.length === 0}
              className="flex-1 min-w-0 py-2.5 bg-gradient-to-r from-tippd-blue to-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {optimizing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing...</>
              ) : (
                <><Sparkles className="w-4 h-4 shrink-0" /> {optimizationResult ? "Re-Optimize" : "Optimize"} ({truckJobs.length})</>
              )}
            </button>
            <button
              onClick={() => { setShowAddModal(true); setAddTargetJob(null); setAddImpact(null); setAddModalTab("unassigned"); setAddInsertPosition(-1); }}
              disabled={!selectedTruck}
              className="shrink-0 py-2.5 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Move Impact Toast */}
          {moveImpact && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <ImpactBadge impact={moveImpact} />
            </div>
          )}

          {/* Optimization Result */}
          {optimizationResult && (
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-indigo-300">AI Optimized Route</span>
                <button onClick={() => setOptimizationResult(null)} className="ml-auto text-tippd-ash hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm mb-2">
                <span className="text-white"><strong>{optimizationResult.estimated_miles}</strong> mi</span>
                <span className="text-white"><strong>{Math.floor(optimizationResult.estimated_minutes / 60)}h {optimizationResult.estimated_minutes % 60}m</strong></span>
                {optimizationResult.drops !== undefined && <span className="text-blue-400">{optimizationResult.drops} drops</span>}
                {optimizationResult.pickups !== undefined && <span className="text-orange-400">{optimizationResult.pickups} pickups</span>}
                {optimizationResult.total_dump_visits !== undefined && <span className="text-red-400">{optimizationResult.total_dump_visits} dumps</span>}
                {(optimizationResult.reuse_opportunities || 0) > 0 && <span className="text-emerald-400">{optimizationResult.reuse_opportunities} reuse</span>}
              </div>
              {optimizationResult.is_over_capacity && (
                <div className="flex items-center gap-1 text-xs text-red-400 mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  Over 8hr shift by {Math.floor((optimizationResult.overtime_minutes || 0) / 60)}h {(optimizationResult.overtime_minutes || 0) % 60}m
                </div>
              )}
              <p className="text-xs text-tippd-smoke">{optimizationResult.reasoning}</p>
              {optimizationResult.config_used?.used_learned_times && (
                <p className="text-xs text-emerald-400 mt-1">Using learned time averages from historical data</p>
              )}
            </div>
          )}

          {/* Segment Detail View */}
          {optimizationResult?.segments && optimizationResult.segments.length > 0 && (
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {optimizationResult.segments.map((seg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
                    seg.type === "drop" ? "bg-blue-500/10 text-blue-300" :
                    seg.type === "pickup" ? "bg-orange-500/10 text-orange-300" :
                    seg.type === "dump" ? "bg-red-500/10 text-red-300" :
                    seg.type === "lunch" ? "bg-amber-500/10 text-amber-300" :
                    seg.type === "reposition" ? "bg-purple-500/10 text-purple-300" :
                    "bg-white/5 text-tippd-ash"
                  )}
                >
                  <span className="w-4 text-center font-mono text-tippd-ash">{i}</span>
                  <span className="flex-1 truncate">{seg.label}</span>
                  {seg.drive_miles > 0 && <span className="shrink-0">{seg.drive_miles}mi</span>}
                  <span className="shrink-0 text-tippd-ash">{seg.total_minutes}m</span>
                  {seg.box_reused && <span className="shrink-0 text-emerald-400 font-bold">♻</span>}
                </div>
              ))}
            </div>
          )}

          {/* ── Truck Route (ordered list) ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-tippd-ash uppercase tracking-wide">
                {trucks.find((t) => t.id === selectedTruck)?.name || "Select Truck"} — Route
              </h3>
              <div className="flex items-center gap-2 text-xs text-tippd-ash">
                <Navigation className="w-3 h-3" />
                <span>{currentRouteMiles.toFixed(1)} mi</span>
                <span>&middot;</span>
                <Clock className="w-3 h-3" />
                <span className={isOverCapacity ? "text-red-400 font-bold" : ""}>
                  ~{Math.floor(currentRouteTime / 60)}h {currentRouteTime % 60}m
                </span>
                <span>&middot;</span>
                <span>{truckJobs.length} stops</span>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setViewMode("segments")}
                className={cn("px-3 py-1 rounded text-xs font-medium transition-colors", viewMode === "segments" ? "bg-tippd-blue text-white" : "bg-white/5 text-tippd-ash hover:text-white")}
              >
                Full Route
              </button>
              <button
                onClick={() => setViewMode("jobs")}
                className={cn("px-3 py-1 rounded text-xs font-medium transition-colors", viewMode === "jobs" ? "bg-tippd-blue text-white" : "bg-white/5 text-tippd-ash hover:text-white")}
              >
                Jobs Only
              </button>
            </div>

            {/* ── FULL ROUTE VIEW (segments) ── */}
            {viewMode === "segments" && fullSegments.length > 0 && (
              <div className="space-y-0.5 mb-2">
                {fullSegments.map((seg, i) => (
                  <div
                    key={seg.id || i}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors",
                      seg.type === "drop" ? "bg-blue-500/10 border border-blue-500/20" :
                      seg.type === "pickup" ? "bg-orange-500/10 border border-orange-500/20" :
                      seg.type === "dump" ? "bg-red-500/10 border border-red-500/20" :
                      seg.type === "yard_depart" ? "bg-emerald-500/10 border border-emerald-500/20" :
                      seg.type === "yard_return" ? "bg-emerald-500/10 border border-emerald-500/20" :
                      seg.type === "lunch" ? "bg-amber-500/10 border border-amber-500/20" :
                      "bg-white/5 border border-white/5"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      seg.type === "drop" ? "bg-blue-500/30 text-blue-300" :
                      seg.type === "pickup" ? "bg-orange-500/30 text-orange-300" :
                      seg.type === "dump" ? "bg-red-500/30 text-red-300" :
                      seg.type === "yard_depart" || seg.type === "yard_return" ? "bg-emerald-500/30 text-emerald-300" :
                      seg.type === "lunch" ? "bg-amber-500/30 text-amber-300" :
                      "bg-white/10 text-tippd-ash"
                    )}>
                      {seg.type === "drop" ? "↓" :
                       seg.type === "pickup" ? "↑" :
                       seg.type === "dump" ? "🏭" :
                       seg.type === "yard_depart" ? "🟢" :
                       seg.type === "yard_return" ? "🏠" :
                       seg.type === "lunch" ? "☕" : i}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "font-medium truncate block",
                        seg.type === "drop" ? "text-blue-300" :
                        seg.type === "pickup" ? "text-orange-300" :
                        seg.type === "dump" ? "text-red-300" :
                        seg.type === "yard_depart" || seg.type === "yard_return" ? "text-emerald-300" :
                        seg.type === "lunch" ? "text-amber-300" :
                        "text-tippd-smoke"
                      )}>
                        {seg.customer_name || seg.label}
                      </span>
                      {seg.decision_reason && (
                        <span className="text-[10px] text-purple-400 italic block truncate">{seg.decision_reason}</span>
                      )}
                    </div>

                    <div className="shrink-0 text-right text-tippd-ash">
                      {seg.planned_drive_miles > 0 && <span>{seg.planned_drive_miles}mi</span>}
                      {seg.planned_drive_miles > 0 && seg.planned_total_minutes > 0 && <span> · </span>}
                      {seg.planned_total_minutes > 0 && <span>{seg.planned_total_minutes}m</span>}
                    </div>

                    {seg.box_size && (
                      <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-white/5 text-tippd-smoke">{seg.box_size}</span>
                    )}
                    {seg.box_reused && <span className="shrink-0 text-emerald-400 font-bold" title="Box reused">♻</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Over-capacity warning */}
            {isOverCapacity && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-300">
                  This route exceeds 8 hours by <strong>{Math.floor(overtimeMinutes / 60)}h {overtimeMinutes % 60}m</strong>.
                  Consider moving {Math.ceil(overtimeMinutes / 40)} jobs to the other truck or another day.
                </span>
              </div>
            )}

            {/* Yard Start */}
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-tippd-ash mb-1">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MapPin className="w-3 h-3" />
              </div>
              <span>Yard — {YARD.address.split(",")[0]}</span>
            </div>

            {truckJobs.length === 0 ? (
              <p className="text-sm text-tippd-ash py-6 text-center border border-dashed border-white/10 rounded-lg">
                No jobs assigned. Click &quot;Add Job&quot; to start building the route.
              </p>
            ) : (
              <div className="space-y-1">
                {truckJobs.map((job, i) => {
                  const size = job.dumpster_size || deriveDumpsterSize(job.dumpster_unit_number);
                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all relative group",
                        selectedJobId === job.id
                          ? "border-tippd-blue bg-tippd-blue/10"
                          : "border-white/10 bg-tippd-charcoal hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {/* Move Up/Down */}
                        <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                          <button
                            onClick={() => moveJob(job.id, "up")}
                            disabled={i === 0}
                            className="w-5 h-5 rounded bg-white/5 text-tippd-ash hover:text-white hover:bg-white/10 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-tippd-ash transition-colors"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveJob(job.id, "down")}
                            disabled={i === truckJobs.length - 1}
                            className="w-5 h-5 rounded bg-white/5 text-tippd-ash hover:text-white hover:bg-white/10 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-tippd-ash transition-colors"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Stop Number */}
                        <span className="w-6 h-6 rounded-full bg-white/10 text-tippd-ash text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>

                        {/* Job Info */}
                        <button
                          onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{job.customer_name}</p>
                              <p className="text-xs text-tippd-ash flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{job.drop_address.split(",")[0]}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={cn("text-xs font-medium", getStatusColor(job.status))}>
                                {getJobType(job) === "pickup" ? "\u2191 Pickup" : "\u2193 Drop"}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                {job.dumpster_unit_number && (
                                  <span className="text-[10px] text-tippd-ash font-mono">{job.dumpster_unit_number}</span>
                                )}
                                <span className="text-[10px] px-1 py-0.5 rounded bg-white/5 text-tippd-smoke font-medium">
                                  {size}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Remove X */}
                      <button
                        onClick={(e) => { e.stopPropagation(); initiateRemove(job); }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
                        title="Remove from route"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Yard End */}
            {truckJobs.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-tippd-ash mt-1">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-3 h-3" />
                </div>
                <span>Return to Yard</span>
              </div>
            )}
          </div>

          {/* ── Unassigned Jobs ── */}
          {unassigned.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-orange-400 uppercase tracking-wide mb-2">
                Unassigned ({unassigned.length})
              </h3>
              <div className="space-y-1.5">
                {unassigned.map((job) => {
                  const size = job.dumpster_size || deriveDumpsterSize(job.dumpster_unit_number);
                  return (
                    <div
                      key={job.id}
                      className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-start justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{job.customer_name}</p>
                        <p className="text-xs text-tippd-ash truncate">{job.drop_address.split(",")[0]}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-xs font-medium", getStatusColor(job.status))}>
                            {getJobType(job) === "pickup" ? "\u2191 Pickup" : "\u2193 Drop"}
                          </span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-white/5 text-tippd-smoke">{size}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          addJobToRoute(job, -1);
                        }}
                        disabled={!selectedTruck}
                        className="px-2.5 py-1 bg-tippd-blue text-white text-xs rounded font-medium hover:opacity-90 disabled:opacity-40 shrink-0 ml-2"
                      >
                        + Assign
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Pending Approval ── */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-2">
                Pending Approval ({pending.length})
              </h3>
              <div className="space-y-1.5">
                {pending.map((job) => (
                  <div key={job.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <p className="text-sm font-medium text-white">{job.customer_name}</p>
                    <p className="text-xs text-tippd-ash">{job.drop_address.split(",")[0]}</p>
                    <p className="text-xs text-amber-400 mt-1">${job.base_rate} — {job.job_type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Map / Fallback ── */}
        <div className="flex-1 rounded-lg overflow-hidden border border-white/10">
          {mapError ? (
            /* Fallback: list view of route stops */
            <div className="h-full bg-tippd-charcoal p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Route List View
                </h3>
                <button
                  onClick={() => setMapError(false)}
                  className="text-xs text-tippd-blue hover:underline"
                >
                  Retry Map
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-tippd-smoke">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">Y</span>
                  <span>{YARD.address}</span>
                </div>
                {truckJobs.filter((j) => j.drop_lat && j.drop_lng).map((job, i, arr) => {
                  const prevLat = i === 0 ? YARD.lat : arr[i - 1].drop_lat!;
                  const prevLng = i === 0 ? YARD.lng : arr[i - 1].drop_lng!;
                  const dist = haversineDistance(prevLat, prevLng, job.drop_lat!, job.drop_lng!);
                  return (
                    <div key={job.id}>
                      <div className="text-[10px] text-tippd-ash pl-8 py-0.5">&darr; {dist.toFixed(1)} mi</div>
                      <div className="flex items-center gap-3 text-sm text-tippd-smoke">
                        <span className="w-6 h-6 rounded-full bg-white/10 text-tippd-ash text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-white">{job.customer_name}</span>
                          <span className="text-tippd-ash ml-2">{job.drop_address.split(",")[0]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {truckJobs.length > 0 && (
                  <>
                    <div className="text-[10px] text-tippd-ash pl-8 py-0.5">
                      &darr; {(() => {
                        const last = truckJobs.filter((j) => j.drop_lat && j.drop_lng).at(-1);
                        if (!last) return "0.0";
                        return haversineDistance(last.drop_lat!, last.drop_lng!, YARD.lat, YARD.lng).toFixed(1);
                      })()} mi
                    </div>
                    <div className="flex items-center gap-3 text-sm text-tippd-smoke">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">Y</span>
                      <span>Return to Yard</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <ErrorBoundaryMap
              onError={() => setMapError(true)}
              yard={YARD}
              jobs={mapJobs}
              transferStations={mapTransferStations}
              routePath={draftRoutePath}
              truckLocations={truckLocations}
              selectedJobId={selectedJobId}
              onJobClick={(id: string) => setSelectedJobId(selectedJobId === id ? null : id)}
            />
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
         Floating Draft Bar
         ═══════════════════════════════════════════════════════════════════ */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-tippd-charcoal border border-white/15 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 text-sm text-white">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-medium">{draftChanges.length} change{draftChanges.length !== 1 ? "s" : ""} pending</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={saveDraft}
            disabled={saving}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
          <button
            onClick={revertDraft}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revert
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         Add Job Modal
         ═══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowAddModal(false); setAddTargetJob(null); setAddImpact(null); }}
        >
          <div
            className="bg-tippd-charcoal border border-white/10 rounded-xl p-6 w-full max-w-xl mx-4 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Add Job to {trucks.find((t) => t.id === selectedTruck)?.name}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setAddTargetJob(null); setAddImpact(null); }}
                className="text-tippd-ash hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1">
              {([
                { key: "unassigned" as AddModalTab, label: "Unassigned", count: unassigned.length },
                { key: "other_trucks" as AddModalTab, label: "Other Trucks", count: otherTruckJobs.length },
                { key: "all_jobs" as AddModalTab, label: "All Jobs", count: allActiveJobs.length },
                { key: "new_job" as AddModalTab, label: "New Job", count: null },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setAddModalTab(tab.key); setAddTargetJob(null); setAddImpact(null); }}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors",
                    addModalTab === tab.key
                      ? "bg-white/10 text-white"
                      : "text-tippd-ash hover:text-white"
                  )}
                >
                  {tab.label}
                  {tab.count !== null && <span className="ml-1 text-tippd-ash">({tab.count})</span>}
                </button>
              ))}
            </div>

            {/* Insert Position Picker */}
            {addModalTab !== "new_job" && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-tippd-ash">Insert at position:</span>
                <select
                  value={addInsertPosition}
                  onChange={(e) => setAddInsertPosition(parseInt(e.target.value))}
                  className="bg-white/5 border border-white/10 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-tippd-blue"
                >
                  <option value={-1}>End of route</option>
                  {Array.from({ length: truckJobs.length + 1 }, (_, i) => (
                    <option key={i} value={i}>
                      Position {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Impact analysis (when a job is selected) */}
            {addTargetJob && addImpact && addModalTab !== "new_job" && (
              <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">Impact Analysis</span>
                </div>
                <p className="text-sm text-white mb-1">
                  Adding <span className="font-bold">{addTargetJob.customer_name}</span>
                  {addInsertPosition >= 0 && (
                    <span className="text-tippd-ash"> at position {addInsertPosition + 1}</span>
                  )}
                </p>
                <ImpactBadge impact={addImpact} />
                {addImpact.affectedCustomers.length > 0 && (
                  <p className="text-xs text-amber-400 flex items-center gap-1 mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    {addImpact.affectedCustomers.join(", ")}&apos;s window may be affected
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => addJobToRoute(addTargetJob, addInsertPosition)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Confirm Add
                  </button>
                  <button
                    onClick={() => { setAddTargetJob(null); setAddImpact(null); }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {addModalTab === "new_job" ? (
                /* ── New Job Form ── */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-tippd-ash block mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newJobForm.customer_name}
                      onChange={(e) => setNewJobForm((f) => ({ ...f, customer_name: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-tippd-ash block mb-1">Phone</label>
                    <input
                      type="text"
                      value={newJobForm.customer_phone}
                      onChange={(e) => setNewJobForm((f) => ({ ...f, customer_phone: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-tippd-ash block mb-1">Address *</label>
                    <input
                      type="text"
                      value={newJobForm.drop_address}
                      onChange={(e) => setNewJobForm((f) => ({ ...f, drop_address: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
                      placeholder="123 Main St, Somerville, NJ"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-tippd-ash block mb-1">Dumpster Size</label>
                      <select
                        value={newJobForm.size}
                        onChange={(e) => setNewJobForm((f) => ({ ...f, size: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
                      >
                        <option value="10yd">10 Yard</option>
                        <option value="20yd">20 Yard</option>
                        <option value="30yd">30 Yard</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-tippd-ash block mb-1">Job Type</label>
                      <select
                        value={newJobForm.job_type}
                        onChange={(e) => setNewJobForm((f) => ({ ...f, job_type: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
                      >
                        <option value="delivery">Delivery</option>
                        <option value="pickup">Pickup</option>
                        <option value="swap">Swap</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={createNewJob}
                    disabled={!newJobForm.customer_name || !newJobForm.drop_address || newJobSaving}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 mt-2"
                  >
                    {newJobSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create &amp; Add to Route
                  </button>
                </div>
              ) : (
                /* ── Job List (Unassigned / Other Trucks / All) ── */
                <div className="space-y-1.5">
                  {(() => {
                    let list: Job[] = [];
                    if (addModalTab === "unassigned") list = unassigned;
                    else if (addModalTab === "other_trucks") list = otherTruckJobs;
                    else list = allActiveJobs.filter((j) => j.truck_id !== selectedTruck);

                    // Filter out jobs without geo for route impact calculation
                    const geoList = list.filter((j) => j.drop_lat && j.drop_lng);
                    const noGeoList = list.filter((j) => !j.drop_lat || !j.drop_lng);

                    if (list.length === 0) {
                      return (
                        <p className="text-sm text-tippd-ash text-center py-6">
                          No available jobs in this category.
                        </p>
                      );
                    }

                    return (
                      <>
                        {geoList.map((job) => {
                          const size = job.dumpster_size || deriveDumpsterSize(job.dumpster_unit_number);
                          return (
                            <button
                              key={job.id}
                              onClick={() => selectJobToAdd(job)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg border transition-all",
                                addTargetJob?.id === job.id
                                  ? "border-emerald-500/40 bg-emerald-500/10"
                                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white">{job.customer_name}</p>
                                  <p className="text-xs text-tippd-ash mt-0.5 truncate">{job.drop_address.split(",")[0]}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={cn("text-xs font-medium", getStatusColor(job.status))}>
                                      {getStatusLabel(job.status)}
                                    </span>
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-white/5 text-tippd-smoke">{size}</span>
                                    {job.truck_name && (
                                      <span className="text-xs text-tippd-ash">
                                        on {job.truck_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-tippd-ash shrink-0">
                                  {getJobType(job) === "pickup" ? "\u2191 PU" : "\u2193 DR"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                        {noGeoList.length > 0 && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-xs text-tippd-ash mb-1.5">Missing coordinates (cannot calculate route impact):</p>
                            {noGeoList.map((job) => (
                              <button
                                key={job.id}
                                onClick={() => selectJobToAdd(job)}
                                className={cn(
                                  "w-full text-left p-2.5 rounded-lg border transition-all mb-1",
                                  addTargetJob?.id === job.id
                                    ? "border-emerald-500/40 bg-emerald-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                                )}
                              >
                                <p className="text-sm text-white">{job.customer_name}</p>
                                <p className="text-xs text-tippd-ash">{job.drop_address.split(",")[0]}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         Remove Job Confirm Modal
         ═══════════════════════════════════════════════════════════════════ */}
      {removeTarget && removeImpact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setRemoveTarget(null); setRemoveImpact(null); }}
        >
          <div
            className="bg-tippd-charcoal border border-white/10 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Minus className="w-5 h-5 text-red-400" />
                Remove from Route
              </h3>
              <button
                onClick={() => { setRemoveTarget(null); setRemoveImpact(null); }}
                className="text-tippd-ash hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 mb-4">
              <p className="text-sm text-white mb-2">
                Remove <span className="font-bold">{removeTarget.customer_name}</span> from route?
              </p>
              <ImpactBadge impact={removeImpact} />
              <p className="text-xs text-amber-400 flex items-center gap-1 mt-2">
                <AlertTriangle className="w-3 h-3" />
                Job will go back to unassigned
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => removeJobFromRoute(removeTarget)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
              <button
                onClick={() => { setRemoveTarget(null); setRemoveImpact(null); }}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Error Boundary for Map (catches Google Maps crashes)
   ═══════════════════════════════════════════════════════════════════════════ */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface MapWrapperProps {
  onError: () => void;
  yard: { lat: number; lng: number; address: string };
  jobs: any[];
  transferStations: any[];
  routePath?: Array<{ lat: number; lng: number }>;
  truckLocations?: TruckLocation[];
  selectedJobId?: string | null;
  onJobClick?: (id: string) => void;
}

interface MapWrapperState {
  hasError: boolean;
}

class ErrorBoundaryMap extends Component<MapWrapperProps, MapWrapperState> {
  constructor(props: MapWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapWrapperState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    const { onError, ...mapProps } = this.props;
    return <DispatchMap {...mapProps} />;
  }
}
