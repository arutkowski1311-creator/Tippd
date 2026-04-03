import Link from "next/link";
import { CPI_CATEGORIES } from "@/lib/constants";
import { CPICategory } from "@/types";
import {
  Zap,
  Brain,
  Stethoscope,
  Shield,
  Settings,
  Award,
  Users,
  BarChart3,
  BadgeCheck,
} from "lucide-react";

const iconMap = { Zap, Brain, Stethoscope, Shield, Settings };

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <BadgeCheck className="w-4 h-4" />
            <span className="text-sm font-medium">
              Clinical Performance Index
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Recognize excellence.
            <br />
            Verify it.
          </h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
            A modern, low-friction, verifiable recognition system for clinical
            performance in procedural and acute care environments.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/nominate"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              <Award className="w-5 h-5" />
              Nominate Someone
            </Link>
            <Link
              href="/dashboard/reviewer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Five Categories of Excellence
          </h2>
          <p className="text-gray-500">
            Recognizing the behaviors that define exceptional clinical care
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            Object.entries(CPI_CATEGORIES) as [
              CPICategory,
              (typeof CPI_CATEGORIES)[CPICategory],
            ][]
          ).map(([key, cat]) => {
            const Icon = iconMap[cat.icon as keyof typeof iconMap];
            return (
              <div
                key={key}
                className="rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${cat.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {cat.label}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              How It Works
            </h2>
            <p className="text-gray-500">Under 30 seconds to nominate</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Nominate",
                description:
                  "Describe what someone did. AI cleans your text and suggests a category.",
                icon: Award,
              },
              {
                step: "2",
                title: "Review",
                description:
                  "Committee reviews, validates, and scores each nomination quickly.",
                icon: Users,
              },
              {
                step: "3",
                title: "Credential",
                description:
                  "Winners receive a verifiable digital badge with a unique ID and QR code.",
                icon: BadgeCheck,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">CPI</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/nominate" className="hover:text-gray-900">
              Nominate
            </Link>
            <Link href="/dashboard/reviewer" className="hover:text-gray-900">
              Review
            </Link>
            <Link href="/dashboard/admin" className="hover:text-gray-900">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
