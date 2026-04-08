"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Calculator } from "lucide-react";

const SCENARIOS = [
  { label: "Add dumpsters", param: "units" },
  { label: "Sell dumpsters", param: "units" },
  { label: "Change base rate", param: "dollars" },
  { label: "Demand increase", param: "percent" },
  { label: "Add a truck", param: "cost" },
];

export default function WhatIfSimulator() {
  const [scenario, setScenario] = useState(0);
  const [value, setValue] = useState("5");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <Calculator className="w-5 h-5 text-tippd-green" />
        <h1 className="text-2xl font-bold text-white">What-If Simulator</h1>
      </div>

      <p className="text-sm text-tippd-smoke mb-6">Slide a number, see the full model instantly.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
          <h2 className="text-sm font-medium text-tippd-smoke mb-4">Scenario</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {SCENARIOS.map((s, i) => (
              <button key={i} onClick={() => setScenario(i)} className={`px-3 py-1.5 rounded text-xs font-medium ${scenario === i ? "bg-tippd-blue text-white" : "bg-tippd-steel text-tippd-smoke hover:text-white"}`}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-tippd-smoke mb-2">
              {SCENARIOS[scenario].param === "units" ? "Number of units" :
               SCENARIOS[scenario].param === "dollars" ? "Rate change ($)" :
               SCENARIOS[scenario].param === "percent" ? "Increase (%)" :
               "Purchase price ($)"}
            </label>
            <input
              type="range"
              min={1}
              max={SCENARIOS[scenario].param === "cost" ? 120000 : SCENARIOS[scenario].param === "percent" ? 50 : SCENARIOS[scenario].param === "dollars" ? 100 : 20}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full"
            />
            <div className="text-center mt-2">
              <span className="text-3xl font-bold text-white">
                {SCENARIOS[scenario].param === "dollars" || SCENARIOS[scenario].param === "cost" ? "$" : ""}
                {Number(value).toLocaleString()}
                {SCENARIOS[scenario].param === "percent" ? "%" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="rounded-lg border border-tippd-green/30 bg-tippd-green/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-tippd-green" />
            <h2 className="text-sm font-medium text-white">Projected Impact</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-tippd-smoke">Revenue Impact</span>
              <span className="text-emerald-400 font-bold">+$4,920/yr</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-tippd-smoke">Cost</span>
              <span className="text-white">$16,000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-tippd-smoke">Payback Period</span>
              <span className="text-white">7.8 months</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-tippd-smoke">Utilization After</span>
              <span className="text-white">78% (healthy)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-tippd-smoke">Route Efficiency</span>
              <span className="text-emerald-400">-4.2 dead mi/day</span>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-tippd-smoke">
                Adding {value} used units at $3,200 each would reduce fleet utilization from 91% to 78%,
                eliminate booking delays, and improve dump-to-drop chaining by an estimated 4.2 miles/day.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
