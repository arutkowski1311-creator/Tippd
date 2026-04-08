export const EXCEPTION_TYPES = [
  "box_inaccessible",
  "overloaded_container",
  "prohibited_material",
  "customer_change_request",
  "truck_breakdown",
  "transfer_station_issue",
  "customer_not_present",
  "access_restriction",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type ExceptionSeverity = (typeof EXCEPTION_SEVERITIES)[number];

export const EXCEPTION_RESOLUTION_OWNERS = ["driver", "customer", "owner", "system"] as const;
export type ExceptionResolutionOwner = (typeof EXCEPTION_RESOLUTION_OWNERS)[number];

export const EXCEPTION_TIME_SENSITIVITIES = [
  "can_wait",
  "resolve_within_30min",
  "resolve_now",
  "tomorrow_ok",
] as const;
export type ExceptionTimeSensitivity = (typeof EXCEPTION_TIME_SENSITIVITIES)[number];

export const EXCEPTION_CASCADE_SCOPES = ["stop_only", "this_route", "all_routes"] as const;
export type ExceptionCascadeScope = (typeof EXCEPTION_CASCADE_SCOPES)[number];

export const EXCEPTION_STATUSES = ["open", "in_resolution", "resolved", "escalated"] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export interface Exception {
  id: string;
  operator_id: string;
  job_id: string | null;
  stop_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  type: ExceptionType;
  severity: ExceptionSeverity;
  resolution_owner: ExceptionResolutionOwner;
  time_sensitivity: ExceptionTimeSensitivity;
  cascade_scope: ExceptionCascadeScope;
  status: ExceptionStatus;
  driver_notes: string | null;
  photo_urls: string[];
  material_type: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  customer_notified: boolean;
  owner_notified: boolean;
  created_at: string;
}

// Pre-defined severity/owner/timing for each exception type (from blueprint Section 08)
export const EXCEPTION_DEFAULTS: Record<
  ExceptionType,
  {
    severity: ExceptionSeverity;
    resolution_owner: ExceptionResolutionOwner;
    time_sensitivity: ExceptionTimeSensitivity;
    cascade_scope: ExceptionCascadeScope;
  }
> = {
  box_inaccessible: {
    severity: "medium",
    resolution_owner: "owner",
    time_sensitivity: "resolve_within_30min",
    cascade_scope: "stop_only",
  },
  overloaded_container: {
    severity: "high",
    resolution_owner: "owner",
    time_sensitivity: "resolve_within_30min",
    cascade_scope: "stop_only",
  },
  prohibited_material: {
    severity: "high",
    resolution_owner: "driver",
    time_sensitivity: "resolve_now",
    cascade_scope: "stop_only",
  },
  customer_change_request: {
    severity: "low",
    resolution_owner: "system",
    time_sensitivity: "can_wait",
    cascade_scope: "stop_only",
  },
  truck_breakdown: {
    severity: "critical",
    resolution_owner: "system",
    time_sensitivity: "resolve_now",
    cascade_scope: "all_routes",
  },
  transfer_station_issue: {
    severity: "high",
    resolution_owner: "system",
    time_sensitivity: "resolve_now",
    cascade_scope: "this_route",
  },
  customer_not_present: {
    severity: "low",
    resolution_owner: "system",
    time_sensitivity: "can_wait",
    cascade_scope: "stop_only",
  },
  access_restriction: {
    severity: "medium",
    resolution_owner: "owner",
    time_sensitivity: "resolve_within_30min",
    cascade_scope: "this_route",
  },
};
