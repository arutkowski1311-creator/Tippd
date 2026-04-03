// ============================================
// CPI Core Types
// ============================================

export type CPICategory =
  | "flow"
  | "clinical_judgment"
  | "patient_impact"
  | "vigilance"
  | "ownership";

export type NominationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "scored"
  | "eligible"
  | "recognized"
  | "annual_finalist"
  | "national_honoree";

export type UserRole = "staff" | "reviewer" | "site_admin" | "national_board";

export type RecognitionLevel = "local" | "national";

export type CycleStatus = "draft" | "active" | "closed" | "finalized";

// ============================================
// Database Row Types
// ============================================

export interface Hospital {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  title: string | null;
  hospital_id: string | null;
  department_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Nomination {
  id: string;
  cycle_id: string | null;
  nominee_id: string;
  nominator_id: string | null;
  is_anonymous: boolean;
  category: CPICategory;
  raw_text: string;
  ai_text: string | null;
  ai_category: CPICategory | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  tags: string[];
  status: NominationStatus;
  hospital_id: string;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  nominee?: User;
  nominator?: User;
  reviews?: Review[];
}

export interface Review {
  id: string;
  nomination_id: string;
  reviewer_id: string;
  is_valid: boolean | null;
  strength_score: number | null;
  impact_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reviewer?: User;
}

export interface RecognitionCycle {
  id: string;
  hospital_id: string;
  name: string;
  status: CycleStatus;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface RecognitionOutcome {
  id: string;
  nomination_id: string;
  cycle_id: string;
  category: CPICategory;
  level: RecognitionLevel;
  final_score: number | null;
  selected_at: string;
  nomination?: Nomination;
}

export interface Credential {
  id: string;
  unique_code: string;
  outcome_id: string;
  user_id: string;
  category: CPICategory;
  level: RecognitionLevel;
  citation: string | null;
  verification_url: string | null;
  issued_at: string;
  revoked_at: string | null;
  user?: User;
  outcome?: RecognitionOutcome;
}

export interface CommitteeMember {
  id: string;
  hospital_id: string;
  user_id: string;
  role: string;
  is_national_board: boolean;
  created_at: string;
  user?: User;
}

// ============================================
// AI Assist Types
// ============================================

export interface AIAssistResult {
  category: CPICategory;
  confidence: number;
  reasoning: string;
  cleaned_text: string;
}

// ============================================
// Scoring Types
// ============================================

export interface NominationScore {
  nomination_id: string;
  average_score: number;
  average_strength: number;
  average_impact: number;
  review_count: number;
  unique_nominators: number;
}

export interface RankedNominee {
  user: User;
  nominations: Nomination[];
  total_nominations: number;
  unique_nominators: number;
  best_score: number;
  average_score: number;
  categories: CPICategory[];
}
