import { CPICategory, NominationStatus } from "@/types";

// ============================================
// CPI Category Definitions
// ============================================

export const CPI_CATEGORIES: Record<
  CPICategory,
  { label: string; icon: string; description: string; color: string }
> = {
  flow: {
    label: "Flow",
    icon: "Zap",
    description:
      "Delivers efficient, coordinated care with minimal friction, maintaining pace without compromising quality.",
    color: "#F59E0B",
  },
  clinical_judgment: {
    label: "Clinical Judgment",
    icon: "Brain",
    description:
      "Applies sound decision-making and clinical reasoning in dynamic or uncertain situations.",
    color: "#8B5CF6",
  },
  patient_impact: {
    label: "Patient Impact",
    icon: "Stethoscope",
    description:
      "Directly improves patient experience, safety, or outcomes through meaningful action.",
    color: "#10B981",
  },
  vigilance: {
    label: "Vigilance",
    icon: "Shield",
    description:
      "Identifies and prevents issues before they impact patient care, safety, or workflow.",
    color: "#3B82F6",
  },
  ownership: {
    label: "Ownership",
    icon: "Settings",
    description:
      "Takes initiative and follows through to ensure tasks and care needs are fully completed.",
    color: "#EF4444",
  },
};

export const SCORE_ANCHORS = [
  { min: 0, max: 25, label: "Minimal" },
  { min: 26, max: 50, label: "Moderate" },
  { min: 51, max: 75, label: "Strong" },
  { min: 76, max: 100, label: "Exceptional" },
] as const;

export const STATUS_LABELS: Record<NominationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  scored: "Scored",
  eligible: "Eligible",
  recognized: "Recognized",
  annual_finalist: "Annual Finalist",
  national_honoree: "National Honoree",
};

export const STATUS_COLORS: Record<NominationStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  in_review: "bg-yellow-100 text-yellow-700",
  scored: "bg-purple-100 text-purple-700",
  eligible: "bg-emerald-100 text-emerald-700",
  recognized: "bg-green-100 text-green-700",
  annual_finalist: "bg-amber-100 text-amber-700",
  national_honoree: "bg-rose-100 text-rose-700",
};
