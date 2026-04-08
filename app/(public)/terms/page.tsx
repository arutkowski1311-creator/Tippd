import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-tippd-blue text-sm hover:underline mb-6 inline-block">
        ← Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
      <p className="text-gray-500 text-sm mb-8">
        Metro Waste Service — Dumpster Rental Agreement
      </p>
      <p className="text-xs text-gray-400 mb-8">Last updated: April 2026</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-6">

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">1. Rental Period</h2>
          <p>The standard rental period is <strong>seven (7) calendar days</strong> beginning on the date of delivery. The rental period includes delivery, use, and scheduled pickup of the dumpster.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">2. Pricing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>10 Yard Dumpster: <strong>$550</strong> — includes 2 tons of waste</li>
            <li>20 Yard Dumpster: <strong>$750</strong> — includes 4 tons of waste</li>
            <li>30 Yard Dumpster: <strong>$850</strong> — includes 5 tons of waste</li>
          </ul>
          <p className="mt-2">Pricing includes delivery, standard 7-day rental, pickup, and disposal of included tonnage.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">3. Deposit &amp; Payment Authorization</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>A refundable deposit of <strong>25%</strong> of the dumpster rental price is required at the time of booking.</li>
            <li>By saving your payment method during booking, you authorize Metro Waste to charge the deposit once your delivery date is confirmed.</li>
            <li>Your card will <strong>not</strong> be charged at the time of booking &mdash; only when Metro Waste confirms your delivery date.</li>
            <li>If Metro Waste cannot accommodate your requested delivery date, no deposit will be charged.</li>
            <li>The deposit is applied as a credit toward your final invoice.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">4. Date Confirmation &amp; Availability</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your requested delivery date is subject to availability based on equipment, scheduling, and service area capacity.</li>
            <li>Metro Waste will review your request and confirm or propose an alternative delivery date.</li>
            <li>Your payment method will not be charged until the delivery date is confirmed by Metro Waste.</li>
            <li>You will be notified via text message once your date is confirmed and the deposit has been charged.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">5. Cancellation &amp; Refund Policy</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cancellations made <strong>48 or more hours</strong> before the confirmed delivery date: <strong>full deposit refund</strong>.</li>
            <li>Cancellations made <strong>less than 48 hours</strong> before the confirmed delivery date: <strong>deposit is forfeited</strong>.</li>
            <li>If Metro Waste cancels or cannot fulfill your booking, your deposit will be refunded in full regardless of timing.</li>
            <li>Refunds are processed to the original payment method and may take 5&ndash;10 business days to appear on your statement.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">6. Weight Overage</h2>
          <p>Waste exceeding the included tonnage will be charged at <strong>$150 per ton</strong>. Weight is determined at the transfer/disposal facility. Customer will be invoiced for any overage.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">7. Daily Overage (Extended Rental)</h2>
          <p>If the dumpster is not ready for pickup at the end of the 7-day rental period, a daily overage charge of <strong>$25 per day</strong> will apply for each additional day the dumpster remains on site.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">8. Payment Terms</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Payment is due within <strong>30 days</strong> of invoice date (Net 30).</li>
            <li>Accepted payment methods: credit card, ACH, check, or online payment via invoice link.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">9. Late Payment Fees</h2>
          <p>The following late fees apply to unpaid invoices:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>30 days past due:</strong> First reminder notice sent.</li>
            <li><strong>45 days past due:</strong> Second reminder notice sent.</li>
            <li><strong>60 days past due:</strong> A late fee of <strong>7%</strong> of the outstanding balance will be applied.</li>
            <li><strong>80 days past due:</strong> An additional late fee of <strong>10%</strong> of the outstanding balance will be applied.</li>
            <li><strong>90+ days past due:</strong> Account may be referred to collections. Customer is responsible for all collection costs and legal fees.</li>
          </ul>
          <p className="mt-2 text-sm text-gray-600">By booking a dumpster rental with Metro Waste, you acknowledge and agree to these late payment terms.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">10. Prohibited Materials</h2>
          <p>The following materials are <strong>strictly prohibited</strong> and may not be placed in any dumpster:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hazardous waste (chemicals, solvents, pesticides, paint)</li>
            <li>Asbestos or asbestos-containing materials</li>
            <li>Medical or infectious waste</li>
            <li>Tires</li>
            <li>Batteries (automotive, lithium, lead-acid)</li>
            <li>Appliances containing refrigerants (freon)</li>
            <li>Electronics (TVs, monitors, computers)</li>
            <li>Flammable liquids or compressed gas cylinders</li>
            <li>Radioactive materials</li>
          </ul>
          <p className="mt-2">Disposal of prohibited materials will result in additional charges, including but not limited to removal fees, environmental remediation costs, and fines imposed by regulatory agencies. Customer is solely responsible for all such costs.</p>
          <p className="mt-1">For hazardous waste disposal, please contact us directly at <strong>(908) 725-0456</strong>.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">11. Placement &amp; Access</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Customer is responsible for ensuring adequate access for delivery and pickup of the dumpster, including clear overhead clearance and firm, level ground.</li>
            <li>Customer must obtain any required permits for dumpster placement on public property (streets, sidewalks).</li>
            <li>Metro Waste is not responsible for damage to driveways, landscaping, or underground utilities caused by the weight of the dumpster or delivery vehicle.</li>
            <li>Dumpsters should not be filled above the rim. Overloaded dumpsters may incur additional charges and/or require partial unloading before transport.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">12. Scheduling</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Delivery and pickup dates are scheduled at the time of booking. Specific time windows are provided the evening before the scheduled date.</li>
            <li>Metro Waste reserves the right to reschedule deliveries or pickups due to weather, equipment availability, or operational constraints. Customers will be notified promptly of any schedule changes.</li>
            <li>Cancellation and refund terms are governed by Section 5 of these Terms &amp; Conditions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">13. Liability &amp; Indemnification</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Customer assumes all risk for the contents of the dumpster and warrants that only permitted materials will be disposed of.</li>
            <li>Customer agrees to indemnify and hold harmless Metro Waste from any claims, damages, or penalties arising from prohibited materials, improper use, or violations of local ordinances.</li>
            <li>Metro Waste&apos;s liability is limited to the cost of the rental service provided.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">14. SMS Communications &amp; Consent</h2>
          <p>By providing your phone number and booking a service, you expressly consent to receive automated SMS text messages related to your service. These include booking confirmations, scheduling updates, driver ETAs, invoices, and payment reminders.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Reply <strong>STOP</strong> to opt out of SMS at any time</li>
            <li>Reply <strong>HELP</strong> for assistance</li>
            <li>Opting out may affect our ability to provide time-sensitive service updates</li>
            <li>Standard message and data rates may apply</li>
          </ul>
          <p className="mt-2 text-sm text-gray-600">
            For full details on how we handle your data, see our{" "}
            <a href="/privacy" className="text-tippd-blue hover:underline">Privacy Policy</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">15. Governing Law</h2>
          <p>These terms are governed by the laws of the State of New Jersey. Any disputes shall be resolved in the courts of Somerset County, New Jersey.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">16. Acceptance</h2>
          <p>By placing a booking online, by phone, or by text message, you acknowledge that you have read, understand, and agree to these Terms & Conditions.</p>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Metro Waste</strong><br />
            1 Drake Street, Bound Brook, NJ 08805<br />
            (908) 725-0456<br />
            Powered by Tippd
          </p>
        </div>
      </div>
    </div>
  );
}
