export const JOB_STATUSES = [
  "pending_approval",
  "scheduled",
  "en_route_drop",
  "dropped",
  "active",
  "pickup_requested",
  "pickup_scheduled",
  "en_route_pickup",
  "picked_up",
  "invoiced",
  "paid",
  "cancelled",
  "disputed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = [
  "residential",
  "commercial",
  "construction",
  "industrial",
  "estate_cleanout",
  "other",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export interface Job {
  id: string;
  operator_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  dumpster_id: string | null;
  dumpster_unit_number: string | null;
  truck_id: string | null;
  truck_name: string | null;
  assigned_driver_id: string | null;
  status: JobStatus;
  job_type: JobType;
  drop_address: string;
  drop_lat: number | null;
  drop_lng: number | null;
  requested_drop_start: string | null;
  requested_drop_end: string | null;
  actual_drop_time: string | null;
  requested_pickup_start: string | null;
  requested_pickup_end: string | null;
  actual_pickup_time: string | null;
  days_on_site: number | null;
  weight_lbs: number | null;
  driver_notes: string | null;
  customer_notes: string | null;
  photos_drop: string[];
  photos_pickup: string[];
  base_rate: number;
  weight_charge: number | null;
  daily_overage_charge: number;
  discount_amount: number;
  quote_id: string | null;
  // Deposit
  deposit_amount: number;
  deposit_status: "none" | "pending" | "charged" | "refunded" | "forfeited";
  stripe_checkout_session_id: string | null;
  stripe_setup_intent_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_method_id: string | null;
  terms_accepted_at: string | null;
  // Dump tracking (Section 07)
  dump_location_id: string | null;
  dump_arrival_time: string | null;
  dump_departure_time: string | null;
  dumpster_reused: boolean;
  created_at: string;
}
