"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";

const MOCK_CUSTOMERS = [
  { id: "1", name: "Mike Johnson", phone: "(555) 111-2222", type: "residential", jobs: 3, revenue: 1200, pain_score: 0 },
  { id: "2", name: "Sarah Williams", phone: "(555) 333-4444", type: "residential", jobs: 1, revenue: 400, pain_score: 1 },
  { id: "3", name: "Bob's Construction", phone: "(555) 555-6666", type: "contractor", jobs: 12, revenue: 5400, pain_score: 0 },
  { id: "4", name: "Premier Roofing", phone: "(555) 777-8888", type: "contractor", jobs: 8, revenue: 3600, pain_score: 2 },
  { id: "5", name: "Lisa Chen", phone: "(555) 999-0000", type: "residential", jobs: 2, revenue: 700, pain_score: 0 },
];

export default function CustomersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tippd-ash" />
        <input type="text" placeholder="Search customers..." className="w-full h-9 pl-9 pr-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm placeholder:text-tippd-ash outline-none" />
      </div>
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-tippd-steel/50 text-left">
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Name</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">Phone</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Type</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Jobs</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Revenue</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">PITA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MOCK_CUSTOMERS.map((c) => (
              <tr key={c.id} className="hover:bg-white/5">
                <td className="px-4 py-3 whitespace-nowrap"><Link href={`/dashboard/customers/${c.id}`} className="text-sm font-medium text-white hover:text-tippd-blue">{c.name}</Link></td>
                <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap hidden sm:table-cell">{c.phone}</td>
                <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 rounded text-xs bg-tippd-steel text-tippd-smoke capitalize">{c.type}</span></td>
                <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap">{c.jobs}</td>
                <td className="px-4 py-3 text-sm text-white whitespace-nowrap">${c.revenue.toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap"><span className={`text-sm ${c.pain_score > 1 ? "text-red-400" : c.pain_score > 0 ? "text-amber-400" : "text-emerald-400"}`}>{c.pain_score}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
