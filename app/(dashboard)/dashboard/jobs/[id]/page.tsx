"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Truck, Box, User, Clock, Camera, Scale,
  Calendar, Phone, DollarSign, Loader2, CheckCircle, AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  drop_address: string;
  drop_lat: number | null;
  drop_lng: number | null;
  status: string;
  job_type: string;
  dumpster_id: string | null;
  dumpster_unit_number: string | null;
  truck_id: string | null;
  truck_name: string | null;
  assigned_driver_id: string | null;
  base_rate: number;
  weight_charge: number;
  daily_overage_charge: number;
  discount_amount: number;
  deposit_amount: number | null;
  deposit_status: string | null;
  stripe_payment_intent_id: string | null;
  weight_lbs: number | null;
  days_on_site: number | null;
  requested_drop_start: string | null;
  requested_pickup_start: string | null;
  actual_drop_time: string | null;
  actual_pickup_time: string | null;
  photos_drop: string[];
  photos_pickup: string[];
  notes: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  en_route_drop: "En Route (Drop)",
  dropped: "Dropped",
  active: "Active",
  pickup_requested: "Pickup Requested",
  pickup_scheduled: "Pickup Scheduled",
  en_route_pickup: "En Route (Pickup)",
  picked_up: "Picked Up",
  invoiced: "Invoiced",
  paid: "Paid",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-500/20 text-gray-400",
  scheduled: "bg-blue-500/20 text-blue-400",
  en_route_drop: "bg-indigo-500/20 text-indigo-400",
  dropped: "bg-emerald-500/20 text-emerald-400",
  active: "bg-emerald-500/20 text-emerald-400",
  pickup_requested: "bg-amber-500/20 text-amber-400",
  pickup_scheduled: "bg-blue-500/20 text-blue-400",
  en_route_pickup: "bg-indigo-500/20 text-indigo-400",
  picked_up: "bg-teal-500/20 text-teal-400",
  invoiced: "bg-purple-500/20 text-purple-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function JobDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }
    setJob(data as Job);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  async function handleAction(action: string) {
    if (!job) return;
    setActionLoading(action);
    setFeedback(null);

    try {
      const res = await fetch(`/api/jobs/${job.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback(`✅ ${action === "schedule_pickup" ? "Pickup scheduled" : action === "cancel" ? "Job cancelled" : "Status updated"}`);
        loadJob();
      } else {
        setFeedback(`❌ ${data.error || "Action failed"}`);
      }
    } catch {
      setFeedback("❌ Network error");
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-tippd-blue" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-tippd-smoke">Job not found</p>
        <Link href="/dashboard/jobs" className="text-tippd-blue text-sm mt-2 block">← Back to Jobs</Link>
      </div>
    );
  }

  const total = job.base_rate + (job.weight_charge || 0) + (job.daily_overage_charge || 0) - (job.discount_amount || 0);
  const canSchedulePickup = ["dropped", "active", "pickup_requested"].includes(job.status);
  const canCancel = ["pending", "scheduled"].includes(job.status);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/jobs" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white truncate">{job.customer_name}</h1>
        <span className={cn("px-2.5 py-0.5 rounded text-xs font-medium shrink-0", STATUS_COLORS[job.status] || STATUS_COLORS.pending)}>
          {STATUS_LABELS[job.status] || job.status}
        </span>
      </div>

      {feedback && (
        <div className={cn("mb-4 px-4 py-2 rounded text-sm", feedback.startsWith("✅") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-sm font-medium text-tippd-smoke mb-3">Job Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={User} label="Customer" value={job.customer_name} />
              <InfoRow icon={Phone} label="Phone" value={job.customer_phone || "—"} />
              <InfoRow icon={MapPin} label="Address" value={job.drop_address} />
              <InfoRow icon={Box} label="Dumpster" value={job.dumpster_unit_number || "Not assigned"} />
              <InfoRow icon={Truck} label="Truck" value={job.truck_name || "Not assigned"} />
              <InfoRow icon={Calendar} label="Job Type" value={job.job_type || "—"} />
              <InfoRow icon={Clock} label="Requested Drop" value={formatDate(job.requested_drop_start)} />
              <InfoRow icon={Clock} label="Actual Drop" value={formatDate(job.actual_drop_time)} />
              <InfoRow icon={Clock} label="Requested Pickup" value={formatDate(job.requested_pickup_start)} />
              <InfoRow icon={Clock} label="Actual Pickup" value={formatDate(job.actual_pickup_time)} />
              {job.weight_lbs && <InfoRow icon={Scale} label="Weight" value={`${job.weight_lbs.toLocaleString()} lbs`} />}
              {job.days_on_site && <InfoRow icon={Clock} label="Days on Site" value={`${job.days_on_site} days`} />}
            </div>
          </div>

          {job.notes && (
            <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
              <h2 className="text-sm font-medium text-tippd-smoke mb-2">Notes</h2>
              <p className="text-sm text-white">{job.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Financials */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-sm font-medium text-tippd-smoke mb-3">Financials</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-tippd-smoke">Base rate</span><span className="text-white">${job.base_rate?.toFixed(2) || "0.00"}</span></div>
              <div className="flex justify-between"><span className="text-tippd-smoke">Weight charge</span><span className="text-white">${(job.weight_charge || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-tippd-smoke">Daily overage</span><span className="text-white">${(job.daily_overage_charge || 0).toFixed(2)}</span></div>
              {(job.discount_amount || 0) > 0 && (
                <div className="flex justify-between"><span className="text-tippd-smoke">Discount</span><span className="text-emerald-400">-${job.discount_amount.toFixed(2)}</span></div>
              )}
              <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
                <span className="text-tippd-smoke">Total</span>
                <span className="text-white">${total.toFixed(2)}</span>
              </div>
              {/* Deposit */}
              {job.deposit_amount && job.deposit_amount > 0 && (
                <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-tippd-smoke">Deposit (25%)</span>
                    <span className={
                      job.deposit_status === "charged" ? "text-emerald-400" :
                      job.deposit_status === "refunded" ? "text-amber-400" :
                      job.deposit_status === "forfeited" ? "text-red-400" :
                      "text-tippd-smoke"
                    }>
                      ${job.deposit_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-tippd-ash">Status</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      job.deposit_status === "charged" ? "bg-emerald-500/20 text-emerald-400" :
                      job.deposit_status === "pending" ? "bg-amber-500/20 text-amber-400" :
                      job.deposit_status === "refunded" ? "bg-blue-500/20 text-blue-400" :
                      job.deposit_status === "forfeited" ? "bg-red-500/20 text-red-400" :
                      "bg-white/10 text-tippd-ash"
                    }`}>
                      {job.deposit_status === "charged" ? "Charged" :
                       job.deposit_status === "pending" ? "Pending" :
                       job.deposit_status === "refunded" ? "Refunded" :
                       job.deposit_status === "forfeited" ? "Forfeited" :
                       "None"}
                    </span>
                  </div>
                  {job.deposit_status === "charged" && job.stripe_payment_intent_id && (
                    <button
                      onClick={async () => {
                        if (!confirm("Refund the deposit? This cannot be undone.")) return;
                        const res = await fetch(`/api/jobs/${job.id}/status`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "cancelled" }),
                        });
                        if (res.ok) window.location.reload();
                      }}
                      className="w-full text-xs text-center py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Cancel &amp; Refund Deposit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
            <h2 className="text-sm font-medium text-tippd-smoke mb-3">Actions</h2>
            <div className="space-y-2">
              {canSchedulePickup && (
                <button
                  onClick={() => handleAction("schedule_pickup")}
                  disabled={!!actionLoading}
                  className="w-full py-2.5 text-sm bg-tippd-blue text-white rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === "schedule_pickup" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Schedule Pickup
                </button>
              )}

              <Link
                href={`/dashboard/customers/${job.customer_id}`}
                className="w-full py-2.5 text-sm border border-white/10 text-tippd-smoke rounded-md hover:text-white hover:bg-white/5 flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                View Customer
              </Link>

              {job.customer_phone && (
                <a
                  href={`sms:${job.customer_phone}`}
                  className="w-full py-2.5 text-sm border border-white/10 text-tippd-smoke rounded-md hover:text-white hover:bg-white/5 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Text Customer
                </a>
              )}

              {canCancel && (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this job?")) {
                      handleAction("cancel");
                    }
                  }}
                  disabled={!!actionLoading}
                  className="w-full py-2.5 text-sm border border-red-500/30 text-red-400 rounded-md hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Cancel Job
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-tippd-ash mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-tippd-ash">{label}</p>
        <p className="text-sm text-white break-words">{value}</p>
      </div>
    </div>
  );
}
