import Link from "next/link";
import { ArrowLeft, User, DollarSign, AlertTriangle } from "lucide-react";

export default function CustomerDetail() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/customers" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold text-white">Customer Detail</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-tippd-steel flex items-center justify-center"><User className="w-6 h-6 text-tippd-smoke" /></div>
              <div>
                <h2 className="text-lg font-bold text-white">Mike Johnson</h2>
                <p className="text-sm text-tippd-ash">(555) 111-2222 — Residential</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-sm font-medium text-tippd-smoke mb-3">Job History</h2>
            <div className="space-y-3">
              {[
                { date: "Mar 24", status: "Active", size: "20yd", amount: "$400" },
                { date: "Feb 10", status: "Paid", size: "10yd", amount: "$342" },
                { date: "Jan 5", status: "Paid", size: "10yd", amount: "$315" },
              ].map((j, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                  <div><p className="text-white">{j.size} — {j.status}</p><p className="text-xs text-tippd-ash">{j.date}</p></div>
                  <span className="text-white">{j.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-3">
            <h2 className="text-sm font-medium text-tippd-smoke">Profitability</h2>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-2xl font-bold text-white">$1,057</span></div>
            <p className="text-xs text-tippd-ash">Lifetime revenue after costs</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-3">
            <h2 className="text-sm font-medium text-tippd-smoke">PITA Score</h2>
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-emerald-400" /><span className="text-2xl font-bold text-emerald-400">0</span></div>
            <p className="text-xs text-tippd-ash">No issues — great customer</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-3">
            <h2 className="text-sm font-medium text-tippd-smoke">Quick Actions</h2>
            <button className="w-full py-2 text-sm bg-tippd-blue text-white rounded-md hover:opacity-90">Create Job</button>
            <button className="w-full py-2 text-sm border border-white/10 text-tippd-smoke rounded-md hover:text-white">Send Quote</button>
          </div>
        </div>
      </div>
    </div>
  );
}
