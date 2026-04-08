"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, FileText, Printer } from "lucide-react";
import { INVOICE_STATUS_COLORS } from "@/lib/constants";
import type { Invoice } from "@/types/invoice";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Invoices" },
  { value: "draft", label: "Drafts" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue_30", label: "Overdue (30d)" },
  { value: "overdue_45", label: "Overdue (45d)" },
  { value: "overdue_60", label: "Overdue (60d)" },
  { value: "overdue_80", label: "Overdue (80d)" },
  { value: "collections", label: "Collections" },
  { value: "disputed", label: "Disputed" },
  { value: "written_off", label: "Written Off" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/invoices?status=${statusFilter}`
        : "/api/invoices";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error("Failed to load invoices", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? invoices.filter(
        (inv) =>
          inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  // Compute aging buckets from unpaid invoices
  const buckets = useMemo<AgingBucket[]>(() => {
    const unpaid = invoices.filter((inv) => inv.status !== "paid" && inv.status !== "written_off");
    const b = [
      { label: "0-30 days", amount: 0, count: 0, color: "text-white" },
      { label: "30-60 days", amount: 0, count: 0, color: "text-amber-400" },
      { label: "60-90 days", amount: 0, count: 0, color: "text-red-400" },
      { label: "90+ days", amount: 0, count: 0, color: "text-red-500" },
    ];
    for (const inv of unpaid) {
      const days = daysSince(inv.issued_date);
      const balance = inv.total_amount - inv.amount_paid;
      if (days < 30) { b[0].amount += balance; b[0].count++; }
      else if (days < 60) { b[1].amount += balance; b[1].count++; }
      else if (days < 90) { b[2].amount += balance; b[2].count++; }
      else { b[3].amount += balance; b[3].count++; }
    }
    return b;
  }, [invoices]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Invoices</h1>

      {/* Aging Buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {buckets.map((b) => (
          <div
            key={b.label}
            className="rounded-lg border border-white/10 bg-tippd-charcoal p-3 sm:p-4"
          >
            <p className="text-xs text-tippd-ash">{b.label}</p>
            <p className={`text-lg sm:text-xl font-bold mt-1 ${b.color}`}>
              {formatCurrency(b.amount)}
            </p>
            <p className="text-xs text-tippd-ash mt-1">
              {b.count} invoice{b.count !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tippd-ash" />
          <input
            type="text"
            placeholder="Search customer or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm placeholder:text-tippd-ash focus:outline-none focus:border-tippd-blue"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-tippd-ash" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm focus:outline-none focus:border-tippd-blue"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-tippd-steel/50 text-left">
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">
                Invoice #
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">
                Customer
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">
                Issued
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">
                Due
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase text-right whitespace-nowrap hidden sm:table-cell">
                Total
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase text-right whitespace-nowrap hidden sm:table-cell">
                Paid
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase text-right whitespace-nowrap">
                Balance
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase text-right whitespace-nowrap hidden sm:table-cell">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-tippd-ash text-sm">
                  Loading invoices...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-tippd-ash text-sm">
                  {search
                    ? "No invoices match your search."
                    : "No invoices yet."}
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const s = INVOICE_STATUS_COLORS[inv.status];
                const balance = inv.total_amount - inv.amount_paid;
                return (
                  <tr key={inv.id} className="hover:bg-white/5 group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-sm font-mono font-medium text-tippd-blue hover:underline"
                      >
                        {inv.invoice_number || "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-sm font-medium text-white hover:text-tippd-blue"
                      >
                        {inv.customer_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap hidden sm:table-cell">
                      {formatDate(inv.issued_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap hidden sm:table-cell">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-medium whitespace-nowrap hidden sm:table-cell">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-400 text-right whitespace-nowrap hidden sm:table-cell">
                      {inv.amount_paid > 0 ? formatCurrency(inv.amount_paid) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                      <span className={balance > 0 ? "text-red-400" : "text-emerald-400"}>
                        {formatCurrency(balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="p-1.5 rounded hover:bg-white/10 text-tippd-ash hover:text-white"
                          title="View Details"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/invoices/${inv.id}/print`}
                          target="_blank"
                          className="p-1.5 rounded hover:bg-white/10 text-tippd-ash hover:text-white"
                          title="Download PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
