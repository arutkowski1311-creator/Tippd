import Link from "next/link";
import { CheckCircle2, MessageSquare, Phone } from "lucide-react";

export default function BookingConfirmPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-tippd-green/10 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-tippd-green" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Received!</h1>
      <p className="text-gray-500 mb-8">
        We&apos;ve got your request and will confirm your delivery date shortly. You&apos;ll receive a text message to confirm.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-left mb-8 space-y-3">
        <p className="text-sm font-semibold text-gray-700">What happens next:</p>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
          <li>We&apos;ll review your request and confirm availability</li>
          <li>You&apos;ll receive a confirmation text with your booking details</li>
          <li>The evening before delivery, you&apos;ll get a 4-hour arrival window via text</li>
          <li>Your driver will text when they&apos;re on the way</li>
        </ol>
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
