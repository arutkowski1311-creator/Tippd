"use client";

import { useState } from "react";
import { ArrowRight, Check, MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUMPSTER_SIZE_INFO, OVERAGE_PER_TON } from "@/lib/constants";
import { AddressInput } from "@/components/ui/address-input";
import type { DumpsterSize } from "@/types/dumpster";

export default function PortalBooking() {
  const [size, setSize] = useState<DumpsterSize>("20yd");
  const [address, setAddress] = useState("");
  const [dropLat, setDropLat] = useState<number | null>(null);
  const [dropLng, setDropLng] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const sizeInfo = DUMPSTER_SIZE_INFO[size];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Book a Dumpster</h1>
      <p className="text-gray-500 text-sm mb-6">Your account details will be used automatically.</p>

      <div className="space-y-6">
        {/* Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
          <div className="grid grid-cols-3 gap-3">
            {(["10yd", "20yd", "30yd"] as DumpsterSize[]).map((s) => {
              const info = DUMPSTER_SIZE_INFO[s];
              return (
                <button key={s} onClick={() => setSize(s)} className={cn(
                  "p-4 rounded-lg border-2 text-left",
                  size === s ? "border-tippd-blue bg-tippd-blue/5" : "border-gray-200"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{info.label}</span>
                    {size === s && <Check className="w-4 h-4 text-tippd-blue" />}
                  </div>
                  <p className="text-xl font-bold mt-1">${info.price}</p>
                  <p className="text-xs text-tippd-green font-medium mt-0.5">
                    Includes {info.includedTons} tons
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ${OVERAGE_PER_TON}/ton for every ton over what&apos;s included
          </p>
        </div>

        {/* Hazardous Materials */}
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-amber-900">Hazardous Materials?</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Hazardous waste requires special handling. Don&apos;t book online — text us instead.
              </p>
              <a
                href="sms:+19087250456"
                className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-amber-600 text-white rounded-md text-xs font-semibold hover:opacity-90"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Text Us About Hazmat
              </a>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
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
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm" />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Gate code, placement, etc." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none" />
        </div>

        <button disabled={!address || !date} className="w-full py-3 bg-tippd-blue text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40">
          Book Now — ${sizeInfo.price}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
