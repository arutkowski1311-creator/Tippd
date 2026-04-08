"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewJob() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/jobs" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Create Job</h1>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Customer Name</label>
              <input className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Phone</label>
              <input className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Drop Address</label>
            <input className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Dumpster Size</label>
              <select className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm">
                <option>10yd</option>
                <option>20yd</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Job Type</label>
              <select className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm">
                <option>Residential</option>
                <option>Commercial</option>
                <option>Construction</option>
                <option>Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Base Rate</label>
              <input defaultValue="300" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Drop Date</label>
            <input type="date" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Notes</label>
            <textarea rows={3} className="w-full px-3 py-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm resize-none" />
          </div>
          <button className="w-full py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">
            Create Job
          </button>
        </div>
      </div>
    </div>
  );
}
