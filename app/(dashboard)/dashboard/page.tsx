"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Box,
  DollarSign,
  Truck,
  ChevronRight,
  X,
  Check,
  Eye,
  Clock,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */

type PendingJob = {
  id: string;
  customer_name: string;
  customer_phone: string;
  drop_address: string;
  job_type: string;
  base_rate: number;
  created_at: string;
  requested_drop_start: string | null;
  dumpster_size: string | null;
  notes: string | null;
  deposit_amount: number | null;
  deposit_status: string | null;
  stripe_payment_method_id: string | null;
};

type RevenueJob = {
  id: string;
  customer_name: string;
  drop_address: string;
  base_rate: number;
  status: string;
  updated_at: string;
};

type RecentActivity = {
  id: string;
  customer_name: string;
  status: string;
  updated_at: string;
  job_type: string;
};

/* ─── Status helpers ─── */

const ACTIVE_STATUSES = [
  "scheduled",
  "en_route_drop",
  "dropped",
  "active",
  "pickup_requested",
  "pickup_scheduled",
  "en_route_pickup",
];

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    en_route_drop: "En Route (Drop)",
    dropped: "Dropped",
    active: "Active",
    pickup_requested: "Pickup Requested",
    pickup_scheduled: "Pickup Scheduled",
    en_route_pickup: "En Route (Pickup)",
    pending_approval: "Pending Approval",
    completed: "Completed",
    paid: "Paid",
    invoiced: "Invoiced",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  if (["en_route_drop", "en_route_pickup"].includes(status)) return "bg-indigo-500/20 text-indigo-400";
  if (["scheduled", "pickup_scheduled"].includes(status)) return "bg-blue-500/20 text-blue-400";
  if (["dropped", "active"].includes(status)) return "bg-emerald-500/20 text-emerald-400";
  if (status === "pickup_requested") return "bg-orange-500/20 text-orange-400";
  if (status === "paid") return "bg-green-500/20 text-green-400";
  if (status === "invoiced") return "bg-amber-500/20 text-amber-400";
  if (status === "cancelled") return "bg-red-500/20 text-red-400";
  return "bg-white/10 text-tippd-ash";
}

/* ─── Main Component ─── */

export default function DashboardOverview() {
  const router = useRouter();

  // Stats
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [boxesOut, setBoxesOut] = useState<number>(0);
  const [boxesTotal, setBoxesTotal] = useState<number>(0);
  const [revenueToday, setRevenueToday] = useState<number>(0);
  const [trucksOnRoute, setTrucksOnRoute] = useState<number>(0);
  const [trucksTotal, setTrucksTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Revenue slide-down
  const [showRevenue, setShowRevenue] = useState(false);
  const [revenueJobs, setRevenueJobs] = useState<RevenueJob[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  // Pending approval
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);

  // Recent activity
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Modal
  const [modalJob, setModalJob] = useState<PendingJob | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Active jobs count
    const { count: activeCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ACTIVE_STATUSES);
    setActiveJobsCount(activeCount || 0);

    // Boxes out (deployed) vs total
    const { count: deployedCount } = await supabase
      .from("dumpsters")
      .select("*", { count: "exact", head: true })
      .eq("status", "deployed");
    const { count: totalDumpsters } = await supabase
      .from("dumpsters")
      .select("*", { count: "exact", head: true });
    setBoxesOut(deployedCount || 0);
    setBoxesTotal(totalDumpsters || 0);

    // Revenue today: sum of base_rate for paid/invoiced jobs today
    const { data: revData } = await supabase
      .from("jobs")
      .select("base_rate")
      .in("status", ["paid", "invoiced"])
      .gte("updated_at", todayStart.toISOString())
      .lte("updated_at", todayEnd.toISOString());
    const totalRev = (revData || []).reduce((sum: number, j: any) => sum + (j.base_rate || 0), 0);
    setRevenueToday(totalRev);

    // Trucks on route: distinct truck_ids on active jobs today
    const { data: truckJobData } = await supabase
      .from("jobs")
      .select("truck_id")
      .in("status", ACTIVE_STATUSES)
      .not("truck_id", "is", null);
    const uniqueTrucks = new Set((truckJobData || []).map((j: any) => j.truck_id));
    setTrucksOnRoute(uniqueTrucks.size);

    const { count: totalTruckCount } = await supabase
      .from("trucks")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    setTrucksTotal(totalTruckCount || 0);

    // Pending approval jobs
    const { data: pendingData } = await supabase
      .from("jobs")
      .select("id, customer_name, customer_phone, drop_address, job_type, base_rate, created_at, requested_drop_start, notes, deposit_amount, deposit_status, stripe_payment_method_id")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });
    setPendingJobs((pendingData as PendingJob[]) || []);

    // Recent activity: last 10 updated jobs
    const { data: activityData } = await supabase
      .from("jobs")
      .select("id, customer_name, status, updated_at, job_type")
      .order("updated_at", { ascending: false })
      .limit(10);
    setRecentActivity((activityData as RecentActivity[]) || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch revenue detail
  async function fetchRevenueDetail() {
    if (showRevenue) {
      setShowRevenue(false);
      return;
    }
    setRevenueLoading(true);
    setShowRevenue(true);
    const supabase = createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("jobs")
      .select("id, customer_name, drop_address, base_rate, status, updated_at")
      .in("status", ["paid", "invoiced"])
      .gte("updated_at", todayStart.toISOString())
      .lte("updated_at", todayEnd.toISOString())
      .order("updated_at", { ascending: false });

    setRevenueJobs((data as RevenueJob[]) || []);
    setRevenueLoading(false);
  }

  // Approve job (charges deposit if payment method is saved)
  const [approveError, setApproveError] = useState<string | null>(null);

  async function approveJob(jobId: string) {
    setActionLoading(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setApproveError(data.error || "Failed to approve job");
        setActionLoading(false);
        return;
      }
      setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
      setModalJob(null);
      fetchData();
    } catch {
      setApproveError("Network error. Please try again.");
    }
    setActionLoading(false);
  }

  // Decline job
  async function declineJob(jobId: string) {
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("jobs").update({ status: "cancelled" }).eq("id", jobId);
    setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
    setModalJob(null);
    setActionLoading(false);
    fetchData();
  }

  // Format currency
  function fmtCurrency(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  }

  // Time ago
  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-tippd-blue animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Active Jobs"
          value={String(activeJobsCount)}
          icon={CalendarCheck}
          color="text-tippd-blue"
          onClick={() => router.push("/dashboard/jobs?status=active")}
        />
        <StatCard
          label="Boxes Out"
          value={`${boxesOut} / ${boxesTotal}`}
          icon={Box}
          color="text-tippd-green"
          onClick={() => router.push("/dashboard/fleet?status=in_use")}
        />
        <StatCard
          label="Revenue Today"
          value={fmtCurrency(revenueToday)}
          icon={DollarSign}
          color="text-emerald-400"
          onClick={fetchRevenueDetail}
          active={showRevenue}
        />
        <StatCard
          label="Trucks on Route"
          value={`${trucksOnRoute} / ${trucksTotal}`}
          icon={Truck}
          color="text-blue-400"
          onClick={() => router.push("/dashboard/dispatch")}
        />
      </div>

      {/* Revenue slide-down panel */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out mb-4",
          showRevenue ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Today&apos;s Revenue Breakdown
            </h3>
            <button onClick={() => setShowRevenue(false)} className="text-tippd-ash hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {revenueLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            </div>
          ) : revenueJobs.length === 0 ? (
            <p className="text-sm text-tippd-ash py-2">No paid or invoiced jobs today.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {revenueJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between py-2 px-3 rounded bg-white/5">
                  <div>
                    <p className="text-sm font-medium text-white">{j.customer_name}</p>
                    <p className="text-xs text-tippd-ash">{j.drop_address.split(",")[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{fmtCurrency(j.base_rate)}</p>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full", getStatusColor(j.status))}>
                      {j.status}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-sm font-medium text-tippd-smoke">Total</span>
                <span className="text-sm font-bold text-emerald-400">
                  {fmtCurrency(revenueJobs.reduce((s, j) => s + j.base_rate, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Approval + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approval */}
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Pending Approval
            </h2>
            {pendingJobs.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                {pendingJobs.length}
              </span>
            )}
          </div>
          {pendingJobs.length === 0 ? (
            <p className="text-tippd-smoke text-sm">No pending bookings right now.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pendingJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setModalJob(job)}
                  className="w-full text-left p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{job.customer_name}</p>
                      <p className="text-xs text-tippd-ash mt-0.5">{job.drop_address.split(",")[0]}</p>
                      <p className="text-xs text-amber-400 mt-1">
                        {fmtCurrency(job.base_rate)} &middot; {job.job_type}
                        {job.requested_drop_start && (
                          <span className="text-tippd-ash"> &middot; {new Date(job.requested_drop_start).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-tippd-ash group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-tippd-blue" />
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-tippd-smoke text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded bg-white/5">
                  <div className="flex items-center gap-2">
                    {a.job_type === "pickup" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-white">{a.customer_name}</p>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full", getStatusColor(a.status))}>
                        {getStatusLabel(a.status)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-tippd-ash shrink-0">{timeAgo(a.updated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Approval Modal */}
      {modalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalJob(null)}>
          <div
            className="bg-tippd-charcoal border border-white/10 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Job Review</h3>
              <button onClick={() => setModalJob(null)} className="text-tippd-ash hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs text-tippd-ash uppercase tracking-wide">Customer</label>
                <p className="text-sm text-white font-medium">{modalJob.customer_name}</p>
              </div>
              <div>
                <label className="text-xs text-tippd-ash uppercase tracking-wide">Phone</label>
                <p className="text-sm text-white">{modalJob.customer_phone || "N/A"}</p>
              </div>
              <div>
                <label className="text-xs text-tippd-ash uppercase tracking-wide">Address</label>
                <p className="text-sm text-white">{modalJob.drop_address}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="text-xs text-tippd-ash uppercase tracking-wide">Type</label>
                  <p className="text-sm text-white">{modalJob.job_type}</p>
                </div>
                <div>
                  <label className="text-xs text-tippd-ash uppercase tracking-wide">Rate</label>
                  <p className="text-sm text-emerald-400 font-bold">{fmtCurrency(modalJob.base_rate)}</p>
                </div>
              </div>
              {modalJob.requested_drop_start && (
                <div>
                  <label className="text-xs text-tippd-ash uppercase tracking-wide">Requested Drop</label>
                  <p className="text-sm text-white">{new Date(modalJob.requested_drop_start).toLocaleDateString()}</p>
                </div>
              )}
              {modalJob.notes && (
                <div>
                  <label className="text-xs text-tippd-ash uppercase tracking-wide">Notes</label>
                  <p className="text-sm text-tippd-smoke">{modalJob.notes}</p>
                </div>
              )}
              {/* Deposit info */}
              {modalJob.deposit_amount && modalJob.deposit_amount > 0 ? (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-tippd-ash uppercase tracking-wide">Deposit (25%)</label>
                    <span className="text-sm font-bold text-emerald-400">{fmtCurrency(modalJob.deposit_amount)}</span>
                  </div>
                  <p className="text-xs text-tippd-ash mt-1">
                    {modalJob.stripe_payment_method_id
                      ? "Card on file — will be charged on approval"
                      : "No card saved — customer may need to re-submit payment"}
                  </p>
                </div>
              ) : null}
            </div>

            {approveError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {approveError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setApproveError(null); approveJob(modalJob.id); }}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {modalJob.stripe_payment_method_id ? "Approve & Charge Deposit" : "Approve"}
              </button>
              <button
                onClick={() => declineJob(modalJob.id)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Decline
              </button>
              <button
                onClick={() => {
                  setModalJob(null);
                  router.push(`/dashboard/jobs/${modalJob.id}`);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-tippd-charcoal p-4 text-left transition-all group cursor-pointer",
        "hover:bg-white/5 hover:border-white/20",
        active ? "border-white/20 bg-white/5" : "border-white/10"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-tippd-smoke">{label}</p>
        <div className="flex items-center gap-1">
          <Icon className={`w-5 h-5 ${color}`} />
          <ChevronRight className="w-3.5 h-3.5 text-tippd-ash opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </button>
  );
}
