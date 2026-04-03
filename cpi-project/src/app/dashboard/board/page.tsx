"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CPI_CATEGORIES } from "@/lib/constants";
import { CPICategory } from "@/types";
import { CategoryBadge } from "@/components/ui/category-badge";
import {
  Trophy,
  Users,
  FileText,
  Scale,
  Crown,
} from "lucide-react";

type Tab = "finalists" | "scoring" | "selection" | "summary";

export default function BoardDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("finalists");
  const [selectedCategory, setSelectedCategory] = useState<CPICategory | "all">(
    "all"
  );

  const tabs = [
    { id: "finalists" as Tab, label: "Finalists", icon: Trophy },
    { id: "scoring" as Tab, label: "Scoring", icon: Scale },
    { id: "selection" as Tab, label: "Selection", icon: Crown },
    { id: "summary" as Tab, label: "Summary", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">
              CPI National Board
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">
            Annual Selection Dashboard
          </h1>
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
        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              selectedCategory === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All Categories
          </button>
          {(Object.keys(CPI_CATEGORIES) as CPICategory[]).map(
            (key) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={cn(
                  "whitespace-nowrap transition-colors",
                  selectedCategory === key ? "ring-2 ring-indigo-600 rounded-full" : ""
                )}
              >
                <CategoryBadge category={key} size="sm" />
              </button>
            )
          )}
        </div>

        {/* Finalists Tab */}
        {activeTab === "finalists" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">
                Finalist Comparison
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Compare top nominees across all participating sites
              </p>
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  Finalists will appear here after quarterly cycles are
                  finalized
                </p>
              </div>
            </div>

            {/* Board Composition */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">
                Board Composition
              </h3>
              <p className="text-xs text-gray-500 mb-3">7–9 members recommended</p>
              <div className="space-y-2">
                {[
                  "Nurse Leaders",
                  "Physicians",
                  "Frontline Representative",
                  "Quality Expert",
                  "Administrator",
                  "Industry Advisor",
                ].map((role) => (
                  <div
                    key={role}
                    className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg"
                  >
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{role}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      — seat
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scoring Tab */}
        {activeTab === "scoring" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">
              Board Scoring
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Score finalists using the same Strength + Impact framework
            </p>
            <div className="text-center py-8">
              <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                No finalists to score yet
              </p>
            </div>
          </div>
        )}

        {/* Selection Tab */}
        {activeTab === "selection" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">
              National Honoree Selection
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Select national honorees from the finalist pool
            </p>
            <div className="text-center py-8">
              <Crown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                Selection tools available after board scoring
              </p>
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">
              Summary Packets
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Downloadable summary packets for each finalist
            </p>
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                No summary packets available yet
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
