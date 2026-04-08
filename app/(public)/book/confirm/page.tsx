"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MessageSquare, Phone, Shield, Loader2 } from "lucide-react";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [confirming, setConfirming] = useState(!!sessionId);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(!sessionId); // If no session_id, show static page

  useEffect(() => {
    if (!sessionId) return;

    // Call our API to retrieve the Stripe session and save the payment method
    fetch(`/api/bookings/confirm?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.deposit_amount) setDepositAmount(data.deposit_amount);
        setConfirmed(true);
      })
      .catch(() => {
        // Even if this fails, show the confirmation — the job was already created
        setConfirmed(true);
      })
      .finally(() => setConfirming(false));
  }, [sessionId]);

  if (confirming) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-tippd-blue mx-auto mb-4" />
        <p className="text-gray-500">Confirming your booking...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-tippd-green/10 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-tippd-green" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Received!</h1>
      <p className="text-gray-500 mb-8">
        Your payment method has been saved. We&apos;ll review your preferred date and confirm availability.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-left mb-6 space-y-3">
        <p className="text-sm font-semibold text-gray-700">What happens next:</p>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
          <li>We&apos;ll review your request and confirm date availability</li>
          <li>
            Once confirmed, your 25% refundable deposit
            {depositAmount ? ` ($${depositAmount.toFixed(2)})` : ""} will be charged
          </li>
          <li>You&apos;ll receive a confirmation text with your booking details</li>
          <li>The evening before delivery, you&apos;ll get a 4-hour arrival window via text</li>
        </ol>
      </div>

      <div className="rounded-xl border border-tippd-blue/20 bg-tippd-blue/5 p-4 text-left mb-8">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-tippd-blue shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-800 mb-1">Deposit Policy</p>
            <ul className="space-y-1 text-xs">
              <li>Your card will only be charged when we confirm your delivery date.</li>
              <li>Fully refundable if cancelled 48+ hours before confirmed delivery.</li>
              <li>If we can&apos;t accommodate your date, no charge will be made.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600 mb-8">
        <p className="font-medium text-gray-900 mb-1">Questions?</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
          <a
            href="sms:+19087250456"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md font-medium hover:opacity-90"
          >
            <MessageSquare className="w-4 h-4" /> Text Us
          </a>
          <a
            href="tel:+19087250456"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
          >
            <Phone className="w-4 h-4" /> (908) 725-0456
          </a>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Reply <strong>STOP</strong> to any text message to opt out of SMS notifications.{" "}
        <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
      </p>
    </div>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-tippd-blue mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
