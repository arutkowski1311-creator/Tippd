"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const SIGNAL_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  conversion_drop: { label: "View-to-Book Rate",  icon: "📉", color: "text-red-400" },
  fuel_increase:   { label: "Diesel Price",        icon: "⛽", color: "text-amber-400" },
  high_demand:     { label: "High Demand",         icon: "📈", color: "text-emerald-400" },
  low_demand:      { label: "Low Demand",          icon: "📊", color: "text-blue-400" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PricingIntelligence() {
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "dismissed" | "all">("pending");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("pricing_recommendations")
      .select("*")
      .order("created_at", { ascending: false });
    setRecs(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: "approved" | "dismissed") {
    setUpdating(id);
    const supabase = createClient();
    await supabase
      .from("pricing_recommendations")
      .update({ status, ...(status === "approved" ? { approved_at: new Date().toISOString() } : {}) })
      .eq("id", id);
    await load();
    setUpdating(null);
  }

  const filtered = recs.filter((r) => statusFilter === "all" || r.status === statusFilter);

  const stats = {
    pending:     recs.filter((r) => r.status === "pending").length,
    approved:    recs.filter((r) => r.status === "approved").length,
    totalImpact: recs.filter((r) => r.status === "approved").reduce((s, r) => s + (r.dollar_impact || 0), 0),
  };

  const signalSummary = Object.entries(SIGNAL_CONFIG).map(([type, config]) => ({
    type, ...config,
    count: recs.filter((r) => r.signal_type === type && r.status === "pending").length,
  })).filter((s) => s.count > 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Sparkles className="w-5 h-5 text-tippd-blue" />
        <h1 className="text-2xl font-bold text-white">Pricing Intelligence</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-xs text-tippd-ash mb-1">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs text-tippd-ash mb-1">Approved</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
              <p className="text-xs text-tippd-ash mb-1">Approved Impact</p>
              <p className="text-2xl font-bold text-white">+${stats.totalImpact.toLocaleString()}</p>
            </div>
          </div>

          {/* Active signal type cards */}
          {signalSummary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {signalSummary.map((s) => (
                <div key={s.type} className="rounded-lg border border-white/10 bg-tippd-charcoal p-4 flex items-center gap-4">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className={cn("text-sm font-semibold", s.color)}>{s.label}</p>
                    <p className="text-xs text-tippd-ash mt-0.5">{s.count} recommendation{s.count !== 1 ? "s" : ""} pending</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 bg-tippd-steel rounded-md border border-white/10 p-0.5 w-fit mb-4">
            {(["pending", "approved", "dismissed", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors",
                  statusFilter === f ? "bg-tippd-blue text-white" : "text-tippd-ash hover:text-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Recommendations list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-tippd-ash">
              <p className="text-sm">No {statusFilter !== "all" ? statusFilter : ""} recommendations.</p>
              {statusFilter === "pending" && (
                <p className="text-xs mt-1">The pricing signals cron runs daily at 10am UTC.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((rec) => {
                const config = SIGNAL_CONFIG[rec.signal_type];
                return (
                  <div key={rec.id} className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-lg">{config?.icon}</span>
                          <span className={cn("text-xs font-medium", config?.color)}>{config?.label || rec.signal_type}</span>
                          <span className="text-xs text-tippd-ash">· {formatDate(rec.created_at)}</span>
                        </div>
                        <p className="text-sm font-semibold text-white">{rec.title}</p>
                        <p className="text-xs text-tippd-smoke mt-1">{rec.observation}</p>
                        <p className="text-xs text-tippd-ash mt-1 italic">{rec.math}</p>
                        <p className="text-xs text-white mt-2 font-medium border-t border-white/5 pt-2">{rec.proposed_action}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-lg font-bold text-emerald-400">
                          +${(rec.dollar_impact || 0).toLocaleString()}
                        </span>
                        {rec.status === "pending" ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => updateStatus(rec.id, "approved")}
                              disabled={updating === rec.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-tippd-blue text-white rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(rec.id, "dismissed")}
                              disabled={updating === rec.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 border border-white/10 text-tippd-smoke rounded text-xs hover:text-white disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" /> Dismiss
                            </button>
                          </div>
                        ) : rec.status === "approved" ? (
                          <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded text-xs">Approved</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-white/5 text-tippd-ash rounded text-xs">Dismissed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
