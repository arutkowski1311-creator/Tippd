"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Row { name: string; jobs: number; revenue: number; avg: number }

export default function CustomerProfitability() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: user } = await sb.auth.getUser();
      if (!user.user) return;
      const { data: u } = await sb.from("users").select("operator_id").eq("id", user.user.id).single();
      if (!u) return;
      const opId = u.operator_id;

      const { data: jobs } = await sb.from("jobs").select("customer_id, customer_name, base_rate, status")
        .eq("operator_id", opId).in("status", ["paid", "invoiced", "picked_up"]);

      const map = new Map<string, Row>();
      for (const j of jobs || []) {
        const key = j.customer_id;
        const cur = map.get(key) || { name: j.customer_name, jobs: 0, revenue: 0, avg: 0 };
        cur.jobs += 1;
        cur.revenue += Number(j.base_rate || 0);
        map.set(key, cur);
      }

      const sorted = Array.from(map.values())
        .map((r) => ({ ...r, avg: r.jobs > 0 ? r.revenue / r.jobs : 0 }))
        .sort((a, b) => b.revenue - a.revenue);

      setRows(sorted);
      setLoading(false);
    })();
  }, []);

  const $fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Users className="w-5 h-5 text-tippd-blue" />
        <h1 className="text-2xl font-bold text-white">Customer Profitability</h1>
      </div>

      {loading ? (
        <p className="text-tippd-smoke py-12 text-center">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-tippd-smoke py-12 text-center">No job data yet.</p>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-tippd-steel/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-tippd-smoke uppercase">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-tippd-smoke uppercase">Jobs</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-tippd-smoke uppercase">Total Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-tippd-smoke uppercase">Avg Job Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm text-white">{r.name}</td>
                    <td className="px-4 py-3 text-sm text-tippd-ash text-right">{r.jobs}</td>
                    <td className="px-4 py-3 text-sm text-tippd-green text-right font-medium">{$fmt(r.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-white text-right">{$fmt(r.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
