"use client";

import Link from "next/link";
import { Phone, Mail } from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
  operatorName?: string;
  operatorLogo?: string | null;
  operatorPhone?: string;
  operatorEmail?: string;
  primaryColor?: string;
}

export function PublicLayout({
  children,
  operatorName = "Dumpster Rental",
  operatorLogo,
  operatorPhone,
  operatorEmail,
  primaryColor = "#1B3A6B",
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            {operatorLogo ? (
              <img
                src={operatorLogo}
                alt={operatorName}
                className="h-9 w-auto"
              />
            ) : (
              <div
                className="w-9 h-9 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {operatorName[0]}
              </div>
            )}
            <span className="font-bold text-xl">{operatorName}</span>
          </Link>

          <div className="flex items-center gap-4">
            {operatorPhone && (
              <a
                href={`tel:${operatorPhone}`}
                className="hidden sm:flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <Phone className="w-4 h-4" />
                {operatorPhone}
              </a>
            )}
            <Link
              href="/book"
              className="px-4 py-2 rounded-md text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Book Now
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <p className="text-white font-bold text-lg">{operatorName}</p>
              <p className="text-sm mt-1">
                Professional dumpster rental services
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {operatorPhone && (
                <a
                  href={`tel:${operatorPhone}`}
                  className="flex items-center gap-2 hover:text-white"
                >
                  <Phone className="w-4 h-4" />
                  {operatorPhone}
                </a>
              )}
              {operatorEmail && (
                <a
                  href={`mailto:${operatorEmail}`}
                  className="flex items-center gap-2 hover:text-white"
                >
                  <Mail className="w-4 h-4" />
                  {operatorEmail}
                </a>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-500">
            Powered by Tippd
          </div>
        </div>
      </footer>
    </div>
  );
}
