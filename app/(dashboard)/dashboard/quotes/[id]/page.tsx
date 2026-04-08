"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Send, Copy, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { QUOTE_STATUS_COLORS } from "@/lib/constants";
import type { Quote, QuoteLineItem } from "@/types/quote";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuote();
  }, [params.id]);

  async function loadQuote() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", params.id)
        .single();

      if (dbError) {
        setError("Quote not found");
        return;
      }
      setQuote(data as unknown as Quote);
    } catch {
      setError("Failed to load quote");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-tippd-ash text-sm">Loading quote...</div>
    );
  }

  if (error || !quote) {
    return (
      <div>
        <Link
          href="/dashboard/quotes"
          className="flex items-center gap-2 text-tippd-smoke hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </Link>
        <div className="p-8 text-red-400">{error || "Quote not found"}</div>
      </div>
    );
  }

  const status = QUOTE_STATUS_COLORS[quote.status];
  const lineItems = (quote.line_items || []) as QuoteLineItem[];
  const discountAmount =
    quote.discount_type === "percent"
      ? (quote.subtotal * quote.discount_value) / 100
      : quote.discount_value || 0;

  const isExpired =
    quote.status !== "approved" &&
    quote.status !== "converted" &&
    new Date(quote.expiry_date) < new Date();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotes"
            className="text-tippd-smoke hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Quote {quote.quote_number || `#${params.id.slice(0, 8)}`}
          </h1>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>
          {isExpired && quote.status !== "expired" && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              Expired
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/quotes/${params.id}/print`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 text-sm text-tippd-smoke hover:text-white hover:border-white/20"
          >
            <Printer className="w-4 h-4" /> PDF
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info Card */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-3">
              Customer
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-tippd-ash block text-xs">Name</span>
                <span className="text-white font-medium">
                  {quote.customer_name}
                </span>
              </div>
              <div>
                <span className="text-tippd-ash block text-xs">Phone</span>
                <span className="text-white">{quote.customer_phone}</span>
              </div>
              {quote.customer_email && (
                <div>
                  <span className="text-tippd-ash block text-xs">Email</span>
                  <span className="text-white">{quote.customer_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-3">
              Line Items
            </h2>
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="pb-2 text-xs text-tippd-ash font-medium">
                    Description
                  </th>
                  <th className="pb-2 text-xs text-tippd-ash font-medium text-center">
                    Qty
                  </th>
                  <th className="pb-2 text-xs text-tippd-ash font-medium text-right">
                    Unit Price
                  </th>
                  <th className="pb-2 text-xs text-tippd-ash font-medium text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-sm text-white">
                      {item.description}
                    </td>
                    <td className="py-2 text-sm text-white text-center">
                      {item.qty}
                    </td>
                    <td className="py-2 text-sm text-white text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-2 text-sm text-white text-right font-medium">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-tippd-ash">Subtotal</span>
                <span className="text-white">{formatCurrency(quote.subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tippd-ash">
                    Discount
                    {quote.discount_type === "percent"
                      ? ` (${quote.discount_value}%)`
                      : ""}
                  </span>
                  <span className="text-red-400">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                <span className="text-white">Total</span>
                <span className="text-white">{formatCurrency(quote.total)}</span>
              </div>
              {quote.deposit_percent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tippd-ash">
                    Deposit Required ({quote.deposit_percent}%)
                  </span>
                  <span className="text-amber-400">
                    {formatCurrency(quote.deposit_amount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Terms */}
          {quote.terms && (
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
              <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-2">
                Terms &amp; Conditions
              </h2>
              <p className="text-sm text-tippd-smoke whitespace-pre-wrap">
                {quote.terms}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details Card */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-3">
            <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide">
              Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-tippd-ash">Quote Number</span>
                <span className="text-white font-mono">
                  {quote.quote_number || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tippd-ash">Created</span>
                <span className="text-white">
                  {formatDate(quote.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tippd-ash">Expires</span>
                <span
                  className={
                    isExpired ? "text-red-400 font-medium" : "text-white"
                  }
                >
                  {formatDate(quote.expiry_date)}
                </span>
              </div>
              {quote.approved_at && (
                <div className="flex justify-between">
                  <span className="text-tippd-ash">Approved</span>
                  <span className="text-emerald-400">
                    {formatDate(quote.approved_at)}
                  </span>
                </div>
              )}
              {quote.declined_at && (
                <div className="flex justify-between">
                  <span className="text-tippd-ash">Declined</span>
                  <span className="text-red-400">
                    {formatDate(quote.declined_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          {quote.internal_notes && (
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
              <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-2">
                Internal Notes
              </h2>
              <p className="text-sm text-amber-200/80 whitespace-pre-wrap">
                {quote.internal_notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-2">
            <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-2">
              Actions
            </h2>
            <button className="w-full flex items-center justify-center gap-2 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">
              <Send className="w-4 h-4" /> Resend to Customer
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2 border border-white/10 text-tippd-smoke rounded-md text-sm hover:text-white hover:border-white/20">
              <Copy className="w-4 h-4" /> Duplicate Quote
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2 border border-white/10 text-tippd-smoke rounded-md text-sm hover:text-white hover:border-white/20">
              <RefreshCw className="w-4 h-4" /> Create Revision
            </button>
            {quote.status === "approved" && (
              <Link
                href={`/dashboard/jobs/new?quote_id=${quote.id}`}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:opacity-90"
              >
                Convert to Job
              </Link>
            )}
          </div>

          {/* Decline Reason */}
          {quote.decline_reason && (
            <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-5">
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
                Decline Reason
              </h2>
              <p className="text-sm text-red-300">{quote.decline_reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
