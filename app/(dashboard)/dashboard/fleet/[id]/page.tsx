"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Calendar, User, DollarSign, Wrench, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

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

function getStatusBadge(status: string, daysOut?: number | null) {
  const isOverdue = daysOut && daysOut > 7;
  if (isOverdue) return { bg: "bg-orange-500/20 border-orange-500/30", text: "text-orange-400", label: `Overdue (${daysOut}d)` };
  switch (status) {
    case "available":
    case "in_yard":
      return { bg: "bg-emerald-500/20 border-emerald-500/30", text: "text-emerald-400", label: status === "in_yard" ? "In Yard" : "Available" };
    case "deployed":
    case "assigned":
      return { bg: "bg-yellow-500/20 border-yellow-500/30", text: "text-yellow-400", label: "In Use" };
    case "repair":
      return { bg: "bg-red-500/20 border-red-500/30", text: "text-red-400", label: "Out of Service" };
    case "retired":
      return { bg: "bg-red-700/20 border-red-700/30", text: "text-red-500", label: "Retired" };
    case "returning":
      return { bg: "bg-blue-500/20 border-blue-500/30", text: "text-blue-400", label: "Returning" };
    default:
      return { bg: "bg-gray-500/20 border-gray-500/30", text: "text-gray-400", label: status };
  }
}

function formatDuration(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DumpsterDetail({ params }: { params: { id: string } }) {
  const [dumpster, setDumpster] = useState<any>(null);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [conditionLog, setConditionLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get dumpster
      const { data: d } = await supabase
        .from("dumpsters")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!d) { setLoading(false); return; }
      setDumpster(d);

      // Get current job if deployed
      if (d.current_job_id) {
        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", d.current_job_id)
          .single();
        setCurrentJob(job);
      }

      // Get all historical jobs for this dumpster
      const { data: history } = await supabase
        .from("jobs")
        .select("id, customer_name, drop_address, actual_drop_time, actual_pickup_time, status, base_rate, weight_charge, daily_overage_charge, days_on_site")
        .eq("dumpster_id", params.id)
        .order("actual_drop_time", { ascending: false });

      if (history) setJobHistory(history);

      // Get condition log
      const { data: conditions } = await supabase
        .from("dumpster_condition_log")
        .select("*, users:changed_by(name)")
        .eq("dumpster_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (conditions) setConditionLog(conditions);

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-white/5 rounded w-48 animate-pulse" />
        <div className="h-40 bg-white/5 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!dumpster) {
    return (
      <div className="text-center py-12">
        <p className="text-tippd-ash">Dumpster not found.</p>
        <Link href="/dashboard/fleet" className="text-tippd-blue text-sm mt-2 inline-block">← Back to Fleet</Link>
      </div>
    );
  }

  const daysOut = currentJob?.actual_drop_time
    ? Math.floor((Date.now() - new Date(currentJob.actual_drop_time).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const statusBadge = getStatusBadge(dumpster.status, daysOut);

  // Calculate lifetime stats
  const completedJobs = jobHistory.filter((j) => ["paid", "invoiced", "picked_up"].includes(j.status));
  const lifetimeRevenue = completedJobs.reduce((sum, j) => sum + (j.base_rate || 0) + (j.weight_charge || 0) + (j.daily_overage_charge || 0), 0);
  const avgDaysOnSite = completedJobs.length > 0
    ? Math.round(completedJobs.reduce((sum, j) => sum + (j.days_on_site || 7), 0) / completedJobs.length)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/fleet" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{dumpster.unit_number}</h1>
          <span className={cn("w-7 h-7 rounded text-sm flex items-center justify-center font-bold", getGradeColor(dumpster.condition_grade))}>
            {dumpster.condition_grade}
          </span>
          <span className={cn("px-3 py-1 rounded-full border text-sm font-semibold", statusBadge.bg, statusBadge.text)}>
            {statusBadge.label}
          </span>
        </div>
        <span className="text-sm text-tippd-ash ml-auto">{dumpster.size}</span>
      </div>

      {/* Current Location — Big prominent card */}
      {currentJob && (
        <div className={cn(
          "rounded-xl border-2 p-5 mb-6",
          daysOut && daysOut > 7 ? "border-orange-500 bg-orange-500/10" : "border-yellow-500 bg-yellow-500/10"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-tippd-ash uppercase tracking-wide mb-1">Current Location</p>
              <p className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-tippd-blue shrink-0" />
                {currentJob.drop_address}
              </p>
              <p className="text-sm text-tippd-smoke mt-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                {currentJob.customer_name}
              </p>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-3xl font-bold",
                daysOut && daysOut > 7 ? "text-orange-400" : "text-yellow-400"
              )}>
                {daysOut !== null ? `${daysOut}d` : "—"}
              </div>
              <p className="text-xs text-tippd-ash">on site</p>
              {daysOut && daysOut > 7 && (
                <div className="flex items-center gap-1 mt-1 text-orange-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Past standard
                </div>
              )}
            </div>
          </div>
          {currentJob.actual_drop_time && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-tippd-ash">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Dropped: {formatDate(currentJob.actual_drop_time)}
              </span>
              {currentJob.requested_pickup_start && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pickup scheduled: {formatDate(currentJob.requested_pickup_start)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* If available, show yard location */}
      {!currentJob && (dumpster.status === "available" || dumpster.status === "in_yard") && (
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-500/10 p-5 mb-6">
          <p className="text-xs font-medium text-tippd-ash uppercase tracking-wide mb-1">Current Location</p>
          <p className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            1 Drake Street, Bound Brook, NJ 08805
          </p>
          <p className="text-sm text-emerald-400 mt-1">In yard — ready for next job</p>
        </div>
      )}

      {/* If repair */}
      {dumpster.status === "repair" && (
        <div className="rounded-xl border-2 border-red-500 bg-red-500/10 p-5 mb-6">
          <p className="text-xs font-medium text-tippd-ash uppercase tracking-wide mb-1">Status</p>
          <p className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-400 shrink-0" />
            Out of Service — Repair Required
          </p>
          {dumpster.repair_notes && <p className="text-sm text-tippd-smoke mt-1">{dumpster.repair_notes}</p>}
          {dumpster.repair_cost_estimate && (
            <p className="text-sm text-red-400 mt-1">Est. cost: ${dumpster.repair_cost_estimate}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
          <h2 className="text-sm font-medium text-tippd-smoke mb-4">Lifetime Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-tippd-ash">Total Jobs</span>
              <span className="text-sm font-bold text-white">{jobHistory.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-tippd-ash">Revenue Generated</span>
              <span className="text-sm font-bold text-emerald-400">${lifetimeRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-tippd-ash">Avg Days on Site</span>
              <span className="text-sm font-bold text-white">{avgDaysOnSite}d</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-tippd-ash">Condition</span>
              <span className={cn("w-6 h-6 rounded text-xs flex items-center justify-center font-bold", getGradeColor(dumpster.condition_grade))}>
                {dumpster.condition_grade}
              </span>
            </div>
            {dumpster.last_inspection_date && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-tippd-ash">Last Inspected</span>
                <span className="text-sm text-white">{formatDate(dumpster.last_inspection_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Location History — Main panel */}
        <div className="lg:col-span-2 rounded-lg border border-white/10 bg-tippd-charcoal p-5">
          <h2 className="text-sm font-medium text-tippd-smoke mb-4">
            Location History
            <span className="text-tippd-ash ml-2">({jobHistory.length} deployments)</span>
          </h2>

          {jobHistory.length === 0 ? (
            <p className="text-sm text-tippd-ash py-8 text-center">No deployment history yet.</p>
          ) : (
            <div className="space-y-0">
              {jobHistory.map((job, i) => {
                const isActive = i === 0 && currentJob?.id === job.id;
                const duration = job.actual_drop_time
                  ? formatDuration(job.actual_drop_time, job.actual_pickup_time)
                  : "—";
                const revenue = (job.base_rate || 0) + (job.weight_charge || 0) + (job.daily_overage_charge || 0);
                const shortAddr = job.drop_address?.split(",").slice(0, 2).join(",") || "Unknown";

                return (
                  <div key={job.id} className="relative">
                    {/* Timeline line */}
                    {i < jobHistory.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-white/10" />
                    )}

                    <div className={cn(
                      "flex items-start gap-3 py-3 px-2 rounded-lg transition-colors",
                      isActive ? "bg-yellow-500/10" : "hover:bg-white/5"
                    )}>
                      {/* Timeline dot */}
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                        isActive ? "border-yellow-500 bg-yellow-500/30" : "border-white/20 bg-tippd-steel"
                      )}>
                        <MapPin className={cn("w-3 h-3", isActive ? "text-yellow-400" : "text-tippd-ash")} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={cn("text-sm font-medium truncate", isActive ? "text-yellow-400" : "text-white")}>
                              {shortAddr}
                              {isActive && <span className="ml-2 text-xs text-yellow-500 font-bold">● NOW</span>}
                            </p>
                            <p className="text-xs text-tippd-ash">{job.customer_name}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className={cn("text-sm font-bold", isActive ? "text-yellow-400" : "text-white")}>
                              {duration}
                            </p>
                            {revenue > 0 && (
                              <p className="text-xs text-emerald-400">${revenue}</p>
                            )}
                          </div>
                        </div>
                        {job.actual_drop_time && (
                          <p className="text-xs text-tippd-ash mt-1">
                            {formatDate(job.actual_drop_time)}
                            {job.actual_pickup_time && ` → ${formatDate(job.actual_pickup_time)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Condition History */}
      {conditionLog.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-tippd-charcoal p-5">
          <h2 className="text-sm font-medium text-tippd-smoke mb-3">Condition History</h2>
          <div className="space-y-2">
            {conditionLog.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-tippd-ash w-24">{formatDate(entry.created_at)}</span>
                <span className={cn("w-5 h-5 rounded text-xs flex items-center justify-center font-bold", getGradeColor(entry.previous_grade))}>
                  {entry.previous_grade}
                </span>
                <span className="text-tippd-ash">→</span>
                <span className={cn("w-5 h-5 rounded text-xs flex items-center justify-center font-bold", getGradeColor(entry.new_grade))}>
                  {entry.new_grade}
                </span>
                {entry.notes && <span className="text-xs text-tippd-smoke truncate">{entry.notes}</span>}
                <span className="text-xs text-tippd-ash ml-auto">{entry.users?.name || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
