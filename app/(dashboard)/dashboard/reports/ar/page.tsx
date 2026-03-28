"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Invoice { id: string; customer_name: string; total_amount: number; amount_paid: number; due_date: string; status: string }
interface Bucket { label: string; invoices: Invoice[]; total: number }

const BUCKETS = ["Current", "1-30 days", "31-60 days", "61-90 days", "90+ days"];

function bucketIndex(dueDateStr: string): number {
  const due = new Date(dueDateStr + "T00:00:00");
  const diff = Math.floor((Date.now() - due.getTime()) / 86400000);
  if (diff <= 0) return 0;
  if (diff <= 30) return 1;
  if (diff <= 60) return 2;
  if (diff <= 90) return 3;
  return 4;
}

export default function AccountsReceivable() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: user } = await sb.auth.getUser();
      if (!user.user) return;
      const { data: u } = await sb.from("users").select("operator_id").eq("id", user.user.id).single();
      if (!u) return;

      const { data: inv } = await sb.from("invoices")
        .select("id, customer_name, total_amount, amount_paid, due_date, status")
        .eq("operator_id", u.operator_id)
        .not("status", "in", '("paid","written_off")');

      const groups: Bucket[] = BUCKETS.map((l) => ({ label: l, invoices: [], total: 0 }));
      let tot = 0;

      for (const i of (inv || []) as Invoice[]) {
        const owed = Number(i.total_amount) - Number(i.amount_paid || 0);
        if (owed <= 0) continue;
        const idx = bucketIndex(i.due_date);
        groups[idx].invoices.push(i);
        groups[idx].total += owed;
        tot += owed;
      }

      setBuckets(groups);
      setTotalOutstanding(tot);
      setLoading(false);
    })();
  }, []);

  const $fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <DollarSign className="w-5 h-5 text-tippd-blue" />
        <h1 className="text-2xl font-bold text-white">Accounts Receivable</h1>
      </div>

      {loading ? (
        <p className="text-tippd-smoke py-12 text-center">Loading...</p>
      ) : (
        <>
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 mb-6 flex items-center justify-between">
            <span className="text-sm text-tippd-smoke">Total Outstanding</span>
            <span className="text-2xl font-bold text-white">{$fmt(totalOutstanding)}</span>
          </div>

          <div className="space-y-4">
            {buckets.map((b) => (
              <div key={b.label} className="rounded-lg border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-tippd-steel/50">
                  <span className="text-sm font-medium text-white">{b.label}</span>
                  <span className="text-sm font-bold text-white">{$fmt(b.total)}</span>
                </div>
                {b.invoices.length > 0 && (
                  <div className="divide-y divide-white/5">
                    {b.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5">
                        <div>
                          <p className="text-sm text-white">{inv.customer_name}</p>
                          <p className="text-xs text-tippd-ash">Due {new Date(inv.due_date + "T00:00:00").toLocaleDateString()}</p>
                        </div>
                        <span className="text-sm font-medium text-white">{$fmt(Number(inv.total_amount) - Number(inv.amount_paid || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
                {b.invoices.length === 0 && <p className="px-4 py-3 text-xs text-tippd-ash">No invoices</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
