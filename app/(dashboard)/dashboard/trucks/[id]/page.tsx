"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SERVICE_TYPE_LABELS } from "@/types/truck";
import type { Truck, TruckServiceLog } from "@/types/truck";
import type { MaintenanceStatus, MaintenanceCategory, TireCondition } from "@/lib/maintenance-schedule";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  statusBarColor,
  statusTextColor,
  statusBgColor,
  TIRE_POSITION_LABELS,
  TIRE_CONDITIONS,
  tireConditionColor,
  treadDepthPercent,
  treadDepthStatus,
} from "@/lib/maintenance-schedule";

// -----------------------------------------------------------
// Types for the maintenance API response
// -----------------------------------------------------------
interface MaintenanceItemStatus {
  type: string;
  label: string;
  category: MaintenanceCategory;
  description: string;
  status: MaintenanceStatus;
  statusText: string;
  lifePercent: number;
  mileInterval: number | null;
  hourInterval: number | null;
  dayInterval: number | null;
  currentMilesSince: number;
  currentHoursSince: number;
  milesRemaining: number | null;
  hoursRemaining: number | null;
  daysRemaining: number | null;
  lastServiceDate: string | null;
  lastServiceMiles: number | null;
  isConfigured: boolean;
}

interface MaintenanceData {
  truckId: string;
  currentMileage: number;
  currentHours: number;
  healthScore: number;
  items: MaintenanceItemStatus[];
  summary: {
    total: number;
    green: number;
    yellow: number;
    orange: number;
    red: number;
  };
  categoryOrder: MaintenanceCategory[];
}

interface TireData {
  position: string;
  id: string | null;
  brand: string | null;
  installedDate: string | null;
  installedMiles: number | null;
  currentTreadDepth: number | null;
  condition: string;
  milesOnTire: number | null;
  notes: string | null;
  hasData: boolean;
}

// -----------------------------------------------------------
// Health Score Ring (large)
// -----------------------------------------------------------
function HealthRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score > 75 ? "text-emerald-400" :
    score > 50 ? "text-yellow-400" :
    score > 25 ? "text-orange-400" :
    "text-red-400";
  const strokeColor =
    score > 75 ? "#34d399" :
    score > 50 ? "#facc15" :
    score > 25 ? "#fb923c" :
    "#f87171";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", color)}>{score}%</span>
        <span className="text-xs text-tippd-ash">Health</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Progress bar component
// -----------------------------------------------------------
function ProgressBar({
  percent,
  status,
  height = "h-2.5",
}: {
  percent: number;
  status: MaintenanceStatus;
  height?: string;
}) {
  const fillWidth = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("w-full rounded-full bg-white/5 overflow-hidden", height)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", statusBarColor(status))}
        style={{ width: `${fillWidth}%` }}
      />
    </div>
  );
}

// -----------------------------------------------------------
// Main page
// -----------------------------------------------------------
export default function TruckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [truck, setTruck] = useState<Truck | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [tires, setTires] = useState<TireData[]>([]);
  const [serviceLogs, setServiceLogs] = useState<TruckServiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [showTireModal, setShowTireModal] = useState<string | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [trucksRes, maintRes, logsRes, tiresRes] = await Promise.all([
        fetch("/api/trucks"),
        fetch(`/api/trucks/${id}/maintenance`),
        fetch(`/api/trucks/${id}/service`),
        fetch(`/api/trucks/${id}/tires`),
      ]);

      if (trucksRes.ok) {
        const trucks: Truck[] = await trucksRes.json();
        const found = trucks.find((t) => t.id === id);
        if (found) setTruck(found);
      }
      if (maintRes.ok) {
        setMaintenance(await maintRes.json());
      }
      if (logsRes.ok) {
        setServiceLogs(await logsRes.json());
      }
      if (tiresRes.ok) {
        setTires(await tiresRes.json());
      }
    } catch (err) {
      console.error("Error loading truck data:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark service as done (resets the counter)
  async function handleMarkDone(serviceType: string) {
    if (!truck || completing) return;
    setCompleting(serviceType);

    try {
      const res = await fetch(`/api/trucks/${id}/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceType,
          date_performed: new Date().toISOString().split("T")[0],
          mileage_at_service: truck.current_mileage,
          hours_at_service: truck.current_hours ?? 0,
          cost: 0,
        }),
      });

      if (res.ok) {
        // Reload data
        await loadData();
      }
    } catch (err) {
      console.error("Error marking service done:", err);
    } finally {
      setCompleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-tippd-smoke">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading truck...
      </div>
    );
  }

  if (!truck) {
    return (
      <div>
        <Link href="/dashboard/trucks" className="text-tippd-smoke hover:text-white inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Trucks
        </Link>
        <p className="text-tippd-smoke">Truck not found.</p>
      </div>
    );
  }

  // Group items by category
  const groupedItems = new Map<MaintenanceCategory, MaintenanceItemStatus[]>();
  for (const cat of CATEGORY_ORDER) {
    groupedItems.set(cat, []);
  }
  for (const item of maintenance?.items ?? []) {
    const list = groupedItems.get(item.category);
    if (list) list.push(item);
  }

  const visibleLogs = historyExpanded ? serviceLogs : serviceLogs.slice(0, 10);

  return (
    <div>
      {/* ── A. Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/trucks" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">{truck.name}</h1>
        <span
          className={cn(
            "px-2.5 py-0.5 rounded text-xs font-medium",
            truck.status === "active"
              ? "bg-emerald-900/30 text-emerald-400"
              : truck.status === "repair"
              ? "bg-orange-900/30 text-orange-400"
              : "bg-zinc-800 text-zinc-400"
          )}
        >
          {truck.status === "active" ? "Active" : truck.status === "repair" ? "In Repair" : "Retired"}
        </span>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Health score ring */}
        <div className="lg:col-span-1 rounded-lg border border-white/10 bg-tippd-charcoal p-5 flex items-center justify-center">
          {maintenance ? (
            <HealthRing score={maintenance.healthScore} />
          ) : (
            <div className="text-tippd-ash text-sm">Loading...</div>
          )}
        </div>

        {/* Vehicle info cards */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
            <p className="text-xs text-tippd-ash mb-1">Vehicle</p>
            <p className="text-white font-medium text-sm">
              {truck.year} {truck.make} {truck.model}
            </p>
            <p className="text-xs text-tippd-ash mt-1">{truck.plate}</p>
          </div>

          <button
            onClick={() => setShowMileageModal(true)}
            className="rounded-lg border border-white/10 bg-tippd-charcoal p-4 hover:border-tippd-blue/50 transition-colors text-left"
          >
            <p className="text-xs text-tippd-ash mb-1">Mileage</p>
            <p className="text-white font-bold text-lg">{truck.current_mileage.toLocaleString()}</p>
            <p className="text-xs text-tippd-blue mt-1">Click to update</p>
          </button>

          <button
            onClick={() => setShowMileageModal(true)}
            className="rounded-lg border border-white/10 bg-tippd-charcoal p-4 hover:border-tippd-blue/50 transition-colors text-left"
          >
            <p className="text-xs text-tippd-ash mb-1">Hours</p>
            <p className="text-white font-bold text-lg">{(truck.current_hours ?? 0).toLocaleString()}</p>
            <p className="text-xs text-tippd-blue mt-1">Click to update</p>
          </button>

          {/* Summary badges */}
          <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
            <p className="text-xs text-tippd-ash mb-2">Status</p>
            {maintenance && (
              <div className="space-y-1">
                {maintenance.summary.red > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-400">{maintenance.summary.red} overdue</span>
                  </div>
                )}
                {maintenance.summary.orange > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-orange-400">{maintenance.summary.orange} warning</span>
                  </div>
                )}
                {maintenance.summary.yellow > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-yellow-400">{maintenance.summary.yellow} due soon</span>
                  </div>
                )}
                {maintenance.summary.green > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-400">{maintenance.summary.green} good</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── B. Maintenance Scorecard Grid ───────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Maintenance Scorecard</h2>
          <button
            onClick={() => setShowServiceModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tippd-blue text-white text-sm font-medium hover:bg-tippd-blue/80 transition-colors"
          >
            <Wrench className="w-4 h-4" /> Log Service
          </button>
        </div>

        {CATEGORY_ORDER.map((category) => {
          const items = groupedItems.get(category);
          if (!items || items.length === 0) return null;

          return (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-tippd-smoke uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div
                    key={item.type}
                    className="rounded-lg border border-white/10 bg-tippd-charcoal p-4"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{item.label}</span>
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", statusBgColor(item.status))}>
                        {item.statusText}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <ProgressBar percent={item.lifePercent} status={item.status} />
                    </div>

                    {/* Remaining info */}
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className={statusTextColor(item.status)}>
                        {item.lifePercent}% life remaining
                      </span>
                      <span className="text-tippd-ash">
                        {item.milesRemaining !== null && (
                          <>{item.milesRemaining > 0 ? `${item.milesRemaining.toLocaleString()} mi left` : `${Math.abs(item.milesRemaining).toLocaleString()} mi over`}</>
                        )}
                        {item.hoursRemaining !== null && (
                          <>{item.hoursRemaining > 0 ? `${item.hoursRemaining.toLocaleString()} hrs left` : `${Math.abs(item.hoursRemaining).toLocaleString()} hrs over`}</>
                        )}
                        {item.daysRemaining !== null && item.milesRemaining === null && item.hoursRemaining === null && (
                          <>{item.daysRemaining > 0 ? `${item.daysRemaining} days left` : `${Math.abs(item.daysRemaining)} days over`}</>
                        )}
                      </span>
                    </div>

                    {/* Usage detail + last service */}
                    <div className="text-xs text-tippd-ash mb-3 space-y-0.5">
                      {item.mileInterval && (
                        <p>{item.currentMilesSince.toLocaleString()} / {item.mileInterval.toLocaleString()} mi</p>
                      )}
                      {item.hourInterval && (
                        <p>{item.currentHoursSince.toLocaleString()} / {item.hourInterval.toLocaleString()} hrs</p>
                      )}
                      {item.lastServiceDate ? (
                        <p>Last: {formatDate(item.lastServiceDate + "T00:00:00")}</p>
                      ) : (
                        <p className="italic">No service record</p>
                      )}
                    </div>

                    {/* Done button */}
                    <button
                      onClick={() => handleMarkDone(item.type)}
                      disabled={completing === item.type}
                      className={cn(
                        "w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                        completing === item.type
                          ? "bg-emerald-900/30 text-emerald-400 cursor-wait"
                          : "border border-white/10 text-tippd-smoke hover:bg-emerald-900/20 hover:text-emerald-400 hover:border-emerald-500/30"
                      )}
                    >
                      {completing === item.type ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" /> Mark Done
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── C. Tire Scorecard ─────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Tire Scorecard</h2>

        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
          {/* Truck tire diagram */}
          <div className="max-w-xl mx-auto">
            {/* Front axle */}
            <div className="mb-2">
              <p className="text-xs text-tippd-ash text-center mb-2 uppercase tracking-wider">Front Axle</p>
              <div className="flex justify-center gap-16">
                {tires.filter(t => t.position === "front_left" || t.position === "front_right").map((tire) => (
                  <TireCard key={tire.position} tire={tire} onClick={() => setShowTireModal(tire.position)} />
                ))}
                {tires.filter(t => t.position === "front_left" || t.position === "front_right").length === 0 && (
                  <>
                    <TireCard tire={null} position="front_left" onClick={() => setShowTireModal("front_left")} />
                    <TireCard tire={null} position="front_right" onClick={() => setShowTireModal("front_right")} />
                  </>
                )}
              </div>
            </div>

            {/* Frame connecting line */}
            <div className="flex justify-center my-2">
              <div className="w-px h-8 bg-white/10" />
            </div>

            {/* Rear axle 1 */}
            <div className="mb-2">
              <p className="text-xs text-tippd-ash text-center mb-2 uppercase tracking-wider">Rear Axle 1</p>
              <div className="flex justify-center gap-4">
                {["rear_1", "rear_2", "rear_3", "rear_4"].map((pos) => {
                  const tire = tires.find(t => t.position === pos);
                  return <TireCard key={pos} tire={tire || null} position={pos} onClick={() => setShowTireModal(pos)} />;
                })}
              </div>
            </div>

            {/* Frame connecting line */}
            <div className="flex justify-center my-2">
              <div className="w-px h-4 bg-white/10" />
            </div>

            {/* Rear axle 2 */}
            <div>
              <p className="text-xs text-tippd-ash text-center mb-2 uppercase tracking-wider">Rear Axle 2</p>
              <div className="flex justify-center gap-4">
                {["rear_5", "rear_6", "rear_7", "rear_8"].map((pos) => {
                  const tire = tires.find(t => t.position === pos);
                  return <TireCard key={pos} tire={tire || null} position={pos} onClick={() => setShowTireModal(pos)} />;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── D. Service History ────────────────────────────── */}
      <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Service History</h2>
          <span className="text-xs text-tippd-ash">{serviceLogs.length} records</span>
        </div>

        {serviceLogs.length === 0 ? (
          <p className="text-tippd-smoke text-sm py-4 text-center">No service records yet.</p>
        ) : (
          <div className="space-y-3">
            {visibleLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0"
              >
                <div>
                  <p className="text-white font-medium">
                    {SERVICE_TYPE_LABELS[log.service_type] ?? log.service_type}
                  </p>
                  <p className="text-xs text-tippd-ash">
                    {formatDate(log.date_performed + "T00:00:00")} &mdash;{" "}
                    {log.mileage_at_service.toLocaleString()} mi
                    {log.vendor && ` — ${log.vendor}`}
                  </p>
                  {log.notes && <p className="text-xs text-tippd-ash mt-0.5">{log.notes}</p>}
                </div>
                {log.cost > 0 && (
                  <span className="text-tippd-smoke shrink-0">{formatCurrency(log.cost)}</span>
                )}
              </div>
            ))}

            {serviceLogs.length > 10 && (
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="w-full text-center text-sm text-tippd-blue hover:text-white py-2 flex items-center justify-center gap-1"
              >
                {historyExpanded ? (
                  <>Show less <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>Show all {serviceLogs.length} records <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      {showMileageModal && (
        <MileageHoursModal
          truckId={id}
          currentMileage={truck.current_mileage}
          currentHours={truck.current_hours ?? 0}
          onClose={() => setShowMileageModal(false)}
          onSaved={() => {
            setShowMileageModal(false);
            setLoading(true);
            loadData();
          }}
        />
      )}

      {showTireModal && (
        <TireModal
          truckId={id}
          position={showTireModal}
          currentTire={tires.find(t => t.position === showTireModal) ?? null}
          currentMileage={truck.current_mileage}
          onClose={() => setShowTireModal(null)}
          onSaved={() => {
            setShowTireModal(null);
            loadData();
          }}
        />
      )}

      {showServiceModal && (
        <ServiceModal
          truckId={id}
          currentMileage={truck.current_mileage}
          currentHours={truck.current_hours ?? 0}
          maintenanceItems={maintenance?.items ?? []}
          onClose={() => setShowServiceModal(false)}
          onSaved={() => {
            setShowServiceModal(false);
            setLoading(true);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------
// Tire Card Component
// -----------------------------------------------------------
function TireCard({
  tire,
  position,
  onClick,
}: {
  tire: TireData | null;
  position?: string;
  onClick: () => void;
}) {
  const pos = tire?.position ?? position ?? "";
  const label = TIRE_POSITION_LABELS[pos as keyof typeof TIRE_POSITION_LABELS] ?? pos;
  const tread = tire?.currentTreadDepth ?? null;
  const condition = (tire?.condition ?? "good") as TireCondition;
  const milesOnTire = tire?.milesOnTire;

  const treadPct = tread !== null ? treadDepthPercent(tread) : 100;
  const treadStatus = tread !== null ? treadDepthStatus(tread) : "green";

  return (
    <button
      onClick={onClick}
      className="w-24 rounded-lg border border-white/10 bg-tippd-ink p-2 hover:border-tippd-blue/50 transition-colors text-center"
    >
      {/* Tread depth gauge */}
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-1.5">
        <div
          className={cn("h-full rounded-full", statusBarColor(treadStatus))}
          style={{ width: `${treadPct}%` }}
        />
      </div>

      <p className="text-[10px] text-tippd-ash leading-tight">{label.replace("Rear ", "R").replace("Front ", "F")}</p>

      {tread !== null && (
        <p className="text-xs text-white font-medium">{tread}/32</p>
      )}

      <span className={cn("inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium border", tireConditionColor(condition))}>
        {condition}
      </span>

      {milesOnTire != null && milesOnTire > 0 && (
        <p className="text-[10px] text-tippd-ash mt-1">{Math.round((milesOnTire as number) / 1000)}k mi</p>
      )}
    </button>
  );
}

// -----------------------------------------------------------
// Mileage + Hours Modal
// -----------------------------------------------------------
function MileageHoursModal({
  truckId,
  currentMileage,
  currentHours,
  onClose,
  onSaved,
}: {
  truckId: string;
  currentMileage: number;
  currentHours: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mileage, setMileage] = useState(currentMileage.toString());
  const [hours, setHours] = useState(currentHours.toString());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const miVal = parseInt(mileage, 10);
    const hrVal = parseInt(hours, 10);

    if (isNaN(miVal) || miVal < currentMileage) {
      setErrorMsg("Mileage must be >= current.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/trucks/${truckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_mileage: miVal,
          current_hours: isNaN(hrVal) ? currentHours : hrVal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-tippd-ink p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Update Mileage & Hours</h3>
          <button onClick={onClose} className="text-tippd-ash hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-tippd-ash mb-1">
              Mileage (current: {currentMileage.toLocaleString()})
            </label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
              required
              min={currentMileage}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-tippd-ash mb-1">
              Hours (current: {currentHours.toLocaleString()})
            </label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
            />
          </div>

          {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-tippd-smoke hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-tippd-blue px-4 py-2 text-sm text-white font-medium hover:bg-tippd-blue/80 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Tire Modal
// -----------------------------------------------------------
function TireModal({
  truckId,
  position,
  currentTire,
  currentMileage,
  onClose,
  onSaved,
}: {
  truckId: string;
  position: string;
  currentTire: TireData | null;
  currentMileage: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const label = TIRE_POSITION_LABELS[position as keyof typeof TIRE_POSITION_LABELS] ?? position;
  const [brand, setBrand] = useState(currentTire?.brand ?? "");
  const [installedDate, setInstalledDate] = useState(currentTire?.installedDate ?? new Date().toISOString().split("T")[0]);
  const [installedMiles, setInstalledMiles] = useState((currentTire?.installedMiles ?? currentMileage).toString());
  const [treadDepth, setTreadDepth] = useState((currentTire?.currentTreadDepth ?? 22).toString());
  const [condition, setCondition] = useState<string>(currentTire?.condition ?? "new");
  const [notes, setNotes] = useState(currentTire?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/trucks/${truckId}/tires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position,
          brand: brand || undefined,
          installed_date: installedDate,
          installed_miles: parseInt(installedMiles, 10),
          current_tread_depth: parseFloat(treadDepth),
          condition,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-tippd-ink p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{label} Tire</h3>
          <button onClick={onClose} className="text-tippd-ash hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-tippd-ash mb-1">Brand</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Michelin XDN2"
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Installed Date</label>
              <input
                type="date"
                value={installedDate}
                onChange={(e) => setInstalledDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Installed Miles</label>
              <input
                type="number"
                value={installedMiles}
                onChange={(e) => setInstalledMiles(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Tread Depth (32nds)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="32"
                value={treadDepth}
                onChange={(e) => setTreadDepth(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
              >
                {TIRE_CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-tippd-ash mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue resize-none"
            />
          </div>

          {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-tippd-smoke hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-tippd-blue px-4 py-2 text-sm text-white font-medium hover:bg-tippd-blue/80 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save Tire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Log Service Modal (full form)
// -----------------------------------------------------------
function ServiceModal({
  truckId,
  currentMileage,
  currentHours,
  maintenanceItems,
  onClose,
  onSaved,
}: {
  truckId: string;
  currentMileage: number;
  currentHours: number;
  maintenanceItems: MaintenanceItemStatus[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serviceType, setServiceType] = useState(maintenanceItems[0]?.type ?? "oil_filter");
  const [datePerformed, setDatePerformed] = useState(new Date().toISOString().split("T")[0]);
  const [mileage, setMileage] = useState(currentMileage.toString());
  const [hours, setHours] = useState(currentHours.toString());
  const [cost, setCost] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/trucks/${truckId}/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceType,
          date_performed: datePerformed,
          mileage_at_service: parseInt(mileage, 10),
          hours_at_service: parseInt(hours, 10) || 0,
          cost: parseFloat(cost || "0"),
          vendor: vendor || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-tippd-ink p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Log Service</h3>
          <button onClick={onClose} className="text-tippd-ash hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-tippd-ash mb-1">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
            >
              {maintenanceItems.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-tippd-ash mb-1">Date Performed</label>
            <input
              type="date"
              value={datePerformed}
              onChange={(e) => setDatePerformed(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Mileage</label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
                required
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-tippd-ash mb-1">Hours</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-tippd-ash mb-1">Cost ($)</label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
            />
          </div>

          <div>
            <label className="block text-xs text-tippd-ash mb-1">Vendor</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Jersey City Truck Center"
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue"
            />
          </div>

          <div>
            <label className="block text-xs text-tippd-ash mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-white/10 bg-tippd-charcoal text-white px-3 py-2 text-sm focus:outline-none focus:border-tippd-blue resize-none"
            />
          </div>

          {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-tippd-smoke hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-tippd-blue px-4 py-2 text-sm text-white font-medium hover:bg-tippd-blue/80 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
