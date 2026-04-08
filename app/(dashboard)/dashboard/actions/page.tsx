"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone,
  Truck,
  Box,
  AlertTriangle,
  Clock,
  Receipt,
  MessageSquare,
  Wrench,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Flag,
  User,
  MapPin,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone, formatTimeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */

type ActionPriority = "urgent" | "high" | "normal" | "low";
type ActionStatus = "open" | "in_progress" | "resolved";

interface ActionItem {
  id: string;
  operator_id: string;
  type: string;
  priority: ActionPriority;
  status: ActionStatus;
  title: string;
  description: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  job_id: string | null;
  truck_id: string | null;
  dumpster_id: string | null;
  driver_id: string | null;
  invoice_id: string | null;
  communication_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

/* ─── Filter types ─── */

type FilterKey =
  | "all"
  | "urgent"
  | "callback"
  | "driver"
  | "trucks"
  | "invoices";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "callback", label: "Callbacks" },
  { key: "driver", label: "Driver" },
  { key: "trucks", label: "Trucks" },
  { key: "invoices", label: "Invoices" },
];

/* ─── Priority config ─── */

const PRIORITY_CONFIG: Record<
  ActionPriority,
  { dot: string; bg: string; label: string }
> = {
  urgent: { dot: "bg-red-500", bg: "bg-red-500/10 text-red-400", label: "Urgent" },
  high: { dot: "bg-orange-500", bg: "bg-orange-500/10 text-orange-400", label: "High" },
  normal: { dot: "bg-blue-500", bg: "bg-blue-500/10 text-blue-400", label: "Normal" },
  low: { dot: "bg-gray-500", bg: "bg-gray-500/10 text-gray-400", label: "Low" },
};

/* ─── Type → icon mapping ─── */

function getTypeIcon(type: string) {
  switch (type) {
    case "callback":
      return Phone;
    case "driver_flag":
      return Flag;
    case "truck_alert":
      return Truck;
    case "overtime_warning":
      return Clock;
    case "box_pulled":
      return Box;
    case "overdue_invoice":
      return Receipt;
    case "complaint":
      return AlertTriangle;
    case "maintenance":
      return Wrench;
    case "pickup_request":
      return MapPin;
    default:
      return Bell;
  }
}

function getTypeLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Resolve modal ─── */

function ResolveModal({
  item,
  onClose,
  onResolve,
  saving,
}: {
  item: ActionItem;
  onClose: () => void;
  onResolve: (id: string, notes: string) => void;
  saving: boolean;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative w-full max-w-md rounded-lg border border-white/10 bg-tippd-charcoal p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Resolve Item</h3>
          <button
            onClick={onClose}
            className="text-tippd-smoke hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-tippd-ash mb-1">{item.title}</p>
        {item.description && (
          <p className="text-xs text-tippd-smoke mb-4">{item.description}</p>
        )}
        <label className="block text-sm font-medium text-tippd-smoke mb-1">
          Resolution notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What did you do? e.g. Called back, scheduled pickup for Thursday..."
          className="w-full rounded-md border border-white/10 bg-tippd-dark px-3 py-2 text-sm text-white placeholder-tippd-smoke focus:outline-none focus:ring-1 focus:ring-tippd-blue resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-tippd-smoke hover:text-white transition-colors rounded-md border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(item.id, notes)}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Mark Resolved
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Action card ─── */

function ActionCard({
  item,
  onMarkDone,
  onSnooze,
  onStartProgress,
}: {
  item: ActionItem;
  onMarkDone: (item: ActionItem) => void;
  onSnooze: (id: string) => void;
  onStartProgress: (id: string) => void;
}) {
  const priorityCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
  const Icon = getTypeIcon(item.type);
  const isInProgress = item.status === "in_progress";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        item.priority === "urgent"
          ? "border-red-500/30 bg-red-950/10"
          : "border-white/5 bg-tippd-charcoal",
        isInProgress && "ring-1 ring-tippd-blue/40"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Priority dot + type icon */}
        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
          <span
            className={cn("w-2.5 h-2.5 rounded-full", priorityCfg.dot)}
            title={priorityCfg.label}
          />
          <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
            <Icon className="w-4 h-4 text-tippd-smoke" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white truncate">
                  {item.title}
                </h3>
                {isInProgress && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-tippd-blue/20 text-tippd-blue uppercase tracking-wider">
                    In Progress
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-tippd-ash mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <span className="text-xs text-tippd-smoke whitespace-nowrap shrink-0">
              {formatTimeAgo(item.created_at)}
            </span>
          </div>

          {/* Context row: customer, job, truck */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {item.customer_name && (
              <span className="flex items-center gap-1 text-xs text-tippd-smoke">
                <User className="w-3 h-3" />
                {item.customer_name}
              </span>
            )}
            {item.customer_phone && (
              <a
                href={`tel:${item.customer_phone}`}
                className="flex items-center gap-1 text-xs text-tippd-blue hover:underline"
              >
                <Phone className="w-3 h-3" />
                {formatPhone(item.customer_phone)}
              </a>
            )}
            {item.job_id && (
              <a
                href={`/dashboard/jobs/${item.job_id}`}
                className="flex items-center gap-1 text-xs text-tippd-smoke hover:text-white transition-colors"
              >
                <MapPin className="w-3 h-3" />
                View Job
              </a>
            )}
            {item.truck_id && (
              <a
                href={`/dashboard/trucks/${item.truck_id}`}
                className="flex items-center gap-1 text-xs text-tippd-smoke hover:text-white transition-colors"
              >
                <Truck className="w-3 h-3" />
                View Truck
              </a>
            )}
            {item.invoice_id && (
              <a
                href={`/dashboard/invoices/${item.invoice_id}`}
                className="flex items-center gap-1 text-xs text-tippd-smoke hover:text-white transition-colors"
              >
                <Receipt className="w-3 h-3" />
                View Invoice
              </a>
            )}
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                priorityCfg.bg
              )}
            >
              {getTypeLabel(item.type)}
            </span>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {item.customer_phone && (
              <a
                href={`tel:${item.customer_phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-tippd-blue text-white hover:opacity-90 transition-opacity"
              >
                <Phone className="w-3 h-3" />
                Call
              </a>
            )}
            {!isInProgress && (
              <button
                onClick={() => onStartProgress(item.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-white/10 text-tippd-smoke hover:text-white hover:border-white/20 transition-colors"
              >
                <Clock className="w-3 h-3" />
                Working On It
              </button>
            )}
            <button
              onClick={() => onMarkDone(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              Mark Done
            </button>
            <button
              onClick={() => onSnooze(item.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-tippd-smoke hover:text-white transition-colors"
            >
              <Clock className="w-3 h-3" />
              Snooze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Resolved card (compact) ─── */

function ResolvedCard({ item }: { item: ActionItem }) {
  const Icon = getTypeIcon(item.type);

  return (
    <div className="rounded-lg border border-white/5 bg-tippd-charcoal/50 p-3 opacity-70">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-tippd-smoke" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-tippd-smoke line-through truncate">
            {item.title}
          </p>
          {item.resolution_notes && (
            <p className="text-xs text-tippd-ash mt-0.5 truncate">
              {item.resolution_notes}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
          {item.resolved_at && (
            <span className="text-[10px] text-tippd-smoke">
              {formatTimeAgo(item.resolved_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function ActionsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [resolvedItems, setResolvedItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<ActionItem | null>(null);
  const [saving, setSaving] = useState(false);

  /* ─── Fetch ─── */

  const fetchItems = useCallback(async () => {
    try {
      // Fetch open + in_progress items
      const res = await fetch("/api/actions?status=open");
      const open = res.ok ? await res.json() : [];

      const res2 = await fetch("/api/actions?status=in_progress");
      const inProgress = res2.ok ? await res2.json() : [];

      // Combine and sort: urgent first, then by created_at
      const combined = [...inProgress, ...open];
      const priorityWeight: Record<string, number> = {
        urgent: 0,
        high: 1,
        normal: 2,
        low: 3,
      };
      combined.sort((a, b) => {
        const pa = priorityWeight[a.priority] ?? 2;
        const pb = priorityWeight[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setItems(combined);

      // Fetch resolved (last 20)
      const res3 = await fetch("/api/actions?status=resolved");
      const resolved = res3.ok ? await res3.json() : [];
      setResolvedItems(resolved.slice(0, 20));
    } catch (err) {
      console.error("Failed to fetch action items:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    // Refresh every 30 seconds
    const interval = setInterval(fetchItems, 30_000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  /* ─── Actions ─── */

  async function handleResolve(id: string, notes: string) {
    setSaving(true);
    try {
      await fetch(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolution_notes: notes }),
      });
      setResolveTarget(null);
      await fetchItems();
    } catch (err) {
      console.error("Failed to resolve:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStartProgress(id: string) {
    try {
      await fetch(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      await fetchItems();
    } catch (err) {
      console.error("Failed to update:", err);
    }
  }

  async function handleSnooze(id: string) {
    // "Snooze" = push to low priority so it sinks to bottom
    try {
      await fetch(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: "low" }),
      });
      await fetchItems();
    } catch (err) {
      console.error("Failed to snooze:", err);
    }
  }

  /* ─── Filter logic ─── */

  const filteredItems = items.filter((item) => {
    switch (activeFilter) {
      case "urgent":
        return item.priority === "urgent";
      case "callback":
        return item.type === "callback";
      case "driver":
        return (
          item.type === "driver_flag" || item.type === "overtime_warning"
        );
      case "trucks":
        return item.type === "truck_alert" || item.type === "maintenance";
      case "invoices":
        return item.type === "overdue_invoice";
      default:
        return true;
    }
  });

  /* ─── Priority badge counts ─── */

  const urgentCount = items.filter((i) => i.priority === "urgent").length;
  const highCount = items.filter((i) => i.priority === "high").length;
  const normalCount = items.filter(
    (i) => i.priority === "normal" || i.priority === "low"
  ).length;

  /* ─── Render ─── */

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Action Center
            {items.length > 0 && (
              <span className="ml-1 text-base font-normal text-tippd-smoke">
                {items.length} open
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            {urgentCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/15 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {urgentCount} urgent
              </span>
            )}
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500/15 text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                {highCount} high
              </span>
            )}
            {normalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/15 text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {normalCount} normal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <Filter className="w-4 h-4 text-tippd-smoke mr-1 shrink-0" />
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                isActive
                  ? "bg-tippd-blue text-white"
                  : "text-tippd-smoke hover:text-white hover:bg-white/5"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-tippd-blue animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">
            All clear!
          </h2>
          <p className="text-sm text-tippd-smoke max-w-xs">
            No items need attention
            {activeFilter !== "all" && " in this category"}. Check back soon or
            change your filter.
          </p>
        </div>
      )}

      {/* Items list */}
      {!loading && filteredItems.length > 0 && (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <ActionCard
              key={item.id}
              item={item}
              onMarkDone={(i) => setResolveTarget(i)}
              onSnooze={handleSnooze}
              onStartProgress={handleStartProgress}
            />
          ))}
        </div>
      )}

      {/* Resolved section */}
      {!loading && resolvedItems.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-2 text-sm text-tippd-smoke hover:text-white transition-colors mb-3"
          >
            {showResolved ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Recently resolved ({resolvedItems.length})
          </button>
          {showResolved && (
            <div className="space-y-1.5">
              {resolvedItems.map((item) => (
                <ResolvedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resolve modal */}
      {resolveTarget && (
        <ResolveModal
          item={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolve={handleResolve}
          saving={saving}
        />
      )}
    </div>
  );
}
