import { TrendingDown, TrendingUp } from "lucide-react";

export default function RoutesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Route History</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBox label="Avg Miles/Box" value="4.2" trend="down" trendVal="-0.3 vs last week" good />
        <StatBox label="Dead Miles %" value="18%" trend="down" trendVal="-2% vs last week" good />
        <StatBox label="Dumpster Reuse Rate" value="34%" trend="up" trendVal="+5% vs last week" good />
        <StatBox label="Revenue/Mile" value="$8.40" trend="up" trendVal="+$0.60 vs last week" good />
      </div>
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-tippd-steel/50 text-left">
            <th className="px-4 py-3 text-xs font-medium text-tippd-smoke uppercase">Date</th>
            <th className="px-4 py-3 text-xs font-medium text-tippd-smoke uppercase">Truck</th>
            <th className="px-4 py-3 text-xs font-medium text-tippd-smoke uppercase">Driver</th>
            <th className="px-4 py-3 text-xs font-medium text-tippd-smoke uppercase">Stops</th>
            <th className="px-4 py-3 text-xs font-medium text-tippd-smoke uppercase">Miles</th>
            <th className="px-4 py-3 text-xs font-medium text-tippd-smoke uppercase">Mi/Box</th>
          </tr></thead>
          <tbody className="divide-y divide-white/5">
            {[
              { date: "Mar 26", truck: "Truck 1", driver: "Mike", stops: 5, miles: 42, mpb: 8.4 },
              { date: "Mar 26", truck: "Truck 2", driver: "Carlos", stops: 4, miles: 38, mpb: 9.5 },
              { date: "Mar 25", truck: "Truck 1", driver: "Mike", stops: 6, miles: 51, mpb: 8.5 },
              { date: "Mar 25", truck: "Truck 2", driver: "Carlos", stops: 3, miles: 28, mpb: 9.3 },
            ].map((r, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="px-4 py-3 text-sm text-tippd-smoke">{r.date}</td>
                <td className="px-4 py-3 text-sm text-white">{r.truck}</td>
                <td className="px-4 py-3 text-sm text-tippd-smoke">{r.driver}</td>
                <td className="px-4 py-3 text-sm text-white">{r.stops}</td>
                <td className="px-4 py-3 text-sm text-tippd-smoke">{r.miles}</td>
                <td className="px-4 py-3 text-sm text-white">{r.mpb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatBox({ label, value, trend, trendVal }: { label: string; value: string; trend: "up" | "down"; trendVal: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
      <p className="text-xs text-tippd-smoke">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {trend === "up" ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-emerald-400" />}
        <span className="text-xs text-emerald-400">{trendVal}</span>
      </div>
    </div>
  );
}
