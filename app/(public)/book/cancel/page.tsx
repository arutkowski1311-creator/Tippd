import Link from "next/link";
import { XCircle, MessageSquare, Phone, ArrowRight } from "lucide-react";

export default function BookingCancelPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <XCircle className="w-9 h-9 text-amber-600" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Complete</h1>
      <p className="text-gray-500 mb-8">
        Your payment method was not saved and your booking is not confirmed. No charges have been made.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-left mb-8 space-y-3">
        <p className="text-sm font-semibold text-gray-700">What you can do:</p>
        <ul className="space-y-2 text-sm text-gray-600 list-disc pl-4">
          <li>Try again — your information was saved and you can restart the checkout</li>
          <li>Contact us if you have questions about the booking process</li>
          <li>No charges have been made to your card</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
        <Link
          href="/book"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-tippd-blue text-white rounded-md font-semibold hover:opacity-90"
        >
          Try Again <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-900 mb-1">Need help?</p>
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
    </div>
  );
}
