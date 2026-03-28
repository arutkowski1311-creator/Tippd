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

  // Computed values
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
          <p className="text-sm text-gray-500">
            No segments or jobs have been assigned for today. Check back later or contact dispatch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
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
                onClick={() => { setSelectedTruck(t.id); setTimeout(loadRoute, 300); }}
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
          const isTappable = !isCompleted && isJobSegment && seg.job_id;
          const href = isTappable ? `/driver/job/${seg.job_id}` : null;

          return (
            <div
              key={seg.id}
              onClick={() => {
                if (href) router.push(href);
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
