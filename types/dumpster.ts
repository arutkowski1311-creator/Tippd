export const DUMPSTER_STATUSES = [
  "available",
  "assigned",
  "deployed",
  "returning",
  "in_yard",
  "needs_cleaning",
  "needs_repair",
  "picked_up_full",
  "staged",         // Picked up, dropped outside a closed transfer station — full, waiting to be dumped
  "at_transfer",
  "repair",
  "retired",
] as const;
export type DumpsterStatus = (typeof DUMPSTER_STATUSES)[number];

export const DUMPSTER_SIZES = ["10yd", "20yd", "30yd"] as const;
export type DumpsterSize = (typeof DUMPSTER_SIZES)[number];

export const CONDITION_GRADES = ["A", "B", "C", "D", "F"] as const;
export type ConditionGrade = (typeof CONDITION_GRADES)[number];

export interface Dumpster {
  id: string;
  operator_id: string;
  unit_number: string;
  size: DumpsterSize;
  condition_grade: ConditionGrade;
  status: DumpsterStatus;
  current_job_id: string | null;
  last_inspection_date: string | null;
  repair_notes: string | null;
  repair_cost_estimate: number | null;
  repair_return_date: string | null;
  created_at: string;
  // Location tracking fields (added for staging flow + fleet map)
  current_lat: number | null;
  current_lng: number | null;
  current_location_label: string | null;
  fill_status: "empty" | "full" | "unknown";
  staged_at: string | null;
  staged_near_dump_id: string | null;
}

export interface DumpsterConditionLog {
  id: string;
  dumpster_id: string;
  job_id: string | null;
  previous_grade: ConditionGrade;
  new_grade: ConditionGrade;
  changed_by: string;
  notes: string | null;
  created_at: string;
}

export interface DumpsterInspection {
  id: string;
  dumpster_id: string;
  operator_id: string;
  inspected_by: string;
  inspection_date: string;
  appearance_score: number; // 1-10
  structural_score: number; // 1-10
  cleanliness_score: number; // 1-10
  overall_grade: ConditionGrade;
  notes: string | null;
  photos: string[];
  repair_items: { item: string; estimated_cost: number; priority: string }[];
  created_at: string;
}
