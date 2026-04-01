"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, Clock, AlertTriangle, Map as MapIcon, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import type { FleetDumpster } from "@/components/fleet/FleetMap";

// Load map only client-side (Google Maps needs the window object)
const FleetMap = dynamic(() => import("@/components/fleet/FleetMap"), { ssr: false });

type Dumpster = {
  id: string;
  unit_number: string;
  size: string;
  status: string;
  condition_grade: string;
  current_job_id: string | null;
  repair_notes: string | null;
  created_at: string;
};

type JobInfo = {
  id: string;
  customer_name: string;
  drop_address: string;
  actual_drop_time: string | null;
  requested_pickup_start: string | null;
  status: string;
};

// ─── Status color mapping ───
// Green = available/in_yard, Yellow = deployed/active, Orange = overdue, Red = repair/retired
function getStatusColor(status: string, daysOut?: number | null) {
  const isOverdue = daysOut && daysOut > 7;

  if (isOverdue && (status === "deployed" || status === "assigned")) {
    return {
      border: "border-orange-500",
      bg: "bg-orange-500/15",
      dot: "bg-orange-500",
      text: "text-orange-400",
      label: `Overdue (${daysOut}d)`,
      stripe: "bg-gradient-to-r from-orange-500/20 to-transparent",
    };
  }

  switch (status) {
    case "available":
    case "in_yard":
      return {
        border: "border-emerald-500",
        bg: "bg-emerald-500/10",
        dot: "bg-emerald-500",
        text: "text-emerald-400",
        label: status === "in_yard" ? "In Yard" : "Available",
        stripe: "bg-gradient-to-r from-emerald-500/20 to-transparent",
      };
    case "deployed":
    case "assigned":
      return {
        border: "border-yellow-500",
        bg: "bg-yellow-500/10",
        dot: "bg-yellow-500",
        text: "text-yellow-400",
        label: status === "assigned" ? "Assigned" : "In Use",
        stripe: "bg-gradient-to-r from-yellow-500/20 to-transparent",
      };
    case "returning":
      return {
        border: "border-blue-500",
        bg: "bg-blue-500/10",
        dot: "bg-blue-500",
        text: "text-blue-400",
        label: "Returning",
        stripe: "bg-gradient-to-r from-blue-500/20 to-transparent",
      };
    case "repair":
      return {
        border: "border-red-500",
        bg: "bg-red-500/15",
        dot: "bg-red-500",
        text: "text-red-400",
        label: "Out of Service",
        stripe: "bg-gradient-to-r from-red-500/20 to-transparent",
      };
    case "retired":
      return {
        border: "border-red-700",
        bg: "bg-red-900/20",
        dot: "bg-red-700",
        text: "text-red-500",
        label: "Retired",
        stripe: "bg-gradient-to-r from-red-700/20 to-transparent",
      };
    default:
      return {
        border: "border-gray-500",
        bg: "bg-gray-500/10",
        dot: "bg-gray-500",
        text: "text-gray-400",
        label: status,
        stripe: "",
      };
  }
}

function getDaysOut(dropTime: string | null): number | null {
  if (!dropTime) return null;
  const diff = Date.now() - new Date(dropTime).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getGradeColor(grade: string) {
  switch (grade) {
    case "A": return "bg-emerald-500 text-white";
    case "B": return "bg-green-600 text-white";
    case "C": return "bg-yellow-500 text-black";
    case "D": return "bg-orange-500 text-white";
    case "F": return "bg-red-600 text-white";
    default: return "bg-gray-500 text-white";
  }
}

type StatusFilter = "all" | "available" | "in_use" | "overdue" | "repair";
type SortOption = "unit" | "soonest_back" | "longest_out" | "condition";
type ViewMode = "list" | "map";

export default function BoxesPage() {
  const [dumpsters, setDumpsters] = useState<Dumpster[]>([]);
  const [jobs, setJobs] = useState<Record<string, JobInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("unit");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Map data
  const [mapDumpsters, setMapDumpsters] = useState<FleetDumpster[]>([]);
  const [mapYard, setMapYard] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [mapTransferStations, setMapTransferStations] = useState<Array<{ id: string; lat: number; lng: number; name: string }>>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const mapLoadedRef = useRef(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get all dumpsters
      const { data: dumpsterData } = await supabase
        .from("dumpsters")
        .select("*")
        .order("unit_number");

      if (dumpsterData) {
        setDumpsters(dumpsterData);

        // Get active jobs for deployed dumpsters
        const deployedIds = dumpsterData
          .filter((d) => d.current_job_id)
          .map((d) => d.current_job_id!);

        if (deployedIds.length > 0) {
          const { data: jobData } = await supabase
            .from("jobs")
            .select("id, customer_name, drop_address, actual_drop_time, requested_pickup_start, status")
            .in("id", deployedIds);

          if (jobData) {
            const jobMap: Record<string, JobInfo> = {};
            jobData.forEach((j) => { jobMap[j.id] = j; });
            setJobs(jobMap);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load map data when switching to map view (lazy — only once)
  useEffect(() => {
    if (viewMode !== "map" || mapLoadedRef.current) return;
    mapLoadedRef.current = true;

    async function loadMapData() {
      setMapLoading(true);
      try {
        const supabase = createClient();

        // Dumpster locations (resolved lat/lng from API)
        const res = await fetch("/api/dumpsters/locations");
        if (res.ok) {
          const data = await res.json();
          setMapDumpsters(data);
        }

        // Yard info
        const { data: opData } = await supabase
          .from("operators")
          .select("yard_lat, yard_lng, yard_address")
          .single() as any;
        if (opData?.yard_lat && opData?.yard_lng) {
          setMapYard({ lat: opData.yard_lat, lng: opData.yard_lng, address: opData.yard_address || "Yard" });
        }

        // Transfer stations
        const { data: stations } = await supabase
          .from("dump_locations")
          .select("id, lat, lng, name")
          .eq("is_active", true) as any;
        if (stations) setMapTransferStations(stations);
      } catch {
        // Non-fatal
      } finally {
        setMapLoading(false);
      }
    }

    loadMapData();
    // Refresh map data every 60s while map is open
    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/dumpsters/locations");
        if (res.ok) setMapDumpsters(await res.json());
      } catch {}
    }, 60_000);
    return () => clearInterval(interval);
  }, [viewMode]);

  // Compute stats
  const stats = {
    available: dumpsters.filter((d) => d.status === "available" || d.status === "in_yard").length,
    inUse: dumpsters.filter((d) => d.status === "deployed" || d.status === "assigned").length,
    overdue: dumpsters.filter((d) => {
      if (d.status !== "deployed" && d.status !== "assigned") return false;
      const job = d.current_job_id ? jobs[d.current_job_id] : null;
      return job && getDaysOut(job.actual_drop_time) && getDaysOut(job.actual_drop_time)! > 7;
    }).length,
    repair: dumpsters.filter((d) => d.status === "repair" || d.status === "retired").length,
    total: dumpsters.length,
  };

  // Filter + search
  const filtered = dumpsters.filter((d) => {
    // Search
    if (search) {
      const q = search.toLowerCase();
      const job = d.current_job_id ? jobs[d.current_job_id] : null;
      const matchUnit = d.unit_number.toLowerCase().includes(q);
      const matchCustomer = job?.customer_name?.toLowerCase().includes(q);
      const matchAddress = job?.drop_address?.toLowerCase().includes(q);
      if (!matchUnit && !matchCustomer && !matchAddress) return false;
    }
    // Size filter
    if (sizeFilter !== "all" && d.size !== sizeFilter) return false;
    // Grade filter
    if (gradeFilter !== "all" && d.condition_grade !== gradeFilter) return false;
    // Status filter
    if (filter === "available" && d.status !== "available" && d.status !== "in_yard") return false;
    if (filter === "in_use" && d.status !== "deployed" && d.status !== "assigned") return false;
    if (filter === "repair" && d.status !== "repair" && d.status !== "retired") return false;
    if (filter === "overdue") {
      if (d.status !== "deployed" && d.status !== "assigned") return false;
      const job = d.current_job_id ? jobs[d.current_job_id] : null;
      const days = job ? getDaysOut(job.actual_drop_time) : null;
      if (!days || days <= 7) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const jobA = a.current_job_id ? jobs[a.current_job_id] : null;
    const jobB = b.current_job_id ? jobs[b.current_job_id] : null;

    switch (sortBy) {
      case "soonest_back": {
        // Dumpsters with pickup dates first, sorted by soonest
        const pickA = jobA?.requested_pickup_start ? new Date(jobA.requested_pickup_start).getTime() : Infinity;
        const pickB = jobB?.requested_pickup_start ? new Date(jobB.requested_pickup_start).getTime() : Infinity;
        return pickA - pickB;
      }
      case "longest_out": {
        // Dumpsters out the longest first
        const daysA = jobA?.actual_drop_time ? Date.now() - new Date(jobA.actual_drop_time).getTime() : 0;
        const daysB = jobB?.actual_drop_time ? Date.now() - new Date(jobB.actual_drop_time).getTime() : 0;
        return daysB - daysA;
      }
      case "condition": {
        // Worst condition first (F, D, C, B, A)
        const gradeOrder: Record<string, number> = { F: 0, D: 1, C: 2, B: 3, A: 4 };
        return (gradeOrder[a.condition_grade] ?? 5) - (gradeOrder[b.condition_grade] ?? 5);
      }
      default:
        return a.unit_number.localeCompare(b.unit_number);
    }
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-white/5 rounded w-32 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Boxes</h1>
          <p className="text-sm text-tippd-smoke mt-1">{stats.total} dumpsters</p>
        </div>
        <div className="flex items-center gap-2">
          {/* List / Map toggle */}
          <div className="flex gap-0.5 bg-tippd-steel rounded-md border border-white/10 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                viewMode === "list" ? "bg-tippd-blue text-white" : "text-tippd-ash hover:text-white"
              )}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                viewMode === "map" ? "bg-tippd-blue text-white" : "text-tippd-ash hover:text-white"
              )}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Status Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setFilter(filter === "available" ? "all" : "available")}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            filter === "available" ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/30" : "border-white/10 bg-tippd-charcoal hover:border-emerald-500/30"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-tippd-smoke">Available</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.available}</p>
        </button>

        <button
          onClick={() => setFilter(filter === "in_use" ? "all" : "in_use")}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            filter === "in_use" ? "border-yellow-500 bg-yellow-500/15 ring-1 ring-yellow-500/30" : "border-white/10 bg-tippd-charcoal hover:border-yellow-500/30"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs font-medium text-tippd-smoke">In Use</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.inUse}</p>
        </button>

        <button
          onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            filter === "overdue" ? "border-orange-500 bg-orange-500/15 ring-1 ring-orange-500/30" : "border-white/10 bg-tippd-charcoal hover:border-orange-500/30"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs font-medium text-tippd-smoke">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.overdue}</p>
        </button>

        <button
          onClick={() => setFilter(filter === "repair" ? "all" : "repair")}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            filter === "repair" ? "border-red-500 bg-red-500/15 ring-1 ring-red-500/30" : "border-white/10 bg-tippd-charcoal hover:border-red-500/30"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-tippd-smoke">Out of Service</span>
          </div>
          <p className="text-2xl font-bold text-white mt-1">{stats.repair}</p>
        </button>
      </div>

      {/* ── MAP VIEW ── */}
      {viewMode === "map" && (
        <div>
          {mapLoading ? (
            <div className="flex items-center justify-center" style={{ height: "480px" }}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-tippd-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-tippd-ash">Loading fleet map...</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-3 text-xs text-tippd-ash">
                {[
                  { color: "bg-emerald-500", label: "In Yard / Available" },
                  { color: "bg-blue-500", label: "At Customer" },
                  { color: "bg-orange-500", label: "In Transit / Staged" },
                  { color: "bg-red-500", label: "At Transfer Station" },
                  { color: "bg-gray-500", label: "Repair / Retired" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className={cn("w-3 h-3 rounded-sm shrink-0", color)} />
                    {label}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-white bg-transparent shrink-0" />
                  Empty
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-900 border border-white shrink-0" />
                  Full
                </span>
              </div>
              <FleetMap
                dumpsters={mapDumpsters}
                yard={mapYard}
                transferStations={mapTransferStations}
              />
              <p className="text-xs text-tippd-ash mt-2 text-center">
                Updates every 60 seconds · {mapDumpsters.filter(d => d.lat && d.lng).length} boxes with known location
                {mapDumpsters.filter(d => d.status === "staged").length > 0 && (
                  <span className="text-orange-400 font-semibold ml-2">
                    · {mapDumpsters.filter(d => d.status === "staged").length} staged outside gate ⚠️
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && <>

      {/* Search + Filters + Sort */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tippd-ash" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit #, customer, address..."
            className="w-full h-9 pl-9 pr-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm placeholder:text-tippd-ash outline-none focus:ring-1 focus:ring-tippd-blue"
          />
        </div>

        {/* Size */}
        <div className="flex gap-0.5 bg-tippd-steel rounded-md border border-white/10 p-0.5">
          {["all", "10yd", "20yd", "30yd"].map((s) => (
            <button
              key={s}
              onClick={() => setSizeFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                sizeFilter === s ? "bg-tippd-blue text-white" : "text-tippd-ash hover:text-white"
              )}
            >
              {s === "all" ? "All Sizes" : s}
            </button>
          ))}
        </div>

        {/* Condition Grade */}
        <div className="flex gap-0.5 bg-tippd-steel rounded-md border border-white/10 p-0.5">
          {["all", "A", "B", "C", "D", "F"].map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={cn(
                "w-7 py-1 rounded text-xs font-bold transition-colors text-center",
                gradeFilter === g ? "bg-tippd-blue text-white" :
                g === "all" ? "text-tippd-ash hover:text-white px-1.5 w-auto" :
                "text-tippd-ash hover:text-white"
              )}
            >
              {g === "all" ? "Grade" : g}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="h-9 px-2 rounded-md bg-tippd-steel border border-white/10 text-white text-xs outline-none focus:ring-1 focus:ring-tippd-blue"
        >
          <option value="unit">Sort: Unit #</option>
          <option value="soonest_back">Sort: Soonest Back</option>
          <option value="longest_out">Sort: Longest Out</option>
          <option value="condition">Sort: Worst Condition</option>
        </select>
      </div>

      {/* Results count + active filters */}
      <div className="flex items-center gap-2 text-xs text-tippd-ash mb-3 flex-wrap">
        <span>Showing {sorted.length} of {stats.total} dumpsters</span>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="px-2 py-0.5 rounded-full bg-white/10 text-tippd-smoke hover:bg-white/20 flex items-center gap-1">
            Status: {filter === "in_use" ? "In Use" : filter === "available" ? "Available" : filter === "overdue" ? "Overdue" : "Repair"} ✕
          </button>
        )}
        {sizeFilter !== "all" && (
          <button onClick={() => setSizeFilter("all")} className="px-2 py-0.5 rounded-full bg-white/10 text-tippd-smoke hover:bg-white/20 flex items-center gap-1">
            Size: {sizeFilter} ✕
          </button>
        )}
        {gradeFilter !== "all" && (
          <button onClick={() => setGradeFilter("all")} className="px-2 py-0.5 rounded-full bg-white/10 text-tippd-smoke hover:bg-white/20 flex items-center gap-1">
            Grade: {gradeFilter} ✕
          </button>
        )}
        {(filter !== "all" || sizeFilter !== "all" || gradeFilter !== "all") && (
          <button onClick={() => { setFilter("all"); setSizeFilter("all"); setGradeFilter("all"); }} className="text-tippd-blue hover:underline">
            Clear all
          </button>
        )}
      </div>

      {/* Dumpster List — Table-style rows */}
      <div className="space-y-1.5">
        {sorted.map((d) => {
          const job = d.current_job_id ? jobs[d.current_job_id] : null;
          const daysOut = job ? getDaysOut(job.actual_drop_time) : null;
          const sc = getStatusColor(d.status, daysOut);
          const shortAddr = job?.drop_address?.split(",")[0] || null;

          return (
            <Link
              key={d.id}
              href={`/dashboard/fleet/${d.id}`}
              className={cn(
                "flex items-center gap-2 sm:gap-3 rounded-lg border px-3 sm:px-4 py-2.5 transition-all hover:brightness-110",
                sc.border,
                sc.bg
              )}
            >
              {/* Status dot */}
              <div className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0", sc.dot)} />

              {/* Unit # + Status (combined on mobile) */}
              <div className="min-w-0 flex-1 sm:flex-none sm:w-20">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{d.unit_number}</p>
                  <p className="text-xs text-tippd-ash">{d.size}</p>
                </div>
                <span className={cn("text-xs font-semibold sm:hidden", sc.text)}>{sc.label}</span>
              </div>

              {/* Status label (hidden on mobile, shown inline above) */}
              <div className="hidden sm:block w-28 shrink-0">
                <span className={cn("text-sm font-semibold", sc.text)}>{sc.label}</span>
              </div>

              {/* Grade */}
              <span className={cn("w-6 h-6 rounded text-xs flex items-center justify-center font-bold shrink-0", getGradeColor(d.condition_grade))}>
                {d.condition_grade}
              </span>

              {/* Customer + Location — hidden on small mobile */}
              <div className="hidden sm:block flex-1 min-w-0">
                {job ? (
                  <div>
                    <p className="text-sm text-white truncate">{job.customer_name}</p>
                    <p className="text-xs text-tippd-ash truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {shortAddr}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-tippd-ash truncate">
                    {d.status === "repair" ? "Repair" : "Yard"}
                  </p>
                )}
              </div>

              {/* Days on site */}
              <div className="w-12 sm:w-20 text-right shrink-0">
                {daysOut !== null && (
                  <div className={cn("flex items-center justify-end gap-1 text-sm font-medium", daysOut > 7 ? "text-orange-400" : "text-tippd-smoke")}>
                    {daysOut > 7 && <AlertTriangle className="w-3.5 h-3.5" />}
                    <Clock className="w-3.5 h-3.5" />
                    {daysOut}d
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-tippd-ash">
          <p className="text-sm">No dumpsters match your filters.</p>
        </div>
      )}

      </> /* end list view */}
    </div>
  );
}
