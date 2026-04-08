"use client";

import Link from "next/link";
import { ArrowLeft, Route, Construction } from "lucide-react";

const MOCK_KPIS = [
  { label: "Avg Miles per Box", value: "14.2 mi" },
  { label: "Dead Mile %", value: "22%" },
  { label: "Avg Dump Time", value: "38 min" },
  { label: "Avg Stops per Route", value: "6.4" },
];

export default function RouteEfficiency() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Route className="w-5 h-5 text-tippd-blue" />
        <h1 className="text-2xl font-bold text-white">Route Efficiency</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {MOCK_KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
            <p className="text-xs text-tippd-smoke">{kpi.label}</p>
            <p className="text-xl font-bold text-white mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-8 flex flex-col items-center justify-center text-center">
        <Construction className="w-10 h-10 text-tippd-ash mb-3" />
        <h2 className="text-lg font-semibold text-white mb-1">Route analytics coming soon</h2>
        <p className="text-sm text-tippd-ash max-w-md">
          Real-time route tracking, dead mile optimization, and driver performance metrics
          will be available once GPS integration is connected.
        </p>
      </div>
    </div>
  );
}
