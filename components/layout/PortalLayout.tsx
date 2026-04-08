"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarCheck,
  Receipt,
  Settings,
  Plus,
} from "lucide-react";

const PORTAL_NAV = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Book", href: "/portal/book", icon: Plus },
  { label: "Jobs", href: "/portal/jobs", icon: CalendarCheck },
  { label: "Invoices", href: "/portal/invoices", icon: Receipt },
  { label: "Account", href: "/portal/account", icon: Settings },
];

interface PortalLayoutProps {
  children: React.ReactNode;
  operatorName?: string;
  operatorLogo?: string | null;
  primaryColor?: string;
}

export function PortalLayout({
  children,
  operatorName = "Operator",
  operatorLogo,
  primaryColor = "#1B3A6B",
}: PortalLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header — operator branded */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <Link href="/portal/dashboard" className="flex items-center gap-3">
          {operatorLogo ? (
            <img
              src={operatorLogo}
              alt={operatorName}
              className="h-8 w-auto"
            />
          ) : (
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {operatorName[0]}
            </div>
          )}
          <span className="font-semibold text-lg">{operatorName}</span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {PORTAL_NAV.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
                style={isActive ? { backgroundColor: primaryColor } : undefined}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-30">
        {PORTAL_NAV.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs font-medium py-1",
                isActive ? "text-gray-900" : "text-gray-400"
              )}
              style={isActive ? { color: primaryColor } : undefined}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
