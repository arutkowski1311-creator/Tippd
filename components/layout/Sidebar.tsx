"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Users,
  MessageSquare,
  FileText,
  Receipt,
  DollarSign,
  Route,
  BarChart3,
  Sparkles,
  Settings,
  Box,
  CalendarCheck,
  Bell,
  AlertTriangle,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Action Center", href: "/dashboard/actions", icon: Bell },
  { label: "Dispatch", href: "/dashboard/dispatch", icon: MapPin },
  { label: "Jobs", href: "/dashboard/jobs", icon: CalendarCheck },
  { label: "Exceptions", href: "/dashboard/exceptions", icon: AlertTriangle },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Boxes", href: "/dashboard/fleet", icon: Box },
  { label: "Trucks", href: "/dashboard/trucks", icon: Truck },
  { label: "Communications", href: "/dashboard/comms", icon: MessageSquare },
  { label: "Quotes", href: "/dashboard/quotes", icon: FileText },
  { label: "Invoices", href: "/dashboard/invoices", icon: Receipt },
  { label: "Expenses", href: "/dashboard/expenses", icon: DollarSign },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Insights", href: "/dashboard/insights", icon: Sparkles },
  { label: "Content", href: "/dashboard/content", icon: Sparkles },
  { label: "Driver Mode", href: "/driver", icon: Route },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  unreadComms?: number;
  actionCount?: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ unreadComms = 0, actionCount = 0, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    badge:
      item.href === "/dashboard/comms"
        ? unreadComms
        : item.href === "/dashboard/actions"
          ? actionCount
          : undefined,
  }));

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-tippd-charcoal border-r border-white/5 flex flex-col w-64 transition-transform duration-200",
          // Mobile: hidden by default, slide in when open
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "lg:translate-x-0 lg:w-56"
        )}
      >
        {/* Logo + mobile close */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onMobileClose}>
            <div className="w-8 h-8 rounded bg-tippd-blue flex items-center justify-center text-white font-bold text-sm shrink-0">
              T
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              TIPPD
            </span>
          </Link>
          <button
            onClick={onMobileClose}
            className="lg:hidden text-tippd-smoke hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-0.5",
                  isActive
                    ? "bg-tippd-blue/10 text-tippd-blue"
                    : "text-tippd-smoke hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={cn(
                      "ml-auto text-white text-xs rounded-full w-5 h-5 flex items-center justify-center",
                      item.href === "/dashboard/actions"
                        ? "bg-red-500"
                        : "bg-tippd-blue"
                    )}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
