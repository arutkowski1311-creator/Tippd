"use client";

import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { JOB_STATUS_COLORS } from "@/lib/constants";
import type { JobStatus } from "@/types/job";

const MOCK_JOBS = [
  { id: "1", customer_name: "Mike Johnson", drop_address: "123 Oak St, Springfield", status: "active" as JobStatus, dumpster_unit_number: "D-012", truck_name: "Truck 1", created_at: "2026-03-24" },
  { id: "2", customer_name: "Sarah Williams", drop_address: "456 Elm Ave, Westfield", status: "scheduled" as JobStatus, dumpster_unit_number: "D-034", truck_name: "Truck 2", created_at: "2026-03-25" },
  { id: "3", customer_name: "Bob's Construction", drop_address: "789 Industrial Blvd", status: "pending_approval" as JobStatus, dumpster_unit_number: null, truck_name: null, created_at: "2026-03-26" },
  { id: "4", customer_name: "Lisa Chen", drop_address: "321 Maple Dr, Cranford", status: "picked_up" as JobStatus, dumpster_unit_number: "D-007", truck_name: "Truck 1", created_at: "2026-03-22" },
  { id: "5", customer_name: "Premier Roofing", drop_address: "555 Commerce Way", status: "invoiced" as JobStatus, dumpster_unit_number: "D-019", truck_name: "Truck 2", created_at: "2026-03-20" },
];

export default function JobsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <Link
          href="/dashboard/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tippd-ash" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full h-9 pl-9 pr-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm placeholder:text-tippd-ash outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-md text-sm text-tippd-smoke hover:text-white">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-tippd-steel/50 text-left">
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Customer</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Address</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">Dumpster</th>
              <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">Truck</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MOCK_JOBS.map((job) => {
              const statusStyle = JOB_STATUS_COLORS[job.status];
              return (
                <tr key={job.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/jobs/${job.id}`} className="text-sm font-medium text-white hover:text-tippd-blue">
                      {job.customer_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap">{job.drop_address}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap hidden sm:table-cell">{job.dumpster_unit_number || "—"}</td>
                  <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap hidden sm:table-cell">{job.truck_name || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
