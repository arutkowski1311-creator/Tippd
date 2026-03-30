"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, MessageSquare, AlertTriangle, Loader2 } from "lucide-react";
import { DUMPSTER_SIZE_INFO, OVERAGE_PER_TON } from "@/lib/constants";
import { AddressInput } from "@/components/ui/address-input";
import type { DumpsterSize } from "@/types/dumpster";
import type { JobType } from "@/types/job";

type WizardStep = "size" | "address" | "date" | "details" | "confirm";

const STEPS: WizardStep[] = ["size", "address", "date", "details", "confirm"];
const METRO_SMS = "sms:+19087250456";

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 animate-pulse"><div className="h-8 bg-gray-200 rounded w-64 mb-4" /><div className="h-4 bg-gray-200 rounded w-96" /></div>}>
      <BookingWizard />
    </Suspense>
  );
}

function BookingWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSize = searchParams.get("size") as DumpsterSize | null;
  const operatorId = searchParams.get("operator_id") || process.env.NEXT_PUBLIC_OPERATOR_ID || "";
  const [step, setStep] = useState<WizardStep>(initialSize ? "address" : "size");
  const [size, setSize] = useState<DumpsterSize>(initialSize || "10yd");
  const [address, setAddress] = useState("");
  const [dropLat, setDropLat] = useState<number | null>(null);
  const [dropLng, setDropLng] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("morning");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [jobType, setJobType] = useState<JobType>("residential");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentIndex = STEPS.indexOf(step);
  const sizeInfo = DUMPSTER_SIZE_INFO[size];
  const price = sizeInfo.price;

  function next() {
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  }

  function back() {
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= currentIndex ? "bg-tippd-blue" : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {/* Step: Size */}
      {step === "size" && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Choose your dumpster size</h1>
          <p className="text-gray-500 mb-6">Price includes delivery, pickup, and 7-day rental.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["10yd", "20yd", "30yd"] as DumpsterSize[]).map((s) => {
              const info = DUMPSTER_SIZE_INFO[s];
              const displayPrice = info.price;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={cn(
                    "p-5 rounded-xl border-2 text-left transition-colors",
                    size === s
                      ? "border-tippd-blue bg-tippd-blue/5"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{info.label}</span>
                    {size === s && <Check className="w-5 h-5 text-tippd-blue" />}
                  </div>
                  <p className="text-2xl font-bold mt-2">${displayPrice}</p>
                  <p className="text-xs text-tippd-green font-medium mt-1">
                    Includes {info.includedTons} tons
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{info.dimensions}</p>
                </button>
              );
            })}
          </div>

          {/* Hazardous Materials */}
          <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-900">Hazardous Materials?</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Hazardous waste requires special handling. Don&apos;t book online — text us instead.
                </p>
                <a
                  href={METRO_SMS}
                  className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-amber-600 text-white rounded-md text-xs font-semibold hover:opacity-90"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Text Us About Hazmat
                </a>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            ${OVERAGE_PER_TON}/ton for every ton over what&apos;s included
          </p>

          <button
            onClick={next}
            className="mt-6 w-full py-3 bg-tippd-blue text-white rounded-md font-semibold flex items-center justify-center gap-2 hover:opacity-90"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step: Address */}
      {step === "address" && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Delivery address</h1>
          <p className="text-gray-500 mb-6">Where should we drop the dumpster?</p>
          <div className="space-y-4">
            <AddressInput
              value={address}
              onChange={setAddress}
              onSelect={(place) => {
                setAddress(place.address);
                setDropLat(place.lat);
                setDropLng(place.lng);
              }}
              placeholder="Start typing an address..."
              className="h-11 text-sm"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site type
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="construction">Construction</option>
                <option value="industrial">Industrial</option>
                <option value="estate_cleanout">Estate Cleanout</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={back} className="px-4 py-3 border border-gray-300 rounded-md text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              disabled={!address}
              className="flex-1 py-3 bg-tippd-blue text-white rounded-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Date */}
      {step === "date" && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Delivery date</h1>
          <p className="text-gray-500 mb-6">
            Pick your preferred date. You&apos;ll receive a 4-hour window the evening before.
          </p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm"
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "morning", label: "Morning", sub: "7am-12pm" },
                { value: "afternoon", label: "Afternoon", sub: "12pm-5pm" },
                { value: "anytime", label: "Anytime", sub: "Most flexible" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTime(t.value)}
                  className={cn(
                    "p-3 rounded-lg border text-center text-sm transition-colors",
                    time === t.value
                      ? "border-tippd-blue bg-tippd-blue/5 text-tippd-blue"
                      : "border-gray-200"
                  )}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.sub}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={back} className="px-4 py-3 border border-gray-300 rounded-md text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              disabled={!date}
              className="flex-1 py-3 bg-tippd-blue text-white rounded-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Your information</h1>
          <p className="text-gray-500 mb-6">We need this to confirm your booking.</p>
          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm"
            />
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm"
              />
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                By providing your phone number, you agree to receive automated SMS messages about
                your dumpster rental, including booking confirmations, delivery windows, driver
                updates, and invoices. Reply STOP to opt out at any time. Msg &amp; data rates may
                apply.{" "}
                <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>
                {" "}·{" "}
                <a href="/terms" className="underline hover:text-gray-700">Terms</a>
              </p>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full h-11 px-3 rounded-md border border-gray-300 text-sm"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={back} className="px-4 py-3 border border-gray-300 rounded-md text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              disabled={!name || !phone}
              className="flex-1 py-3 bg-tippd-blue text-white rounded-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
            >
              Review Booking <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Review your booking</h1>
          <p className="text-gray-500 mb-6">Confirm the details below and proceed to payment.</p>

          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="p-4 flex justify-between">
              <span className="text-sm text-gray-500">Size</span>
              <span className="text-sm font-medium">{sizeInfo.label}</span>
            </div>
<div className="p-4 flex justify-between">
              <span className="text-sm text-gray-500">Included Weight</span>
              <span className="text-sm font-medium">{sizeInfo.includedTons} tons</span>
            </div>
            <div className="p-4 flex justify-between">
              <span className="text-sm text-gray-500">Address</span>
              <span className="text-sm font-medium text-right max-w-[200px]">{address}</span>
            </div>
            <div className="p-4 flex justify-between">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm font-medium">{date}</span>
            </div>
            <div className="p-4 flex justify-between">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm font-medium">{name}</span>
            </div>
            <div className="p-4 flex justify-between">
              <span className="text-sm text-gray-500">Phone</span>
              <span className="text-sm font-medium">{phone}</span>
            </div>
            {notes && (
              <div className="p-4">
                <span className="text-sm text-gray-500">Notes</span>
                <p className="text-sm mt-1">{notes}</p>
              </div>
            )}
            <div className="p-4 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">${price}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                + ${OVERAGE_PER_TON}/ton over {sizeInfo.includedTons} tons
              </p>
            </div>
          </div>

          {submitError && (
            <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={back} disabled={submitting} className="px-4 py-3 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-40">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              disabled={submitting}
              onClick={async () => {
                if (!operatorId) {
                  setSubmitError("Booking configuration error. Please contact us directly.");
                  return;
                }
                setSubmitting(true);
                setSubmitError(null);
                try {
                  // Build drop window based on time preference
                  const dropStart = new Date(`${date}T${time === "afternoon" ? "12:00" : "07:00"}:00`);
                  const dropEnd = new Date(`${date}T${time === "morning" ? "12:00" : "17:00"}:00`);

                  const res = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      operator_id: operatorId,
                      name,
                      phone,
                      email: email || undefined,
                      drop_address: address,
                      drop_lat: dropLat ?? undefined,
                      drop_lng: dropLng ?? undefined,
                      size,
                      job_type: jobType,
                      requested_drop_start: dropStart.toISOString(),
                      requested_drop_end: dropEnd.toISOString(),
                      customer_notes: notes || undefined,
                      sms_consent: true,
                    }),
                  });

                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || "Booking failed. Please try again.");
                  }

                  router.push("/book/confirm");
                } catch (err: unknown) {
                  setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
                  setSubmitting(false);
                }
              }}
              className="flex-1 py-3 bg-tippd-blue text-white rounded-md font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <>Confirm &amp; Pay ${price}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
