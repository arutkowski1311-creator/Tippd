"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  Box,
  ChevronRight,
  CheckCircle,
  Truck,
  Coffee,
  RotateCcw,
  ArrowDown,
  ArrowUp,
  Factory,
  Recycle,
  Navigation,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───

interface RouteSegmentRow {
  id: string;
  sequence_number: number;
  type: "yard_depart" | "drop" | "pickup" | "dump" | "yard_return" | "lunch" | "reposition";
  job_id?: string;
  dump_location_id?: string;
  label: string;
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
  planned_drive_minutes?: number;
  planned_stop_minutes?: number;
  planned_total_minutes?: number;
  planned_drive_miles?: number;
  status: "pending" | "active" | "completed" | "skipped";
  arrived_at?: string;
  completed_at?: string;
  photos?: string[];
  weight_lbs?: number;
  condition_grade?: string;
  notes?: string;
}

// ─── Segment Icon/Color helpers ───

function segmentIcon(type: string) {
  switch (type) {
    case "yard_depart":
      return <Truck className="w-5 h-5" />;
    case "drop":
      return <ArrowDown className="w-5 h-5" />;
    case "pickup":
      return <ArrowUp className="w-5 h-5" />;
    case "dump":
      return <Factory className="w-5 h-5" />;
    case "lunch":
      return <Coffee className="w-5 h-5" />;
    case "reposition":
      return <RotateCcw className="w-5 h-5" />;
    case "yard_return":
      return <Truck className="w-5 h-5" />;
    default:
      return <MapPin className="w-5 h-5" />;
  }
}

function segmentColor(type: string, status: string) {
  if (status === "completed") return "bg-gray-100 text-gray-400";
  if (status === "active") {
    switch (type) {
      case "yard_depart":
        return "bg-emerald-500 text-white";
      case "drop":
        return "bg-blue-500 text-white";
      case "pickup":
        return "bg-amber-500 text-white";
      case "dump":
        return "bg-red-500 text-white";
      case "lunch":
        return "bg-orange-400 text-white";
      case "reposition":
        return "bg-purple-500 text-white";
      case "yard_return":
        return "bg-emerald-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }
  // pending
  switch (type) {
    case "yard_depart":
      return "bg-emerald-100 text-emerald-700";
    case "drop":
      return "bg-blue-100 text-blue-700";
    case "pickup":
      return "bg-amber-100 text-amber-700";
    case "dump":
      return "bg-red-100 text-red-700";
    case "lunch":
      return "bg-orange-100 text-orange-700";
    case "reposition":
      return "bg-purple-100 text-purple-700";
    case "yard_return":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function segmentBorderColor(type: string) {
  switch (type) {
    case "yard_depart":
      return "border-emerald-400";
    case "drop":
      return "border-blue-400";
    case "pickup":
      return "border-amber-400";
    case "dump":
      return "border-red-400";
    case "lunch":
      return "border-orange-400";
    case "reposition":
      return "border-purple-400";
    case "yard_return":
      return "border-emerald-400";
    default:
      return "border-gray-400";
  }
}

function segmentTypeLabel(type: string) {
  switch (type) {
    case "yard_depart":
      return "Yard Depart";
    case "drop":
      return "Drop-off";
    case "pickup":
      return "Pickup";
    case "dump":
      return "Dump";
    case "lunch":
      return "Lunch";
    case "reposition":
      return "Reposition";
    case "yard_return":
      return "Yard Return";
    default:
      return type;
  }
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Main Component ───

export default function DriverRoute() {
  const router = useRouter();
  const [segments, setSegments] = useState<RouteSegmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("Driver");
  const [routeDate, setRouteDate] = useState("");
  const [trucks, setTrucks] = useState<Array<{ id: string; name: string; plate: string }>>([]);
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null);
  const [showTruckPicker, setShowTruckPicker] = useState(false);

  // Skip detection state
  const [skipWarning, setSkipWarning] = useState<{
    tappedSeg: RouteSegmentRow;
    skippedSegs: RouteSegmentRow[];
    pendingHref: string | null;
    pendingAction: (() => void) | null;
  } | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [skipSubmitting, setSkipSubmitting] = useState(false);

  const gpsRef = useRef<number | null>(null);
  const lastGpsUpdate = useRef<number>(0);

  // Load route data
  const loadRoute = useCallback(async (truckId?: string | null) => {
    const tid = truckId ?? selectedTruck;
    try {
      setLoading(true);
      const truckParam = tid ? `?truck_id=${tid}` : "";
      const res = await fetch(`/api/driver/route${truckParam}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/driver/login");
          return;
        }
        throw new Error("Failed to load route");
      }
      const data = await res.json();
      setSegments(data.segments || []);
      setDriverName(data.driver_name || "Driver");
      setRouteDate(data.date || new Date().toISOString().split("T")[0]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router, selectedTruck]);

  // Load trucks on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trucks");
        if (res.ok) {
          const data = await res.json();
          const activeTrucks = (Array.isArray(data) ? data : []).filter((t: any) => t.status === "active");
          setTrucks(activeTrucks);
          if (activeTrucks.length > 0) {
            setSelectedTruck(activeTrucks[0].id);
            localStorage.setItem("selectedTruckId", activeTrucks[0].id);
          }
        }
      } catch {}
    })();
  }, []);

  // Reload route when truck changes
  useEffect(() => {
    if (selectedTruck) {
      loadRoute(selectedTruck);
    }
  }, [selectedTruck]);

  // GPS tracking — send position every 30s
  useEffect(() => {
    if (!navigator.geolocation) return;

    const activeSegment = segments.find((s) => s.status === "active");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        // Throttle to every 30 seconds
        if (now - lastGpsUpdate.current < 30000) return;
        lastGpsUpdate.current = now;

        fetch("/api/driver/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            status: activeSegment ? "on_route" : "offline",
            segment_id: activeSegment?.id || null,
          }),
        }).catch(() => {
          // Silently fail GPS updates
        });
      },
      () => {
        // GPS error — silently ignore
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    gpsRef.current = watchId;
    return () => {
      if (gpsRef.current !== null) {
        navigator.geolocation.clearWatch(gpsRef.current);
      }
    };
  }, [segments]);

  // ─── Skip detection ───

  /**
   * Call this instead of navigating directly to a segment.
   * Checks if there are incomplete stops before the tapped segment.
   * If so, shows a warning modal requiring a reason before proceeding.
   */
  function tryNavigateToSegment(seg: RouteSegmentRow, href: string | null, inlineAction?: () => void) {
    // Find stops that are BEFORE this segment in sequence and still pending/active
    // Only count job stops (drop/pickup) — dump/yard/lunch don't count as "skippable"
    const skippedBefore = segments.filter(
      (s) =>
        s.sequence_number < seg.sequence_number &&
        (s.type === "drop" || s.type === "pickup") &&
        s.status !== "completed" &&
        s.status !== "skipped" &&
        s.id !== seg.id
    );

    if (skippedBefore.length === 0) {
      // No skipped stops — proceed normally
      if (href) router.push(href);
      else if (inlineAction) inlineAction();
      return;
    }

    // Show skip warning modal
    setSkipWarning({
      tappedSeg: seg,
      skippedSegs: skippedBefore,
      pendingHref: href,
      pendingAction: inlineAction || null,
    });
    setSkipReason("");
  }

  async function confirmSkip() {
    if (!skipWarning || !skipReason.trim()) return;
    setSkipSubmitting(true);

    try {
      const { tappedSeg, skippedSegs, pendingHref, pendingAction } = skipWarning;

      // Calculate rough cascade time impact
      const skippedMinutes = skippedSegs.reduce(
        (sum, s) => sum + (s.planned_total_minutes || 0),
        0
      );
      const skippedNames = skippedSegs.map((s) => s.customer_name || s.label).join(", ");

      // Post route_conflict action item for owner
      await fetch("/api/driver/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exception_type: "other",
          title: `⚠️ Out-of-order stop — skipped ahead to ${tappedSeg.customer_name || tappedSeg.label}`,
          description: [
            `Skipped: ${skippedNames}`,
            `Reason: ${skipReason.trim()}`,
            skippedMinutes > 0
              ? `Estimated cascade delay: ~${Math.round(skippedMinutes)} min across ${skippedSegs.length} stop${skippedSegs.length > 1 ? "s" : ""}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          job_id: tappedSeg.job_id || undefined,
          segment_id: tappedSeg.id,
        }),
      });

      // Navigate
      setSkipWarning(null);
      setSkipReason("");
      if (pendingHref) router.push(pendingHref);
      else if (pendingAction) pendingAction();
    } catch {
      // Non-fatal — still navigate
      setSkipWarning(null);
      if (skipWarning?.pendingHref) router.push(skipWarning.pendingHref);
      else if (skipWarning?.pendingAction) skipWarning.pendingAction();
    } finally {
      setSkipSubmitting(false);
    }
  }

  // ─── Computed values ───
  const completed = segments.filter((s) => s.status === "completed").length;
  const total = segments.length;
  const totalMiles = segments.reduce((s, seg) => s + (seg.planned_drive_miles || 0), 0);
  const totalMinutes = segments.reduce((s, seg) => s + (seg.planned_total_minutes || 0), 0);
  // Format today's date
  const dateStr = routeDate
    ? new Date(routeDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-tippd-blue mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading route...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-semibold mb-2">Error loading route</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            loadRoute();
          }}
          className="px-6 py-3 bg-tippd-blue text-white rounded-xl font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-6">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-700 mb-1">No Route Today</h2>
          <p className="text-sm text-gray-500 mb-2">
            No segments or jobs have been assigned for today. Check back later or contact dispatch.
          </p>
          {error && <p className="text-xs text-red-500">Error: {error}</p>}
          <p className="text-xs text-gray-400 mt-1">Trucks: {trucks.length} | Selected: {selectedTruck ? 'yes' : 'no'} | Segments: {segments.length}</p>
          {trucks.length === 0 && <p className="text-xs text-amber-500">No trucks loaded — auth or API issue</p>}
          <button onClick={() => loadRoute()} className="mt-3 px-4 py-2 bg-tippd-blue text-white rounded-lg text-sm font-semibold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───

  const SKIP_REASONS = [
    "Customer not ready",
    "Traffic / road issue",
    "More efficient order",
    "Dispatcher request",
    "Wrong address — need to confirm",
    "Other",
  ];

  return (
    <div className="p-4 pb-24">

      {/* ── Skip-ahead warning modal ── */}
      {skipWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-3">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-base leading-tight">Skipping ahead?</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {skipWarning.skippedSegs.length === 1
                    ? `1 stop before this one hasn't been completed.`
                    : `${skipWarning.skippedSegs.length} stops before this one haven't been completed.`}
                </p>
              </div>
              <button
                onClick={() => { setSkipWarning(null); setSkipReason(""); }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 active:bg-gray-100 mt-0.5"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 pt-4 pb-5">
              {/* Skipped stop list */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Stops being skipped:
                </p>
                <div className="space-y-1.5">
                  {skipWarning.skippedSegs.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                        {s.customer_name || s.label}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {s.type === "drop" ? "Drop" : "Pickup"}
                      </span>
                    </div>
                  ))}
                </div>
                {skipWarning.skippedSegs.reduce((sum, s) => sum + (s.planned_total_minutes || 0), 0) > 0 && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    ⏱ ~{Math.round(skipWarning.skippedSegs.reduce((sum, s) => sum + (s.planned_total_minutes || 0), 0))} min of schedule disruption
                  </p>
                )}
              </div>

              {/* Reason selection */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Why are you skipping ahead?
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SKIP_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSkipReason(r)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border-2 text-xs font-semibold text-left leading-tight transition-all active:scale-95",
                      skipReason === r
                        ? "border-amber-500 bg-amber-50 text-amber-800"
                        : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <button
                onClick={confirmSkip}
                disabled={!skipReason || skipSubmitting}
                className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-bold text-sm active:opacity-80 disabled:opacity-40 mb-2"
              >
                {skipSubmitting ? "Logging..." : `Proceed to ${skipWarning.tappedSeg.customer_name || skipWarning.tappedSeg.label}`}
              </button>
              <button
                onClick={() => { setSkipWarning(null); setSkipReason(""); }}
                className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm active:bg-gray-50"
              >
                Go Back — Follow Route Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Truck Picker */}
      {trucks.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">{driverName}</span>
          <span className="text-gray-300">—</span>
          <div className="flex gap-2 flex-1">
            {trucks.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTruck(t.id); localStorage.setItem("selectedTruckId", t.id); setTimeout(loadRoute, 300); }}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-colors text-center",
                  selectedTruck === t.id
                    ? "bg-tippd-blue text-white"
                    : "bg-gray-100 text-gray-600 active:bg-gray-200"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Route summary header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">{dateStr}</p>
          </div>
          <span className="text-sm font-bold text-tippd-blue">
            {completed}/{total} done
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-gray-200 rounded-full mb-3">
          <div
            className="h-2.5 bg-tippd-blue rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>

        {/* Route totals */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {Math.round(totalMiles)} mi total
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            ~{formatMinutes(totalMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <Box className="w-3 h-3" />
            {segments.filter((s) => s.type === "drop" || s.type === "pickup").length} stops
          </span>
        </div>
      </div>

      {/* Segment list */}
      <div className="space-y-2">
        {segments.map((seg) => {
          const isActive = seg.status === "active";
          const isCompleted = seg.status === "completed";

          // Build the href for tappable segments
          const isJobSegment = seg.type === "drop" || seg.type === "pickup";
          const isDumpSegment = seg.type === "dump";
          const isYardSegment = seg.type === "yard_return" || seg.type === "yard_depart";
          const isLunchSegment = seg.type === "lunch";
          // Always tappable for any active segment type (use segment ID, not job_id, to avoid null issues)
          const isTappable = !isCompleted && (isJobSegment || isDumpSegment || isYardSegment || isLunchSegment);
          const href = isJobSegment ? `/driver/job/${seg.id}` : null;

          return (
            <div
              key={seg.id}
              onClick={() => {
                if (!isTappable || isCompleted) return;

                if (href) {
                  // Job stop — check skip order first
                  tryNavigateToSegment(seg, href, undefined);
                } else if (isDumpSegment) {
                  router.push(`/driver/job/${seg.id}?type=dump&job_id=${seg.job_id || ''}`);
                } else if (isYardSegment || isLunchSegment) {
                  // Quick complete — just mark done (no skip check needed for non-customer stops)
                  fetch(`/api/driver/segment/${seg.id}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: seg.type }),
                  })
                    .then((res) => { if (res.ok) loadRoute(selectedTruck); })
                    .catch((e) => console.error('Failed to complete segment:', e));
                }
              }}
              className={cn(
                "rounded-xl border-2 p-4 transition-all",
                isActive
                  ? `${segmentBorderColor(seg.type)} bg-white shadow-md ring-2 ring-offset-1 ring-blue-200`
                  : isCompleted
                  ? "border-gray-100 bg-gray-50 opacity-50"
                  : "border-gray-200 bg-white",
                href && "cursor-pointer active:bg-gray-50"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon circle */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
                    isCompleted
                      ? "bg-gray-100 text-gray-400"
                      : segmentColor(seg.type, seg.status)
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    segmentIcon(seg.type)
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {/* Type badge + reuse icon */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                            isCompleted
                              ? "bg-gray-200 text-gray-500"
                              : seg.type === "drop"
                              ? "bg-blue-100 text-blue-700"
                              : seg.type === "pickup"
                              ? "bg-amber-100 text-amber-700"
                              : seg.type === "dump"
                              ? "bg-red-100 text-red-700"
                              : seg.type === "lunch"
                              ? "bg-orange-100 text-orange-700"
                              : seg.type === "reposition"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {segmentTypeLabel(seg.type)}
                        </span>
                        {seg.box_reused && (
                          <span className="flex items-center gap-0.5 text-emerald-600" title="Box reused">
                            <Recycle className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {isActive && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                          </span>
                        )}
                      </div>

                      {/* Name / Label */}
                      <p
                        className={cn(
                          "font-semibold text-[15px] leading-tight",
                          isCompleted ? "text-gray-400 line-through" : "text-gray-900"
                        )}
                      >
                        {seg.customer_name || seg.label}
                      </p>

                      {/* Address */}
                      {seg.to_address && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <p className="text-xs text-gray-500 truncate">{seg.to_address}</p>
                        </div>
                      )}

                      {/* Box info */}
                      {seg.box_size && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Box className="w-3 h-3" />
                            {seg.box_size}
                          </span>
                          {seg.box_condition && (
                            <span
                              className={cn(
                                "text-xs font-medium px-1.5 py-0.5 rounded",
                                seg.box_condition === "A" || seg.box_condition === "B"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : seg.box_condition === "C"
                                  ? "bg-amber-100 text-amber-700"
                                  : seg.box_condition === "D"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                              )}
                            >
                              Grade {seg.box_condition}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: timing + chevron */}
                    <div className="flex flex-col items-end shrink-0">
                      {(seg.planned_drive_minutes || seg.planned_stop_minutes) ? (
                        <div className="text-right">
                          {seg.planned_drive_minutes ? (
                            <p className="text-xs text-gray-400">
                              {Math.round(seg.planned_drive_minutes)}m drive
                            </p>
                          ) : null}
                          {seg.planned_stop_minutes ? (
                            <p className="text-xs text-gray-400">
                              {Math.round(seg.planned_stop_minutes)}m stop
                            </p>
                          ) : null}
                          <p className="text-xs font-medium text-gray-600">
                            {formatMinutes(seg.planned_total_minutes || 0)}
                          </p>
                        </div>
                      ) : null}
                      {href && (
                        <ChevronRight className="w-5 h-5 text-gray-300 mt-1" />
                      )}
                    </div>
                  </div>

                  {/* Decision reason (if any) */}
                  {seg.decision_reason && !isCompleted && (
                    <p className="text-[11px] text-purple-600 mt-1 italic">
                      {seg.decision_reason}
                    </p>
                  )}

                  {/* Inline action buttons for non-job segments */}
                  {isActive && !href && seg.type === "dump" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (seg.job_id) {
                            await fetch(`/api/jobs/${seg.job_id}/status`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "dump_complete" }),
                            });
                          }
                          // Mark this segment as completed in local state
                          setSegments((prev) => prev.map((s) =>
                            s.id === seg.id ? { ...s, status: "completed" as const } : s
                          ));
                          // Mark next segment as active
                          setSegments((prev) => {
                            const idx = prev.findIndex((s) => s.id === seg.id);
                            if (idx >= 0 && idx < prev.length - 1) {
                              return prev.map((s, i) => i === idx + 1 ? { ...s, status: "active" as const } : s);
                            }
                            return prev;
                          });
                        }}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm active:bg-red-700"
                      >
                        ✓ Dump Complete
                      </button>
                    </div>
                  )}
                  {isActive && seg.type === "yard_return" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setSegments((prev) => prev.map((s) =>
                            s.id === seg.id ? { ...s, status: "completed" as const } : s
                          ));
                          router.push("/driver/complete");
                        }}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm active:bg-emerald-700"
                      >
                        ✓ Day Complete — Back at Yard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
