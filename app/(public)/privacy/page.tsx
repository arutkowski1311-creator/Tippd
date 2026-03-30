import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Tippd",
  description: "How Tippd collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-tippd-blue text-sm hover:underline mb-6 inline-block">
        ← Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-2 text-gray-900">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-2">Effective Date: March 2026</p>
      <p className="text-xs text-gray-400 mb-8">Tippd — Dumpster Rental Management Platform</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-8">

        <p className="text-gray-700 leading-relaxed">
          This Privacy Policy describes how Tippd ("we," "us," or "our") collects, uses, and shares
          information about you when you use our platform, website, and services (collectively, the
          "Services"). By using our Services, you agree to the collection and use of information in
          accordance with this policy.
        </p>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Information We Collect</h2>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Information You Provide</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>Account information: name, email address, phone number, business name, billing address</li>
            <li>Payment information: processed securely through Stripe — we do not store card numbers</li>
            <li>Job information: service addresses, dumpster size preferences, scheduling preferences</li>
            <li>Communications: messages, voicemails, and texts sent through our platform</li>
            <li>Profile information: contractor account details, tax ID (for contractor accounts)</li>
          </ul>
          <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Information Collected Automatically</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>Location data: GPS coordinates when using the driver app or booking a service</li>
            <li>Device information: browser type, operating system, IP address</li>
            <li>Usage data: pages visited, features used, time spent on the platform</li>
            <li>Booking funnel data: anonymous session data to improve the booking experience</li>
            <li>Communications metadata: timestamps and delivery status of SMS messages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>To provide and improve our Services — dispatch, scheduling, routing, invoicing</li>
            <li>To communicate with you about your bookings, deliveries, pickups, and account</li>
            <li>To send transactional SMS messages related to your service (see SMS section below)</li>
            <li>To process payments and manage billing</li>
            <li>To analyze usage patterns and improve platform performance</li>
            <li>To generate operational analytics and business insights for operators</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. SMS Communications & Text Messaging</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            By providing your phone number and booking a service, you consent to receive SMS text
            messages from the operator using our platform. These messages are transactional in nature
            and include:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
            <li>Booking confirmations</li>
            <li>Day-before delivery window notifications</li>
            <li>Driver arrival and ETA updates</li>
            <li>Delivery and pickup completion confirmations</li>
            <li>Invoice notifications and payment reminders</li>
            <li>Service exception notifications (delays, access issues, rescheduling)</li>
          </ul>
          <p className="text-gray-700 mb-3">
            Message frequency varies by job — typically 4–10 messages per service engagement.
            Standard message and data rates may apply.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
            <p className="text-sm font-semibold text-gray-900 mb-1">Your Opt-Out Rights</p>
            <p className="text-sm text-gray-700">
              Reply <strong>STOP</strong> to any message to unsubscribe from all SMS communications.
              Reply <strong>HELP</strong> for assistance. You can also manage communication preferences
              in your account settings.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Information Sharing</h2>
          <p className="text-gray-700 mb-3">We do not sell your personal information. We share information only as follows:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>
              <strong>With the operator servicing your job</strong> (the dumpster company you booked with) —
              they need your contact and address information to deliver service
            </li>
            <li>
              <strong>With service providers:</strong> Stripe (payments), Twilio (SMS), Resend (email),
              Google (mapping and routing), Supabase (database hosting)
            </li>
            <li>With law enforcement when required by law or to protect our legal rights</li>
            <li>In connection with a business transfer, merger, or acquisition</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. Data Retention</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>Account data: retained while your account is active and for 3 years after closure</li>
            <li>Job records: retained for 7 years for tax and legal compliance</li>
            <li>Communications: retained for 2 years</li>
            <li>Payment records: retained per Stripe&apos;s data retention policies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. Security</h2>
          <p className="text-gray-700 leading-relaxed">
            We implement industry-standard security measures including encryption in transit (TLS),
            encrypted database storage, and role-based access controls. No system is perfectly
            secure — if you believe your account has been compromised, contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li><strong>Access:</strong> request a copy of the personal information we hold about you</li>
            <li><strong>Correction:</strong> request correction of inaccurate information</li>
            <li>
              <strong>Deletion:</strong> request deletion of your account and associated data
              (subject to retention requirements)
            </li>
            <li>
              <strong>Opt-out of SMS:</strong> reply STOP to any message or update your account settings
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            Our Services are not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected information from a
            child, contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">9. Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by email or through the platform. Continued use of our Services after changes
            constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">10. Contact Us</h2>
          <p className="text-gray-700">
            For privacy-related questions or to exercise your rights, contact us at:
          </p>
          <div className="mt-2 text-gray-700">
            <p><strong>Tippd Privacy Team</strong></p>
            <p>Email: privacy@tippd.com</p>
            <p>Website: tippd.com</p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Tippd Privacy Policy · March 2026 ·{" "}
            <Link href="/terms" className="text-tippd-blue hover:underline">Terms of Service</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
