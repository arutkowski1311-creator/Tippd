export const ROUTE_STATUSES = ["draft", "locked", "in_progress", "completed"] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

export interface Route {
  id: string;
  operator_id: string;
  truck_id: string;
  driver_id: string | null;
  date: string;
  jobs_sequence: string[];
  status: RouteStatus;
  total_miles: number | null;
  fuel_used_gallons: number | null;
  start_time: string | null;
  end_time: string | null;
  revenue_generated: number | null;
  miles_per_box: number | null;
  dead_mile_breakdown: DeadMileBreakdown | null;
  dead_mile_pct: number | null;
  created_at: string;
}

export interface DeadMileBreakdown {
  revenue_delivery?: number;
  revenue_pickup?: number;
  transfer?: number;
  yard_reposition?: number;
  empty_retrieval?: number;
  return_to_yard?: number;
  detour?: number;
}
