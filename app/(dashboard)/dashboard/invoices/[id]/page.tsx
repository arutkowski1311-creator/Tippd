"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Send, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INVOICE_STATUS_COLORS } from "@/lib/constants";
import type { Invoice, InvoiceReminderEntry } from "@/types/invoice";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  async function loadInvoice() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();

      if (dbError) {
        setError("Invoice not found");
        return;
      }
      setInvoice(data as unknown as Invoice);
    } catch {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-tippd-ash text-sm">Loading invoice...</div>;
  }

  if (error || !invoice) {
    return (
      <div>
        <Link
          href="/dashboard/invoices"
          className="flex items-center gap-2 text-tippd-smoke hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="p-8 text-red-400">{error || "Invoice not found"}</div>
      </div>
    );
  }

  const status = INVOICE_STATUS_COLORS[invoice.status];
  const balanceDue = invoice.total_amount - invoice.amount_paid;
  const isOverdue = invoice.status.startsWith("overdue") || invoice.status === "collections";
  const reminderLog = (invoice.reminder_log || []) as InvoiceReminderEntry[];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/invoices"
            className="text-tippd-smoke hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Invoice {invoice.invoice_number || `#${params.id.slice(0, 8)}`}
          </h1>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/invoices/${params.id}/print`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 text-sm text-tippd-smoke hover:text-white hover:border-white/20"
          >
            <Printer className="w-4 h-4" /> PDF
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">
            <Send className="w-4 h-4" /> Send to Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-3">
              Customer
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-tippd-ash block text-xs">Name</span>
                <span className="text-white font-medium">
                  {invoice.customer_name}
                </span>
              </div>
              <div>
                <span className="text-tippd-ash block text-xs">Phone</span>
                <span className="text-white">{invoice.customer_phone}</span>
              </div>
              {invoice.customer_email && (
                <div>
                  <span className="text-tippd-ash block text-xs">Email</span>
                  <span className="text-white">{invoice.customer_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Charges Breakdown */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-3">
              Charges
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tippd-smoke">
                  Dumpster Rental — Base Rate
                </span>
                <span className="text-white">
                  {formatCurrency(invoice.base_amount)}
                </span>
              </div>
              {invoice.weight_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tippd-smoke">
                    Weight / Overage Charges
                  </span>
                  <span className="text-white">
                    {formatCurrency(invoice.weight_amount)}
                  </span>
                </div>
              )}
              {invoice.daily_overage_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tippd-smoke">
                    Daily Overage Charges
                  </span>
                  <span className="text-white">
                    {formatCurrency(invoice.daily_overage_amount)}
                  </span>
                </div>
              )}
              {invoice.late_fee_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tippd-smoke">Late Fees</span>
                  <span className="text-red-400">
                    {formatCurrency(invoice.late_fee_amount)}
                  </span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tippd-smoke">Discount</span>
                  <span className="text-emerald-400">
                    -{formatCurrency(invoice.discount_amount)}
                  </span>
                </div>
              )}

              <div className="border-t border-white/10 pt-3 mt-3 space-y-1">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-white">
                    {formatCurrency(invoice.total_amount)}
                  </span>
                </div>
                {invoice.amount_paid > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-tippd-smoke">Amount Paid</span>
                    <span className="text-emerald-400">
                      -{formatCurrency(invoice.amount_paid)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                  <span className="text-white">Balance Due</span>
                  <span
                    className={
                      balanceDue > 0 ? "text-red-400" : "text-emerald-400"
                    }
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reminder History */}
          {reminderLog.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
              <h2 className="text-xs font-semibold text-tippd-ash uppercase tracking-wide mb-3">
                Reminder History
              </h2>
              <div className="space-y-2">
                {reminderLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400 uppercase font-medium">
                        {entry.channel}
                      </span>
                      <span className="text-tippd-smoke">
                        Day {entry.day} reminder
                      </span>
                    </div>
                    <span className="text-tippd-ash text-xs">
                      {formatDateTime(entry.sent_at)}
                    </span>
                  </div>
                ))}
              </div>
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
                <span className="text-tippd-ash">Invoice Number</span>
                <span className="text-white font-mono">
                  {invoice.invoice_number || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tippd-ash">Issued</span>
                <span className="text-white">
                  {formatDate(invoice.issued_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tippd-ash">Due</span>
                <span
                  className={isOverdue ? "text-red-400 font-medium" : "text-white"}
                >
                  {formatDate(invoice.due_date)}
                </span>
              </div>
              {invoice.paid_at && (
                <div className="flex justify-between">
                  <span className="text-tippd-ash">Paid</span>
                  <span className="text-emerald-400">
                    {formatDateTime(invoice.paid_at)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-tippd-ash">Job</span>
                <Link
                  href={`/dashboard/jobs/${invoice.job_id}`}
                  className="text-tippd-blue hover:underline text-xs font-mono"
                >
                  {invoice.job_id.slice(0, 8)}...
                </Link>
              </div>
            </div>
          </div>

          {/* Payment Link */}
          {invoice.pay_link && balanceDue > 0 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-5">
              <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">
                Payment Link
              </h2>
              <a
                href={invoice.pay_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
              >
                <ExternalLink className="w-4 h-4" />
                Open Payment Page
              </a>
            </div>
          )}

          {/* Balance Due Highlight */}
          {balanceDue > 0 && (
            <div
              className={`rounded-lg border p-5 text-center ${
                isOverdue
                  ? "border-red-500/30 bg-red-950/20"
                  : "border-amber-500/30 bg-amber-950/20"
              }`}
            >
              <p className="text-xs text-tippd-ash uppercase tracking-wide mb-1">
                Balance Due
              </p>
              <p
                className={`text-3xl font-bold ${
                  isOverdue ? "text-red-400" : "text-amber-400"
                }`}
              >
                {formatCurrency(balanceDue)}
              </p>
              {isOverdue && (
                <p className="text-xs text-red-300 mt-2">
                  This invoice is overdue
                </p>
              )}
            </div>
          )}

          {/* Paid confirmation */}
          {invoice.status === "paid" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
              <p className="text-xs text-tippd-ash uppercase tracking-wide mb-1">
                Paid in Full
              </p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(invoice.amount_paid)}
              </p>
              {invoice.paid_at && (
                <p className="text-xs text-emerald-300 mt-2">
                  {formatDateTime(invoice.paid_at)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
