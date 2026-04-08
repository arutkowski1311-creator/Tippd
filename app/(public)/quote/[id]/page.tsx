"use client";

import { useState } from "react";
import { CheckCircle, XCircle, FileText } from "lucide-react";

export default function QuoteView({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<"pending" | "approved" | "declined">("pending");
  const [declineReason, setDeclineReason] = useState("");

  // TODO: Fetch quote from API using id + token from URL params

  if (status === "approved") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold mt-6">Quote Approved!</h1>
        <p className="text-gray-500 mt-2">
          We&apos;ll be in touch shortly to schedule your delivery.
        </p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <XCircle className="w-16 h-16 text-gray-400 mx-auto" />
        <h1 className="text-2xl font-bold mt-6">Quote Declined</h1>
        <p className="text-gray-500 mt-2">
          No problem. Reach out anytime if you change your mind.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-tippd-blue" />
        <h1 className="text-2xl font-bold">Quote #{params.id.slice(0, 8)}</h1>
      </div>

      {/* Line items placeholder */}
      <div className="rounded-xl border border-gray-200 divide-y">
        <div className="p-4 flex justify-between text-sm">
          <span className="text-gray-500">20 Yard Dumpster — 7 day rental</span>
          <span className="font-medium">$400.00</span>
        </div>
        <div className="p-4 flex justify-between text-sm">
          <span className="text-gray-500">Delivery &amp; Pickup</span>
          <span className="font-medium">Included</span>
        </div>
        <div className="p-4 flex justify-between bg-gray-50 rounded-b-xl">
          <span className="font-bold">Total</span>
          <span className="text-xl font-bold">$400.00</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Weight charges apply at $0.05/lb. Daily overage $25/day after 7 days.
      </p>

      {/* Actions */}
      <div className="mt-8 space-y-3">
        <button
          onClick={() => setStatus("approved")}
          className="w-full py-3 bg-emerald-600 text-white rounded-md font-semibold hover:opacity-90"
        >
          Approve Quote
        </button>
        <div>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason for declining (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm resize-none mb-2"
          />
          <button
            onClick={() => setStatus("declined")}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
          >
            Decline Quote
          </button>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 mt-8">
        This quote expires in 7 days
      </p>
    </div>
  );
}
