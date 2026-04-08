"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  low:      { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20",   dot: "bg-blue-400" },
  medium:   { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", dot: "bg-yellow-400" },
  high:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-400" },
  critical: { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20",    dot: "bg-red-400" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open:          { bg: "bg-red-500/10",     text: "text-red-400",     label: "Open" },
  in_resolution: { bg: "bg-yellow-500/10",  text: "text-yellow-400",  label: "In Resolution" },
  resolved:      { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Resolved" },
  escalated:     { bg: "bg-purple-500/10",  text: "text-purple-400",  label: "Escalated" },
};

const TYPE_LABELS: Record<string, string> = {
  box_inaccessible:       "Box Inaccessible",
  overloaded_container:   "Overloaded Container",
  prohibited_material:    "Prohibited Material",
  customer_change_request:"Customer Change Request",
  truck_breakdown:        "Truck Breakdown",
  transfer_station_issue: "Transfer Station Issue",
  customer_not_present:   "Customer Not Present",
  access_restriction:     "Access Restriction",
};

const OWNER_LABELS: Record<string, string> = {
  driver: "Driver", customer: "Customer", owner: "Owner", system: "System",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

type StatusFilter = "all" | "open" | "in_resolution" | "resolved" | "escalated";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("exceptions")
      .select("*, jobs(customer_name, drop_address), users!exceptions_driver_id_fkey(name)")
      .order("created_at", { ascending: false });
    setExceptions(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleResolve(id: string) {
    setResolving(id);
    await fetch(`/api/exceptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", resolution_notes: "Resolved from dashboard" }),
    });
    await load();
    setResolving(null);
    setExpanded(null);
  }

  async function handleEscalate(id: string) {
    setResolving(id);
    await fetch(`/api/exceptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "escalate" }),
    });
    await load();
    setResolving(null);
  }

  const filtered = exceptions.filter((e) =>
    statusFilter === "all" ? true : e.status === statusFilter
  );

  const stats = {
    open:          exceptions.filter((e) => e.status === "open").length,
    in_resolution: exceptions.filter((e) => e.status === "in_resolution").length,
    escalated:     exceptions.filter((e) => e.status === "escalated").length,
    critical:      exceptions.filter((e) => e.severity === "critical" && e.status !== "resolved").length,
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-white/5 rounded w-40 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Exceptions</h1>
          <p className="text-sm text-tippd-smoke mt-1">Operational events that need attention</p>
        </div>
        {stats.critical > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">{stats.critical} Critical</span>
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([
          { key: "all",          label: "All",           count: exceptions.length,  color: "border-white/20 hover:border-white/40" },
          { key: "open",         label: "Open",          count: stats.open,          color: "hover:border-red-500/30" },
          { key: "in_resolution",label: "In Resolution", count: stats.in_resolution, color: "hover:border-yellow-500/30" },
          { key: "escalated",    label: "Escalated",     count: stats.escalated,     color: "hover:border-purple-500/30" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as StatusFilter)}
            className={cn(
              "rounded-lg border p-3 text-left transition-all",
              statusFilter === tab.key
                ? "border-tippd-blue bg-tippd-blue/10 ring-1 ring-tippd-blue/30"
                : `border-white/10 bg-tippd-charcoal ${tab.color}`
            )}
          >
            <p className="text-2xl font-bold text-white">{tab.count}</p>
            <p className="text-xs text-tippd-smoke mt-0.5">{tab.label}</p>
          </button>
        ))}
      </div>

      {/* Exception list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-tippd-ash">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-500/40" />
          <p className="text-sm">No exceptions {statusFilter !== "all" ? `with status "${statusFilter}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ex) => {
            const sc = SEVERITY_COLORS[ex.severity] || SEVERITY_COLORS.medium;
            const ss = STATUS_STYLES[ex.status] || STATUS_STYLES.open;
            const isExpanded = expanded === ex.id;
            const isActive = ex.status === "open" || ex.status === "in_resolution";

            return (
              <div
                key={ex.id}
                className={cn(
                  "rounded-lg border transition-all",
                  sc.border,
                  sc.bg
                )}
              >
                {/* Row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpanded(isExpanded ? null : ex.id)}
                >
                  {/* Severity dot */}
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", sc.dot)} />

                  {/* Type + customer */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        {TYPE_LABELS[ex.type] || ex.type}
                      </span>
                      <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium capitalize", sc.bg, sc.text)}>
                        {ex.severity}
                      </span>
                    </div>
                    <p className="text-xs text-tippd-ash mt-0.5 truncate">
                      {ex.jobs?.customer_name || "—"}
                      {ex.jobs?.drop_address && ` · ${ex.jobs.drop_address.split(",")[0]}`}
                    </p>
                  </div>

                  {/* Status + time */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn("hidden sm:inline-flex px-2 py-0.5 rounded text-xs font-medium", ss.bg, ss.text)}>
                      {ss.label}
                    </span>
                    <span className="text-xs text-tippd-ash flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(ex.created_at)}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-tippd-ash" /> : <ChevronDown className="w-4 h-4 text-tippd-ash" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-tippd-ash mb-0.5">Resolution Owner</p>
                        <p className="text-white font-medium">{OWNER_LABELS[ex.resolution_owner] || ex.resolution_owner}</p>
                      </div>
                      <div>
                        <p className="text-tippd-ash mb-0.5">Time Sensitivity</p>
                        <p className="text-white font-medium capitalize">{ex.time_sensitivity?.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-tippd-ash mb-0.5">Cascade Scope</p>
                        <p className="text-white font-medium capitalize">{ex.cascade_scope?.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-tippd-ash mb-0.5">Driver</p>
                        <p className="text-white font-medium">{ex.users?.name || "—"}</p>
                      </div>
                    </div>

                    {ex.driver_notes && (
                      <div className="rounded-md bg-white/5 px-3 py-2">
                        <p className="text-xs text-tippd-ash mb-1">Driver Notes</p>
                        <p className="text-sm text-white">{ex.driver_notes}</p>
                      </div>
                    )}

                    {ex.material_type && (
                      <div className="rounded-md bg-red-500/10 px-3 py-2">
                        <p className="text-xs text-red-400">Prohibited Material: <span className="font-semibold">{ex.material_type}</span></p>
                      </div>
                    )}

                    {ex.resolution_notes && (
                      <div className="rounded-md bg-emerald-500/10 px-3 py-2">
                        <p className="text-xs text-tippd-ash mb-1">Resolution Notes</p>
                        <p className="text-sm text-emerald-300">{ex.resolution_notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {isActive && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleResolve(ex.id)}
                          disabled={resolving === ex.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {resolving === ex.id ? "Resolving…" : "Mark Resolved"}
                        </button>
                        {ex.status !== "escalated" && (
                          <button
                            onClick={() => handleEscalate(ex.id)}
                            disabled={resolving === ex.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Escalate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
