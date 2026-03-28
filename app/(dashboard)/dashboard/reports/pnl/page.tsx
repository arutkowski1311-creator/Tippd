"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Range = "this_month" | "last_month" | "this_quarter" | "ytd";

function getRange(r: Range): [string, string] {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (r === "this_month") return [fmt(y, m, 1), fmt(y, m + 1, 0)];
  if (r === "last_month") return [fmt(y, m - 1, 1), fmt(y, m, 0)];
  if (r === "this_quarter") { const q = Math.floor(m / 3) * 3; return [fmt(y, q, 1), fmt(y, q + 3, 0)]; }
  return [`${y}-01-01`, fmt(y, 11, 31)];
}

function fmt(y: number, m: number, d: number) {
  const dt = d === 0 ? new Date(y, m, 0) : new Date(y, m, d);
  return dt.toISOString().split("T")[0];
}

const LABELS: Record<Range, string> = { this_month: "This Month", last_month: "Last Month", this_quarter: "This Quarter", ytd: "Year to Date" };

export default function PnlReport() {
  const [range, setRange] = useState<Range>("this_month");
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const sb = createClient();
      const { data: user } = await sb.auth.getUser();
      if (!user.user) return;
      const { data: u } = await sb.from("users").select("operator_id").eq("id", user.user.id).single();
      if (!u) return;
      const opId = u.operator_id;
      const [start, end] = getRange(range);

      const { data: jobs } = await sb.from("jobs").select("base_rate")
        .eq("operator_id", opId).eq("status", "paid")
        .gte("created_at", start).lte("created_at", end + "T23:59:59");
      const rev = (jobs || []).reduce((s: number, j: any) => s + Number(j.base_rate || 0), 0);

      const { data: exps } = await sb.from("expenses").select("amount")
        .eq("operator_id", opId)
        .gte("date", start).lte("date", end);
      const exp = (exps || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      setRevenue(rev);
      setExpenses(exp);
      setLoading(false);
    })();
  }, [range]);

  const profit = revenue - expenses;
  const $fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <DollarSign className="w-5 h-5 text-tippd-blue" />
        <h1 className="text-2xl font-bold text-white">P&L Report</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {(Object.keys(LABELS) as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${range === r ? "bg-tippd-blue text-white" : "bg-tippd-steel text-tippd-smoke hover:text-white"}`}>
            {LABELS[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-tippd-smoke py-12 text-center">Loading...</p>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-tippd-steel/50"><th className="px-4 py-3 text-left text-xs font-medium text-tippd-smoke uppercase">Line Item</th><th className="px-4 py-3 text-right text-xs font-medium text-tippd-smoke uppercase">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr><td className="px-4 py-3 text-sm text-white">Revenue (paid jobs)</td><td className="px-4 py-3 text-sm text-tippd-green text-right font-medium">{$fmt(revenue)}</td></tr>
              <tr><td className="px-4 py-3 text-sm text-white">Expenses</td><td className="px-4 py-3 text-sm text-red-400 text-right font-medium">({$fmt(expenses)})</td></tr>
              <tr className="bg-tippd-steel/30">
                <td className="px-4 py-3 text-sm font-semibold text-white">Net Profit</td>
                <td className={`px-4 py-3 text-sm text-right font-bold ${profit >= 0 ? "text-tippd-green" : "text-red-400"}`}>{$fmt(profit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
