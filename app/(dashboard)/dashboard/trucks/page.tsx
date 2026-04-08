"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gauge, Clock, AlertTriangle, CheckCircle2, Loader2, Truck as TruckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Truck } from "@/types/truck";
import type { MaintenanceStatus } from "@/lib/maintenance-schedule";

interface MaintenanceSummary {
  total: number;
  green: number;
  yellow: number;
  orange: number;
  red: number;
}

interface MaintenanceData {
  healthScore: number;
  currentMileage: number;
  currentHours: number;
  items: Array<{
    type: string;
    label: string;
    status: MaintenanceStatus;
    lifePercent: number;
  }>;
  summary: MaintenanceSummary;
}

interface TruckWithMaintenance extends Truck {
  maintenance?: MaintenanceData;
}

function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
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
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-lg font-bold", color)}>{score}%</span>
      </div>
    </div>
  );
}

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<TruckWithMaintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/trucks");
        if (!res.ok) throw new Error("Failed to fetch trucks");
        const truckList: Truck[] = await res.json();

        const trucksWithMaintenance = await Promise.all(
          truckList.map(async (truck) => {
            try {
              const mRes = await fetch(`/api/trucks/${truck.id}/maintenance`);
              if (mRes.ok) {
                const mData: MaintenanceData = await mRes.json();
                return { ...truck, maintenance: mData };
              }
            } catch {
              // If maintenance fetch fails, just return the truck
            }
            return truck;
          })
        );

        setTrucks(trucksWithMaintenance);
      } catch (err) {
        console.error("Error loading trucks:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Trucks</h1>
        <div className="flex items-center justify-center py-20 text-tippd-smoke">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading fleet...
        </div>
      </div>
    );
  }

  if (trucks.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Trucks</h1>
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-10 text-center">
          <p className="text-tippd-smoke">No trucks found. Add a truck to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Trucks</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {trucks.map((truck) => {
          const m = truck.maintenance;
          const healthScore = m?.healthScore ?? 100;
          const dueSoon = (m?.summary.yellow ?? 0) + (m?.summary.orange ?? 0);
          const overdue = m?.summary.red ?? 0;

          return (
            <Link
              key={truck.id}
              href={`/dashboard/trucks/${truck.id}`}
              className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 hover:border-tippd-blue/50 transition-all hover:shadow-lg hover:shadow-tippd-blue/5"
            >
              <div className="flex gap-5">
                {/* Health ring */}
                <div className="shrink-0">
                  {m ? (
                    <HealthRing score={healthScore} />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center">
                      <TruckIcon className="w-8 h-8 text-tippd-ash" />
                    </div>
                  )}
                </div>

                {/* Truck info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-white truncate">{truck.name}</h2>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium shrink-0 ml-2",
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

                  <p className="text-sm text-tippd-ash mb-3">
                    {truck.year} {truck.make} {truck.model} &mdash; {truck.plate}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-tippd-ash" />
                      <span className="text-tippd-smoke">{truck.current_mileage.toLocaleString()} mi</span>
                    </div>
                    {truck.current_hours !== undefined && truck.current_hours > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-tippd-ash" />
                        <span className="text-tippd-smoke">{truck.current_hours.toLocaleString()} hrs</span>
                      </div>
                    )}
                  </div>

                  {/* Status badges */}
                  {m && (
                    <div className="flex flex-wrap gap-2">
                      {overdue > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {overdue} overdue
                        </span>
                      )}
                      {dueSoon > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400">
                          <Clock className="w-3 h-3" />
                          {dueSoon} due soon
                        </span>
                      )}
                      {overdue === 0 && dueSoon === 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/30 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          All maintenance current
                        </span>
                      )}

                      {/* Mini color distribution bar */}
                      <div className="flex items-center gap-0.5 ml-auto">
                        {m.summary.green > 0 && (
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(4, m.summary.green * 3)}px` }} />
                        )}
                        {m.summary.yellow > 0 && (
                          <div className="h-2 rounded-full bg-yellow-500" style={{ width: `${Math.max(4, m.summary.yellow * 3)}px` }} />
                        )}
                        {m.summary.orange > 0 && (
                          <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.max(4, m.summary.orange * 3)}px` }} />
                        )}
                        {m.summary.red > 0 && (
                          <div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.max(4, m.summary.red * 3)}px` }} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
