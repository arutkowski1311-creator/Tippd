"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, Filter, Search, Printer } from "lucide-react";
import { QUOTE_STATUS_COLORS } from "@/lib/constants";
import type { Quote } from "@/types/quote";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All Quotes" },
  { value: "draft", label: "Drafts" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Converted" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadQuotes();
  }, [statusFilter]);

  async function loadQuotes() {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/quotes?status=${statusFilter}`
        : "/api/quotes";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (e) {
      console.error("Failed to load quotes", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? quotes.filter(
        (q) =>
          q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          (q.quote_number || "").toLowerCase().includes(search.toLowerCase())
      )
    : quotes;

  // Summary stats
  const totalActive = quotes.filter((q) =>
    ["sent", "viewed"].includes(q.status)
  ).length;
  const totalApproved = quotes.filter((q) => q.status === "approved").length;
  const totalValue = quotes
    .filter((q) => ["sent", "viewed", "approved"].includes(q.status))
    .reduce((sum, q) => sum + q.total, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
          <p className="text-sm text-tippd-smoke mt-1">
            {totalActive} active &bull; {totalApproved} approved &bull;{" "}
            {formatCurrency(totalValue)} pipeline
          </p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Quote
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tippd-ash" />
          <input
            type="text"
            placeholder="Search customer or quote #..."
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
                Quote #
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">
                Customer
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">
                Date
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase text-right whitespace-nowrap">
                Total
              </th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase text-right whitespace-nowrap hidden sm:table-cell">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-tippd-ash text-sm">
                  Loading quotes...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-tippd-ash text-sm">
                  {search ? "No quotes match your search." : "No quotes yet. Create your first quote!"}
                </td>
              </tr>
            ) : (
              filtered.map((q) => {
                const s = QUOTE_STATUS_COLORS[q.status];
                return (
                  <tr key={q.id} className="hover:bg-white/5 group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/quotes/${q.id}`}
                        className="text-sm font-mono font-medium text-tippd-blue hover:underline"
                      >
                        {q.quote_number || "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/quotes/${q.id}`}
                        className="text-sm font-medium text-white hover:text-tippd-blue"
                      >
                        {q.customer_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap hidden sm:table-cell">
                      {formatDate(q.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-medium whitespace-nowrap">
                      {formatCurrency(q.total)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/dashboard/quotes/${q.id}`}
                          className="p-1.5 rounded hover:bg-white/10 text-tippd-ash hover:text-white"
                          title="View"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/quotes/${q.id}/print`}
                          target="_blank"
                          className="p-1.5 rounded hover:bg-white/10 text-tippd-ash hover:text-white"
                          title="Print / PDF"
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
