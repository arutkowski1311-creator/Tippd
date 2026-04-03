"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CPI_CATEGORIES } from "@/lib/constants";
import { CPICategory } from "@/types";
import { CategoryBadge } from "@/components/ui/category-badge";
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  Award,
  Settings,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";

type Tab = "overview" | "cycles" | "committee" | "analytics";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: BarChart3 },
    { id: "cycles" as Tab, label: "Cycles", icon: Calendar },
    { id: "committee" as Tab, label: "Committee", icon: Users },
    { id: "analytics" as Tab, label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Site Administration
            </h1>
            <p className="text-sm text-gray-500">
              Manage cycles, committees, and analytics
            </p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Nominations", value: "—", icon: Award },
                { label: "Pending Review", value: "—", icon: Eye },
                { label: "This Quarter", value: "—", icon: Calendar },
                { label: "Active Reviewers", value: "—", icon: Users },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <stat.icon className="w-5 h-5 text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">
                Nominations by Category
              </h3>
              <div className="space-y-3">
                {(
                  Object.keys(CPI_CATEGORIES) as CPICategory[]
                ).map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <CategoryBadge category={key} size="sm" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: CPI_CATEGORIES[key].color,
                          width: "0%",
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-500 w-8 text-right">
                      0
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">
                Top Performers
              </h3>
              <p className="text-sm text-gray-400 text-center py-8">
                Rankings will appear once nominations are scored
              </p>
            </div>
          </div>
        )}

        {/* Cycles Tab */}
        {activeTab === "cycles" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Recognition Cycles
              </h3>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                New Cycle
              </button>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-400 text-center py-8">
                No cycles created yet. Create your first quarterly cycle.
              </p>
            </div>
          </div>
        )}

        {/* Committee Tab */}
        {activeTab === "committee" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Local Committee
                </h3>
                <p className="text-xs text-gray-500">3–5 members recommended</p>
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-400 text-center py-8">
                No committee members added yet.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Recommended composition
              </h4>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Nurse manager</li>
                <li>• Charge nurse</li>
                <li>• Staff nurse or tech</li>
                <li>• Optional physician</li>
              </ul>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Named vs Anonymous
                </h4>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-gray-600">Named: —</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Anonymous: —
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Repeat Recognition
                </h4>
                <p className="text-sm text-gray-400 mt-3">
                  Shows users recognized multiple times
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
