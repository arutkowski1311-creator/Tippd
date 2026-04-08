import Link from "next/link";
import { cn } from "@/lib/utils";

const MOCK_JOBS = [
  { id: "1", address: "555 Commerce Way", size: "20yd", status: "active", date: "Mar 24", dumpster: "D-041" },
  { id: "2", address: "100 Industrial Blvd", size: "20yd", status: "paid", date: "Mar 10", dumpster: "D-019" },
  { id: "3", address: "200 Warehouse Rd", size: "10yd", status: "paid", date: "Feb 20", dumpster: "D-012" },
];

export default function PortalJobs() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Jobs</h1>
      <div className="space-y-3">
        {MOCK_JOBS.map((job) => (
          <Link key={job.id} href={`/portal/jobs/${job.id}`} className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-tippd-blue/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{job.address}</p>
                <p className="text-sm text-gray-500 mt-1">{job.size} — {job.dumpster} — {job.date}</p>
              </div>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium",
                job.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
              )}>
                {job.status === "active" ? "Active" : "Completed"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
