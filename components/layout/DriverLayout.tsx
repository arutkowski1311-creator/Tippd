"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, User, RefreshCw, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DriverLayoutProps {
  children: React.ReactNode;
  driverName?: string;
}

export function DriverLayout({
  children,
  driverName = "Driver",
}: DriverLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === "/driver";

  // ─── Route change detection ───
  const routeHashRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);
  const [routeChanged, setRouteChanged] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only run on driver pages (not login)
    if (pathname === "/driver/login") return;

    async function checkRouteHash() {
      try {
        const truckId = typeof window !== "undefined" ? localStorage.getItem("selectedTruckId") : null;
        const url = truckId ? `/api/driver/route?truck_id=${truckId}` : "/api/driver/route";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const segs: Array<{ id: string; status: string; label?: string }> = data.segments || [];

        // Hash = segment count + each id:status pair
        const hash = segs.length + "|" + segs.map(s => `${s.id}:${s.status}`).join(",");

        if (initialLoadRef.current) {
          routeHashRef.current = hash;
          initialLoadRef.current = false;
          return;
        }

        if (routeHashRef.current && hash !== routeHashRef.current) {
          // Something changed — figure out what
          const prevCount = parseInt(routeHashRef.current.split("|")[0] || "0");
          const newCount = segs.length;
          let msg = "Your route has been updated by dispatch.";
          if (newCount > prevCount) msg = `${newCount - prevCount} stop${newCount - prevCount > 1 ? "s" : ""} added to your route.`;
          else if (newCount < prevCount) msg = `${prevCount - newCount} stop${prevCount - newCount > 1 ? "s" : ""} removed from your route.`;

          routeHashRef.current = hash;
          setDispatchMessage(msg);
          setRouteChanged(true);

          // Vibrate if supported (mobile devices)
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      } catch { /* non-fatal */ }
    }

    checkRouteHash();
    const interval = setInterval(checkRouteHash, 30_000);
    return () => clearInterval(interval);
  }, [pathname]);

  function handleRefresh() {
    setRouteChanged(false);
    setDispatchMessage(null);
    initialLoadRef.current = false;
    // Navigate to route root to force a full reload of segments
    router.push("/driver");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Mobile header — high contrast, large tap targets */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b-2 border-gray-200 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          {!isRoot && (
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {isRoot && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-tippd-navy flex items-center justify-center text-white font-bold text-sm">
                T
              </div>
              <span className="font-bold text-lg">Today&apos;s Route</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/driver"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200"
            aria-label="Map view"
          >
            <MapPin className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-tippd-blue/10">
            <User className="w-5 h-5 text-tippd-blue" />
          </div>
        </div>
      </header>

      {/* ─── Route change alert banner ─── */}
      {routeChanged && (
        <div className="sticky top-14 z-40 w-full bg-orange-500 text-white shadow-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <AlertTriangle className="w-6 h-6 shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Dispatch Updated Your Route</p>
              <p className="text-xs opacity-90 mt-0.5 truncate">{dispatchMessage}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="shrink-0 flex items-center gap-1.5 bg-white text-orange-600 font-bold text-sm px-4 py-2 rounded-lg active:bg-orange-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Content — full height for mobile */}
      <main className="pb-20">{children}</main>

      {/* Bottom bar — driver name + status */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t-2 border-gray-200 flex items-center justify-between px-4 z-30">
        <div>
          <p className="text-sm font-semibold">{driverName}</p>
          <p className="text-xs text-gray-500">On Route</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-tippd-green" />
          <span className="text-xs font-medium text-tippd-green">Active</span>
        </div>
      </div>
    </div>
  );
}
