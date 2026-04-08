/**
 * Dumpster Grade Matching — Blueprint Section 07
 *
 * Controls whether a dumpster can be assigned to a job based on
 * condition grade and job type. Some assignments are silent,
 * some prompt the driver, and F-grade is always blocked.
 */

import type { ConditionGrade } from "@/types/dumpster";
import type { JobType } from "@/types/job";

export type AssignmentAction = "silent" | "soft_prompt" | "strong_prompt" | "blocked";

interface GradeMatchResult {
  action: AssignmentAction;
  message: string | null;
}

/**
 * Grade + Job Type → Assignment Action Matrix
 * From blueprint Section 07 "Driver Prompts by Grade + Job Type"
 */
export function getGradeAssignment(
  grade: ConditionGrade,
  jobType: JobType
): GradeMatchResult {
  // F is always blocked
  if (grade === "F") {
    return {
      action: "blocked",
      message: "Grade F — unit is out of commission. Not assignable.",
    };
  }

  // A and B are always silent
  if (grade === "A" || grade === "B") {
    return { action: "silent", message: null };
  }

  // C varies by job type
  if (grade === "C") {
    switch (jobType) {
      case "construction":
      case "industrial":
        return { action: "silent", message: null };
      case "commercial":
        return {
          action: "soft_prompt",
          message: "Grade C — OK for this commercial job?",
        };
      case "residential":
      case "estate_cleanout":
        return {
          action: "strong_prompt",
          message: "Grade C — suitable for residential delivery?",
        };
      default:
        return {
          action: "soft_prompt",
          message: "Grade C — confirm assignment?",
        };
    }
  }

  // D always prompts regardless
  if (grade === "D") {
    switch (jobType) {
      case "residential":
      case "estate_cleanout":
        return {
          action: "strong_prompt",
          message: "Grade D — suitable for residential? Consider swapping.",
        };
      default:
        return {
          action: "strong_prompt",
          message: "Grade D — driver discretion. Proceed?",
        };
    }
  }

  return { action: "silent", message: null };
}

/**
 * Check if a dumpster can be reused for a specific job after dump.
 * Used by the routing engine when chaining pickup → dump → next drop.
 */
export function canReuseDumpster(
  grade: ConditionGrade,
  nextJobType: JobType | null
): { canReuse: boolean; needsPrompt: boolean; message: string | null } {
  if (grade === "F") {
    return {
      canReuse: false,
      needsPrompt: false,
      message: "Unit pulled from service. Must return to yard.",
    };
  }

  if (!nextJobType) {
    return { canReuse: false, needsPrompt: false, message: "No matching drop job on route." };
  }

  const match = getGradeAssignment(grade, nextJobType);

  if (match.action === "blocked") {
    return { canReuse: false, needsPrompt: false, message: match.message };
  }

  return {
    canReuse: true,
    needsPrompt: match.action !== "silent",
    message: match.message,
  };
}
