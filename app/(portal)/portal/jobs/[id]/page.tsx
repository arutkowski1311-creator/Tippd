"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Job } from "@/types/job";

export default function PortalJobDetail({ params }: { params: Promise<{ id: string }> }) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setJobId(p.id);
      fetch(`/api/jobs/${p.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setJob(data))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job not found.</p>
        <Link href="/portal/jobs" className="text-tippd-blue text-sm mt-2 inline-block">
          Back to jobs
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    dropped: "bg-amber-100 text-amber-700",
    scheduled: "bg-blue-100 text-blue-700",
    picked_up: "bg-gray-100 text-gray-700",
    invoiced: "bg-orange-100 text-orange-700",
    paid: "bg-green-100 text-green-700",
  };

  return (
    <div>
      <Link href="/portal/jobs" className="text-sm text-tippd-blue mb-4 inline-block">
        ← Back to jobs
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{job.drop_address}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {job.dumpster_unit_number} — {job.job_type}
            </p>
          </div>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              statusColors[job.status] || "bg-gray-100 text-gray-600"
            )}
          >
            {job.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Scheduled Drop</p>
            <p className="font-medium">
              {job.requested_drop_start
                ? new Date(job.requested_drop_start).toLocaleDateString()
                : "TBD"}
            </p>
          </div>
          {job.actual_drop_time && (
            <div>
              <p className="text-gray-500">Dropped</p>
              <p className="font-medium">
                {new Date(job.actual_drop_time).toLocaleDateString()}
              </p>
            </div>
          )}
          {job.actual_pickup_time && (
            <div>
              <p className="text-gray-500">Picked Up</p>
              <p className="font-medium">
                {new Date(job.actual_pickup_time).toLocaleDateString()}
              </p>
            </div>
          )}
          {job.days_on_site != null && (
            <div>
              <p className="text-gray-500">Days on Site</p>
              <p className="font-medium">{job.days_on_site}</p>
            </div>
          )}
          {job.weight_lbs != null && (
            <div>
              <p className="text-gray-500">Weight</p>
              <p className="font-medium">{job.weight_lbs.toLocaleString()} lbs</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Base Rate</p>
            <p className="font-medium">${job.base_rate.toFixed(2)}</p>
          </div>
        </div>

        {job.customer_notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="text-sm mt-1">{job.customer_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
