import { Box, Receipt, Plus } from "lucide-react";
import Link from "next/link";

export default function PortalDashboard() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contractor Portal</h1>
        <Link
          href="/portal/book"
          className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Book a Dumpster
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <Box className="w-5 h-5 text-tippd-green" />
            <p className="text-sm text-gray-500">Active Dumpsters</p>
          </div>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="w-5 h-5 text-tippd-blue" />
            <p className="text-sm text-gray-500">Outstanding Invoices</p>
          </div>
          <p className="text-3xl font-bold">$0.00</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">Recent Jobs</h2>
        <p className="text-sm text-gray-500">
          No jobs yet. Book your first dumpster to get started.
        </p>
      </div>
    </div>
  );
}
