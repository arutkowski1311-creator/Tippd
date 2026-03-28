import Link from "next/link";
import { ArrowRight, Phone, Star, Truck, Clock, Shield, MessageSquare, AlertTriangle } from "lucide-react";
import { DUMPSTER_SIZE_INFO, OVERAGE_PER_TON } from "@/lib/constants";

const METRO_PHONE = "(908) 725-0456";
const METRO_PHONE_LINK = "tel:+19087250456";
const METRO_SMS = "sms:+19087250456";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded bg-tippd-navy flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="font-bold text-xl">Metro Waste</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={METRO_PHONE_LINK}
              className="hidden sm:flex items-center gap-2 text-sm text-gray-600"
            >
              <Phone className="w-4 h-4" />
              {METRO_PHONE}
            </a>
            <Link
              href="/login"
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/book"
              className="px-5 py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Book Now
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-tippd-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Dumpster rental,
              <br />
              <span className="text-tippd-green">done right.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-lg">
              Fast delivery, transparent pricing, no hidden fees. Serving Central
              New Jersey — Somerset, Middlesex, Union, Hunterdon, and surrounding counties.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-tippd-blue text-white rounded-md text-base font-semibold hover:opacity-90 transition-opacity"
              >
                Book a Dumpster
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={METRO_PHONE_LINK}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white rounded-md text-base font-medium hover:bg-white/5 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-500 text-center mt-2">
            Choose your size. Price includes delivery, pickup, and 7-day rental.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 max-w-4xl mx-auto">
            {(["10yd", "20yd", "30yd"] as const).map((size) => {
              const info = DUMPSTER_SIZE_INFO[size];
              const isBestValue = size === "30yd";
              return (
                <div
                  key={size}
                  className={`rounded-xl border-2 p-6 transition-colors ${
                    isBestValue
                      ? "border-tippd-blue relative"
                      : "border-gray-200 hover:border-tippd-blue/50"
                  }`}
                >
                  {isBestValue && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-tippd-green text-white rounded-full text-xs font-semibold">
                      Best Value
                    </span>
                  )}
                  <h3 className="text-xl font-bold">{info.label}</h3>
                  <p className="text-4xl font-bold mt-2">
                    ${info.price}
                    <span className="text-base font-normal text-gray-500">
                      /rental
                    </span>
                  </p>
                  <p className="text-sm text-tippd-green font-medium mt-1">
                    Includes {info.includedTons} tons of waste
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{info.dimensions}</p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    {info.description.split(", ").map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/book?size=${size}`}
                    className="mt-6 block text-center px-4 py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90"
                  >
                    Book {info.label}
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            ${OVERAGE_PER_TON}/ton for every ton over what&apos;s included. Daily overage $15/day after 7 days.
          </p>

          {/* Hazardous Materials */}
          <div className="max-w-4xl mx-auto mt-10 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-amber-900">Hazardous Materials?</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Hazardous waste requires special handling. Please contact us directly so we can help you with the right solution.
                </p>
                <a
                  href={METRO_SMS}
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-semibold hover:opacity-90"
                >
                  <MessageSquare className="w-4 h-4" />
                  Text Us About Hazmat
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <Step
              number={1}
              title="Book Online"
              description="Pick your size, enter your address, choose a date. Takes under 2 minutes."
            />
            <Step
              number={2}
              title="We Deliver"
              description="Our driver drops the dumpster at your location on your scheduled date."
            />
            <Step
              number={3}
              title="We Pick Up"
              description="When you're done, request pickup. We haul it away and send your invoice."
            />
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrustCard
              icon={Clock}
              title="Book in 2 Minutes"
              description="Fast online booking, no phone tag"
            />
            <TrustCard
              icon={Shield}
              title="No Hidden Fees"
              description="What you see is what you pay"
            />
            <TrustCard
              icon={Truck}
              title="Family Owned"
              description="Local NJ business, personal service"
            />
            <TrustCard
              icon={Star}
              title="5-Star Service"
              description="Hundreds of happy customers"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-tippd-ink text-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="text-gray-400 mt-2">
            Book online now or give us a call. We make it easy.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-tippd-blue text-white rounded-md font-semibold hover:opacity-90"
            >
              Book a Dumpster
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <p className="text-white font-bold text-lg">Metro Waste</p>
            <p className="text-sm mt-1">
              Professional dumpster rental services — Central New Jersey
            </p>
          </div>
          <div className="text-sm space-y-1">
            <a href={METRO_PHONE_LINK} className="block hover:text-white">
              {METRO_PHONE}
            </a>
            <a
              href="mailto:info@metrowasteservice.com"
              className="block hover:text-white"
            >
              info@metrowasteservice.com
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-gray-800 text-xs text-gray-500">
          Powered by Tippd
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-tippd-blue/10 text-tippd-blue flex items-center justify-center mx-auto text-xl font-bold">
        {number}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function TrustCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-4">
      <Icon className="w-8 h-8 text-tippd-blue mx-auto" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}
