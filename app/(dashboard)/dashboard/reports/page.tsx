"use client";

import { useRouter } from "next/navigation";
import { BarChart3, Users, Truck, DollarSign, Sparkles, Route, ArrowRight } from "lucide-react";

const REPORTS = [
  { icon: BarChart3, title: "P&L Report", desc: "Revenue, expenses, and profit by period", href: "/dashboard/reports/pnl" },
  { icon: Users, title: "Customer Profitability", desc: "Revenue vs cost to serve per customer", href: "/dashboard/reports/customers" },
  { icon: Truck, title: "Fleet Utilization", desc: "Deployment rates, idle units, ROI per dumpster", href: "/dashboard/reports/fleet" },
  { icon: DollarSign, title: "Accounts Receivable", desc: "Outstanding invoices by aging bucket", href: "/dashboard/reports/ar" },
  { icon: Route, title: "Route Efficiency", desc: "Miles per box, dead miles, dump time", href: "/dashboard/reports/routes" },
  { icon: Sparkles, title: "Pricing Intelligence", desc: "Demand signals, conversion rates, recommendations", href: "/dashboard/reports/pricing" },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Reports</h1>

      {/* AI Weekly Digest */}
      <div className="rounded-lg border border-tippd-green/30 bg-tippd-green/5 p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-tippd-green" />
          <h2 className="text-lg font-semibold text-white">Weekly Insight Digest</h2>
          <span className="text-xs text-tippd-ash">Week of Mar 24</span>
        </div>
        <div className="space-y-3">
          {[
            { icon: "📈", title: "Revenue up 12% vs last week", body: "$8,450 total — driven by 3 new contractor bookings" },
            { icon: "🛣️", title: "Tuesday dead miles at 34%", body: "Consider restricting Tuesday bookings to northern cluster — est. savings: $180/week" },
            { icon: "👤", title: "Top contractor Bob's Construction", body: "12 jobs, $5,400 revenue — offer volume discount to lock in" },
            { icon: "🔧", title: "D-042 approaching end of economic life", body: "ROI declining — consider replacement within 4 months" },
            { icon: "💰", title: "Autopay discount opportunity", body: "1.5% autopay discount would cost $890/yr but recover ~$4,200 in float cost" },
          ].map((insight, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-lg">{insight.icon}</span>
              <div>
                <p className="font-medium text-white">{insight.title}</p>
                <p className="text-tippd-ash">{insight.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <button
            key={report.title}
            onClick={() => router.push(report.href)}
            className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 text-left hover:border-tippd-blue/50 transition-colors group"
          >
            <report.icon className="w-6 h-6 text-tippd-blue mb-3" />
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              {report.title}
              <ArrowRight className="w-3.5 h-3.5 text-tippd-ash opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-tippd-ash mt-1">{report.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
