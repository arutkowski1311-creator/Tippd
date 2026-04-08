export const INSIGHT_TYPES = [
  "route",
  "customer",
  "asset",
  "pricing",
  "labor",
  "payment",
  "opportunity",
] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

export interface Insight {
  id: string;
  operator_id: string;
  type: InsightType;
  title: string;
  body: string;
  dollar_impact: number | null;
  action_taken: boolean;
  week_of: string;
  created_at: string;
}

export const PRICING_SIGNALS = [
  "conversion_drop",
  "fuel_increase",
  "high_demand",
  "low_demand",
] as const;
export type PricingSignal = (typeof PRICING_SIGNALS)[number];

export interface PricingRecommendation {
  id: string;
  operator_id: string;
  signal_type: PricingSignal;
  title: string;
  observation: string;
  math: string;
  proposed_action: string;
  dollar_impact: number;
  status: "pending" | "approved" | "dismissed";
  approved_at: string | null;
  outcome_revenue: number | null;
  created_at: string;
}

export interface FleetRecommendation {
  id: string;
  operator_id: string;
  type: "add" | "sell";
  units_count: number;
  target_unit_ids: string[] | null;
  utilization_trigger: number;
  new_unit_cost: number;
  used_unit_cost: number;
  sale_price: number | null;
  monthly_revenue_per_unit: number;
  payback_months_new: number | null;
  payback_months_used: number | null;
  revenue_impact: number;
  utilization_after: number;
  status: "pending" | "approved" | "dismissed";
  created_at: string;
}

export interface FuelPriceLog {
  id: string;
  week_of: string;
  price_per_gallon: number;
  region: string;
  created_at: string;
}

export const FUNNEL_EVENTS = [
  "page_view",
  "pricing_viewed",
  "date_selected",
  "booking_started",
  "booking_complete",
  "abandoned",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export interface BookingFunnelEvent {
  id: string;
  operator_id: string;
  session_id: string;
  event: FunnelEvent;
  job_size: "10yd" | "20yd" | null;
  created_at: string;
}
