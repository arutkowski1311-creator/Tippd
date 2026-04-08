"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Invoice } from "@/types/invoice";

export default function PortalInvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => {
      fetch(`/api/invoices/${p.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setInvoice(data))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-60 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found.</p>
        <Link href="/portal/invoices" className="text-tippd-blue text-sm mt-2 inline-block">
          Back to invoices
        </Link>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";
  const statusColors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    sent: "bg-blue-100 text-blue-700",
    overdue_30: "bg-amber-100 text-amber-700",
    overdue_45: "bg-orange-100 text-orange-700",
    overdue_60: "bg-red-100 text-red-700",
    overdue_80: "bg-red-200 text-red-800",
    collections: "bg-red-300 text-red-900",
  };

  return (
    <div>
      <Link href="/portal/invoices" className="text-sm text-tippd-blue mb-4 inline-block">
        ← Back to invoices
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">
              ${invoice.total_amount.toFixed(2)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Issued {new Date(invoice.issued_date).toLocaleDateString()} — Due{" "}
              {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          </div>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              statusColors[invoice.status] || "bg-gray-100 text-gray-600"
            )}
          >
            {invoice.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Base amount</span>
            <span>${invoice.base_amount.toFixed(2)}</span>
          </div>
          {invoice.weight_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Weight charge</span>
              <span>${invoice.weight_amount.toFixed(2)}</span>
            </div>
          )}
          {invoice.daily_overage_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Overage days</span>
              <span>${invoice.daily_overage_amount.toFixed(2)}</span>
            </div>
          )}
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-${invoice.discount_amount.toFixed(2)}</span>
            </div>
          )}
          {invoice.late_fee_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Late fee</span>
              <span>${invoice.late_fee_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>${invoice.total_amount.toFixed(2)}</span>
          </div>
          {invoice.amount_paid > 0 && !isPaid && (
            <div className="flex justify-between text-emerald-600">
              <span>Paid</span>
              <span>-${invoice.amount_paid.toFixed(2)}</span>
            </div>
          )}
        </div>

        {!isPaid && invoice.pay_link && (
          <a
            href={invoice.pay_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block w-full text-center bg-tippd-blue text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Pay Now — ${(invoice.total_amount - invoice.amount_paid).toFixed(2)}
          </a>
        )}

        {isPaid && invoice.paid_at && (
          <div className="mt-6 text-center text-sm text-emerald-600 font-medium">
            Paid on {new Date(invoice.paid_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
