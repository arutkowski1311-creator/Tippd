"use client";

import { FileText, CreditCard, Download } from "lucide-react";

export default function InvoiceView({ params }: { params: { id: string } }) {
  // TODO: Fetch invoice from API using id + token
  const isPaid = false;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-tippd-blue" />
          <h1 className="text-2xl font-bold">Invoice</h1>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isPaid
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {isPaid ? "Paid" : "Due"}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Invoice #{params.id.slice(0, 8)}
      </p>

      {/* Line items */}
      <div className="rounded-xl border border-gray-200 divide-y">
        <div className="p-4 flex justify-between text-sm">
          <span className="text-gray-500">10 Yard Dumpster — 7 day rental</span>
          <span className="font-medium">$300.00</span>
        </div>
        <div className="p-4 flex justify-between text-sm">
          <span className="text-gray-500">Weight charge (850 lbs @ $0.05/lb)</span>
          <span className="font-medium">$42.50</span>
        </div>
        <div className="p-4 flex justify-between text-sm">
          <span className="text-gray-500">Daily overage (2 days @ $25/day)</span>
          <span className="font-medium">$50.00</span>
        </div>
        <div className="p-4 flex justify-between bg-gray-50">
          <span className="font-bold">Total Due</span>
          <span className="text-xl font-bold">$392.50</span>
        </div>
        <div className="p-4 text-xs text-gray-500">
          Due by April 25, 2026. Late fees apply after 30 days.
        </div>
      </div>

      {/* Actions */}
      {!isPaid && (
        <div className="mt-6 space-y-3">
          <button className="w-full py-3 bg-tippd-blue text-white rounded-md font-semibold hover:opacity-90 flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pay $392.50
          </button>
          <p className="text-xs text-center text-gray-400">
            Secure payment powered by Stripe
          </p>
        </div>
      )}

      <button className="mt-4 w-full py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
        <Download className="w-4 h-4" />
        Download PDF
      </button>
    </div>
  );
}
