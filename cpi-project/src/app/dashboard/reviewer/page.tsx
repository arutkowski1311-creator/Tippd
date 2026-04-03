"use client";

import { useState } from "react";
import { Nomination } from "@/types";
import { NominationCard } from "@/components/ui/nomination-card";
import { CategoryBadge } from "@/components/ui/category-badge";
import { ScoreSlider } from "@/components/ui/score-slider";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Loader2,
  ClipboardList,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

type Tab = "pending" | "reviewed" | "scored";

// Review modal for a single nomination
function ReviewModal({
  nomination,
  onClose,
  onSubmit,
}: {
  nomination: Nomination;
  onClose: () => void;
  onSubmit: (review: {
    is_valid: boolean;
    strength_score?: number;
    impact_score?: number;
    notes?: string;
  }) => void;
}) {
  const [phase, setPhase] = useState<"validate" | "score">("validate");
  const [strengthScore, setStrengthScore] = useState(50);
  const [impactScore, setImpactScore] = useState(50);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleValidate = (isValid: boolean) => {
    if (!isValid) {
      onSubmit({ is_valid: false, notes });
      return;
    }
    setPhase("score");
  };

  const handleScore = async () => {
    setSubmitting(true);
    onSubmit({
      is_valid: true,
      strength_score: strengthScore,
      impact_score: impactScore,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-semibold text-gray-900">Review Nomination</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Nomination Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">
                {nomination.nominee?.full_name}
              </h3>
              {nomination.nominee?.title && (
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                  {nomination.nominee.title}
                </span>
              )}
            </div>
            <CategoryBadge category={nomination.category} size="sm" />
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">
              {nomination.ai_text || nomination.raw_text}
            </p>
            {nomination.ai_text && nomination.raw_text !== nomination.ai_text && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer">
                  View original text
                </summary>
                <p className="text-xs text-gray-400 mt-1 italic">
                  {nomination.raw_text}
                </p>
              </details>
            )}
            {!nomination.is_anonymous && nomination.nominator && (
              <p className="text-xs text-gray-400 mt-2">
                Nominated by {nomination.nominator.full_name}
              </p>
            )}
            {nomination.is_anonymous && (
              <p className="text-xs text-gray-400 mt-2">Anonymous nomination</p>
            )}
          </div>

          {/* Phase 1: Validation Gate */}
          {phase === "validate" && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <p className="text-sm font-medium text-gray-900">
                Is this clearly above baseline performance?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleValidate(true)}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Yes
                </button>
                <button
                  onClick={() => handleValidate(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  No
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Scoring */}
          {phase === "score" && (
            <div className="space-y-5">
              <ScoreSlider
                label="Strength of Action"
                value={strengthScore}
                onChange={setStrengthScore}
              />
              <ScoreSlider
                label="Impact"
                value={impactScore}
                onChange={setImpactScore}
              />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional context..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 border-0 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <span className="text-xs text-gray-500">Combined Score</span>
                <p className="text-2xl font-bold text-indigo-600">
                  {Math.round((strengthScore + impactScore) / 2)}
                </p>
              </div>

              <button
                onClick={handleScore}
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Submit Review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [reviewingNomination, setReviewingNomination] =
    useState<Nomination | null>(null);

  // Demo nominations for preview
  const demoNominations: Nomination[] = [
    {
      id: "demo-1",
      cycle_id: null,
      nominee_id: "u1",
      nominator_id: "u2",
      is_anonymous: false,
      category: "vigilance",
      raw_text:
        "During a busy trauma shift, Sarah noticed a subtle change in a patient's rhythm strip that the monitoring tech had missed. She immediately alerted the attending, and the patient was taken to the cath lab within 20 minutes. The cardiologist later confirmed it would have been a STEMI if not caught early.",
      ai_text:
        "During a high-acuity trauma shift, identified a subtle rhythm change on telemetry that had been overlooked. Escalated immediately to the attending physician, resulting in emergent cardiac catheterization within 20 minutes. Early detection prevented progression to STEMI.",
      ai_category: "vigilance",
      ai_confidence: 0.94,
      ai_reasoning: "Proactive identification of a missed clinical finding before patient harm occurred.",
      tags: ["cardiac", "early-detection"],
      status: "submitted",
      hospital_id: "h1",
      department_id: "d1",
      created_at: "2026-03-28T14:30:00Z",
      updated_at: "2026-03-28T14:30:00Z",
      nominee: {
        id: "u1",
        email: "sarah.chen@hospital.org",
        full_name: "Sarah Chen",
        role: "staff",
        title: "RN, BSN",
        hospital_id: "h1",
        department_id: "d1",
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      nominator: {
        id: "u2",
        email: "james.miller@hospital.org",
        full_name: "James Miller",
        role: "staff",
        title: "MD",
        hospital_id: "h1",
        department_id: "d1",
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      reviews: [],
    },
    {
      id: "demo-2",
      cycle_id: null,
      nominee_id: "u3",
      nominator_id: null,
      is_anonymous: true,
      category: "flow",
      raw_text:
        "Marcus completely reorganized how we do our morning med pass. He created a system where meds are pre-sorted by room and time window so nurses aren't running back and forth to the Pyxis. Our unit went from averaging 45 min late on morning meds to being on time almost every day. He did this on his own time.",
      ai_text:
        "Independently redesigned the unit's morning medication distribution workflow by implementing a pre-sorted system organized by room and time window, eliminating redundant trips to the automated dispensing cabinet. Reduced average medication administration delays from 45 minutes to near-zero across the unit.",
      ai_category: "flow",
      ai_confidence: 0.91,
      ai_reasoning: "Systematic workflow improvement that increased efficiency and coordination across the unit.",
      tags: ["workflow", "medication-safety", "process-improvement"],
      status: "submitted",
      hospital_id: "h1",
      department_id: "d1",
      created_at: "2026-04-01T09:15:00Z",
      updated_at: "2026-04-01T09:15:00Z",
      nominee: {
        id: "u3",
        email: "marcus.washington@hospital.org",
        full_name: "Marcus Washington",
        role: "staff",
        title: "RN",
        hospital_id: "h1",
        department_id: "d1",
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      reviews: [],
    },
  ];

  const nominations = activeTab === "pending" ? demoNominations : [];

  const tabs = [
    { id: "pending" as Tab, label: "Pending", icon: ClipboardList },
    { id: "reviewed" as Tab, label: "Reviewed", icon: CheckCircle2 },
    { id: "scored" as Tab, label: "Scored", icon: BarChart3 },
  ];

  const handleReviewSubmit = async (review: {
    is_valid: boolean;
    strength_score?: number;
    impact_score?: number;
    notes?: string;
  }) => {
    if (!reviewingNomination) return;

    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomination_id: reviewingNomination.id,
        ...review,
      }),
    });

    setReviewingNomination(null);
    // TODO: refetch nominations
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900">
            Reviewer Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Review and score nominations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex">
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

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {nominations.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No {activeTab} nominations
            </p>
          </div>
        )}

        {nominations.map((nom) => (
          <NominationCard
            key={nom.id}
            nomination={nom}
            showNominator={!nom.is_anonymous}
            onAction={() => setReviewingNomination(nom)}
            actionLabel={activeTab === "pending" ? "Review" : "View"}
          />
        ))}
      </div>

      {/* Review Modal */}
      {reviewingNomination && (
        <ReviewModal
          nomination={reviewingNomination}
          onClose={() => setReviewingNomination(null)}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}
