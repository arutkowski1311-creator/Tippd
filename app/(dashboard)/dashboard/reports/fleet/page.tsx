import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

const FLEET_RECS = [
  { type: "add", title: "Add 2 used 20yd dumpsters", trigger: "Utilization at 91% for 18 days",
    math: "Used unit: $3,200. Avg $410/unit/month. Payback: 7.8 months. Dead miles reduction: 4.2 mi/day.",
    impact: "+$9,840/yr revenue", status: "pending" },
  { type: "sell", title: "Consider selling D-038", trigger: "31% utilization over 6 months",
    math: "$890 revenue vs $240 maintenance over 18mo. Net: $650. Sale price: ~$1,500.",
    impact: "+$1,500 cash", status: "pending" },
];

export default function FleetIntelligence() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Sparkles className="w-5 h-5 text-tippd-green" />
        <h1 className="text-2xl font-bold text-white">Fleet Right-Sizing</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatBox label="Fleet Size" value="85" />
        <StatBox label="Utilization" value="91%" />
        <StatBox label="Avg Revenue/Unit" value="$410/mo" />
        <StatBox label="Units in Repair" value="2" />
      </div>

      {/* Recommendations */}
      <h2 className="text-lg font-semibold text-white mb-3">AI Recommendations</h2>
      <div className="space-y-4">
        {FLEET_RECS.map((rec, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.type === "add" ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"}`}>
                  {rec.type === "add" ? "Add Units" : "Sell Unit"}
                </span>
                <h3 className="text-base font-semibold text-white mt-2">{rec.title}</h3>
              </div>
              <span className="text-sm font-bold text-emerald-400">{rec.impact}</span>
            </div>
            <p className="text-xs text-tippd-ash mb-2">Trigger: {rec.trigger}</p>
            <p className="text-sm text-tippd-smoke mb-4">{rec.math}</p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-tippd-blue text-white rounded text-sm font-medium hover:opacity-90">Approve</button>
              <button className="px-4 py-2 border border-white/10 text-tippd-smoke rounded text-sm hover:text-white">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
      <p className="text-xs text-tippd-smoke">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
