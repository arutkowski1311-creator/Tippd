"use client";

import { Sidebar } from "./Sidebar";
import { Bell, Search, User, Menu } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getTier, shouldToast, bundleMessage, buildDedupeKey } from "@/lib/notification-tiers";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function DashboardLayout({
  children,
  userName = "Owner",
  userRole = "owner",
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Track active dedupe keys so we don't re-bundle within the same window
  const dedupeKeysRef = useRef<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/actions?status=open");
      if (!res.ok) return;
      const items: Array<{ id: string; priority: string; title: string; type: string }> = await res.json();

      // Bell count = severity 2+ (high + urgent open items)
      const bellItems = items.filter(i => i.priority === "urgent" || i.priority === "high");
      setUrgentCount(bellItems.length);

      if (initialLoadRef.current) {
        bellItems.forEach(i => seenIdsRef.current.add(i.id));
        initialLoadRef.current = false;
        return;
      }

      // Find new items not yet seen
      const newItems = items.filter(i => !seenIdsRef.current.has(i.id));
      newItems.forEach(i => seenIdsRef.current.add(i.id));

      // Group new items by type for deduplication
      const byType: Record<string, typeof newItems> = {};
      for (const item of newItems) {
        const tier = getTier(item.type);
        // Only surface severity 3+ as toasts per the notification tier rules
        if (!shouldToast(tier)) continue;
        if (!byType[item.type]) byType[item.type] = [];
        byType[item.type].push(item);
      }

      // Fire one toast per event type (bundled if multiple)
      for (const [type, group] of Object.entries(byType)) {
        const tier = getTier(type);
        const dedupeKey = buildDedupeKey(type, tier.dedupeWindowMinutes);

        // Skip if we already toasted this event type in the current dedupe window
        if (dedupeKeysRef.current.has(dedupeKey)) continue;
        dedupeKeysRef.current.add(dedupeKey);

        const message = bundleMessage(type, group.length, group[0].title);
        const isCritical = tier.severity === 4;

        if (isCritical) {
          toast.error(`🚨 ${message}`, {
            duration: 10000,
            action: { label: "Act Now →", onClick: () => window.location.href = "/dashboard/actions" },
          });
        } else {
          toast.warning(`⚠️ ${message}`, {
            duration: 6000,
            action: { label: "View", onClick: () => window.location.href = "/dashboard/actions" },
          });
        }
      }
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
      // Run escalation check alongside alert polling
      fetch("/api/actions/escalate", { method: "POST" }).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content — offset by sidebar on desktop only */}
      <div className="lg:ml-56 min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-14 border-b border-white/5 bg-tippd-ink/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
          {/* Mobile hamburger + Search */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-tippd-smoke hover:text-white p-1 -ml-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-tippd-smoke">
              <Search className="w-4 h-4" />
              <input
                type="text"
                placeholder="Search jobs, customers, dumpsters..."
                className="bg-transparent border-none outline-none text-sm w-48 lg:w-64 placeholder:text-tippd-ash"
              />
            </div>
            {/* Mobile: just show TIPPD text */}
            <span className="sm:hidden text-white font-bold text-sm">TIPPD</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Search icon on mobile */}
            <button className="sm:hidden text-tippd-smoke hover:text-white">
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications — live urgent count */}
            <Link
              href="/dashboard/actions"
              className="relative text-tippd-smoke hover:text-white transition-colors"
              aria-label={`${urgentCount} alerts`}
            >
              <Bell className={urgentCount > 0 ? "w-5 h-5 text-red-400" : "w-5 h-5"} />
              {urgentCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
                  {urgentCount > 99 ? "99+" : urgentCount}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-tippd-blue rounded-full" />
              )}
            </Link>

            {/* User */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-tippd-steel flex items-center justify-center">
                <User className="w-4 h-4 text-tippd-smoke" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white leading-none">
                  {userName}
                </p>
                <p className="text-xs text-tippd-ash capitalize">{userRole}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content — responsive padding */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
