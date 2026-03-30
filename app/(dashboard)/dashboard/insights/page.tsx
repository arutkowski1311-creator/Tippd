"use client";

import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, TrendingDown, DollarSign, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  route:       { icon: "🛣️",  color: "text-blue-400",    bg: "bg-blue-500/10" },
  customer:    { icon: "👤",  color: "text-teal-400",    bg: "bg-teal-500/10" },
  asset:       { icon: "🚛",  color: "text-orange-400",  bg: "bg-orange-500/10" },
  pricing:     { icon: "💰",  color: "text-emerald-400", bg: "bg-emerald-500/10" },
  labor:       { icon: "👷",  color: "text-yellow-400",  bg: "bg-yellow-500/10" },
  payment:     { icon: "💳",  color: "text-purple-400",  bg: "bg-purple-500/10" },
  opportunity: { icon: "🎯",  color: "text-pink-400",    bg: "bg-pink-500/10" },
};

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getWeekOf(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());

  const weekOf = getWeekOf(weekOffset);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("insights")
        .select("*")
        .eq("week_of", weekOf)
        .order("created_at", { ascending: true });
      setInsights(data || []);
      setLoading(false);
    }
    load();
  }, [weekOf]);

  async function markActioned(id: string) {
    const supabase = createClient();
    await supabase.from("insights").update({ action_taken: true }).eq("id", id);
    setActionedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  }

  const totalImpact = insights.reduce((sum, i) => sum + (i.dollar_impact || 0), 0);
  const actionedCount = insights.filter((i) => i.action_taken || actionedIds.has(i.id)).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-tippd-blue" />
          <div>
            <h1 className="text-2xl font-bold text-white">Weekly Insights</h1>
            <p className="text-sm text-tippd-smoke mt-0.5">AI-generated analysis of your operation</p>
          </div>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-1.5 rounded-md border border-white/10 text-tippd-smoke hover:text-white hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-white min-w-[120px] text-center">
            {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : `Week of ${formatWeek(weekOf)}`}
          </span>
          <button
            onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
            disabled={weekOffset === 0}
            className="p-1.5 rounded-md border border-white/10 text-tippd-smoke hover:text-white hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-20 text-tippd-ash">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-white mb-1">No insights yet for this week</p>
          <p className="text-xs">The weekly digest runs every Monday morning. Check back then.</p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
              <p className="text-xs text-tippd-ash mb-1">Insights This Week</p>
              <p className="text-2xl font-bold text-white">{insights.length}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs text-tippd-ash mb-1">Total Dollar Impact</p>
              <p className="text-2xl font-bold text-emerald-400">
                {totalImpact >= 0 ? "+" : ""}${Math.abs(totalImpact).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
              <p className="text-xs text-tippd-ash mb-1">Actioned</p>
              <p className="text-2xl font-bold text-white">{actionedCount} / {insights.length}</p>
            </div>
          </div>

          {/* Insight cards */}
          <div className="space-y-3">
            {insights.map((insight) => {
              const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.opportunity;
              const isActioned = insight.action_taken || actionedIds.has(insight.id);

              return (
                <div
                  key={insight.id}
                  className={cn(
                    "rounded-lg border p-4 transition-all",
                    isActioned
                      ? "border-white/5 bg-white/2 opacity-60"
                      : "border-white/10 bg-tippd-charcoal"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0", config.bg)}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={cn("text-xs font-semibold uppercase tracking-wide", config.color)}>
                              {insight.type}
                            </span>
                            {isActioned && (
                              <span className="flex items-center gap-1 text-xs text-emerald-400">
                                <CheckCircle className="w-3 h-3" /> Actioned
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                        </div>

                        {insight.dollar_impact !== null && (
                          <div className="flex items-center gap-1 shrink-0">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span className={cn(
                              "text-sm font-bold",
                              insight.dollar_impact >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {insight.dollar_impact >= 0 ? "+" : ""}${Math.abs(insight.dollar_impact).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-tippd-smoke mt-2 leading-relaxed">{insight.body}</p>

                      {!isActioned && (
                        <button
                          onClick={() => markActioned(insight.id)}
                          className="mt-3 px-3 py-1.5 border border-white/10 rounded text-xs text-tippd-smoke hover:text-white hover:bg-white/5 transition-colors"
                        >
                          Mark as Actioned
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
