import type { JobStatus } from "@/types/job";
import type { InvoiceStatus } from "@/types/invoice";
import type { QuoteStatus } from "@/types/quote";
import type { DumpsterStatus } from "@/types/dumpster";
import type { ConditionGrade } from "@/types/dumpster";
import type { UserRole } from "@/types/user";

// ─── Status Colors ───

export const JOB_STATUS_COLORS: Record<JobStatus, { bg: string; text: string; label: string }> = {
  pending_approval: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending Approval" },
  scheduled: { bg: "bg-blue-100", text: "text-blue-800", label: "Scheduled" },
  en_route_drop: { bg: "bg-indigo-100", text: "text-indigo-800", label: "En Route (Drop)" },
  dropped: { bg: "bg-green-100", text: "text-green-800", label: "Dropped" },
  active: { bg: "bg-green-200", text: "text-green-900", label: "Active" },
  pickup_requested: { bg: "bg-orange-100", text: "text-orange-800", label: "Pickup Requested" },
  pickup_scheduled: { bg: "bg-blue-100", text: "text-blue-800", label: "Pickup Scheduled" },
  en_route_pickup: { bg: "bg-indigo-100", text: "text-indigo-800", label: "En Route (Pickup)" },
  picked_up: { bg: "bg-teal-100", text: "text-teal-800", label: "Picked Up" },
  invoiced: { bg: "bg-purple-100", text: "text-purple-800", label: "Invoiced" },
  paid: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Paid" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-800", label: "Cancelled" },
  disputed: { bg: "bg-red-100", text: "text-red-800", label: "Disputed" },
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-800", label: "Draft" },
  sent: { bg: "bg-blue-100", text: "text-blue-800", label: "Sent" },
  partial: { bg: "bg-amber-100", text: "text-amber-800", label: "Partial" },
  paid: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Paid" },
  overdue_30: { bg: "bg-orange-100", text: "text-orange-800", label: "Overdue (30d)" },
  overdue_45: { bg: "bg-orange-200", text: "text-orange-900", label: "Overdue (45d)" },
  overdue_60: { bg: "bg-red-100", text: "text-red-800", label: "Overdue (60d)" },
  overdue_80: { bg: "bg-red-200", text: "text-red-900", label: "Overdue (80d)" },
  collections: { bg: "bg-red-300", text: "text-red-950", label: "Collections" },
  disputed: { bg: "bg-purple-100", text: "text-purple-800", label: "Disputed" },
  written_off: { bg: "bg-gray-200", text: "text-gray-600", label: "Written Off" },
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-800", label: "Draft" },
  sent: { bg: "bg-blue-100", text: "text-blue-800", label: "Sent" },
  viewed: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Viewed" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Approved" },
  declined: { bg: "bg-red-100", text: "text-red-800", label: "Declined" },
  expired: { bg: "bg-gray-200", text: "text-gray-600", label: "Expired" },
  converted: { bg: "bg-green-100", text: "text-green-800", label: "Converted" },
};

export const DUMPSTER_STATUS_COLORS: Record<DumpsterStatus, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Available" },
  assigned: { bg: "bg-blue-100", text: "text-blue-800", label: "Assigned" },
  deployed: { bg: "bg-amber-100", text: "text-amber-800", label: "Deployed" },
  returning: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Returning" },
  in_yard: { bg: "bg-gray-100", text: "text-gray-800", label: "In Yard" },
  needs_cleaning: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Needs Cleaning" },
  needs_repair: { bg: "bg-orange-100", text: "text-orange-800", label: "Needs Repair" },
  picked_up_full: { bg: "bg-violet-100", text: "text-violet-800", label: "Picked Up (Full)" },
  staged: { bg: "bg-orange-100", text: "text-orange-800", label: "Staged Outside Gate" },
  at_transfer: { bg: "bg-cyan-100", text: "text-cyan-800", label: "At Transfer Station" },
  repair: { bg: "bg-red-100", text: "text-red-800", label: "Repair" },
  retired: { bg: "bg-gray-200", text: "text-gray-600", label: "Retired" },
};

export const CONDITION_GRADE_COLORS: Record<ConditionGrade, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-emerald-100", text: "text-emerald-800", label: "A — Excellent" },
  B: { bg: "bg-green-100", text: "text-green-800", label: "B — Good" },
  C: { bg: "bg-amber-100", text: "text-amber-800", label: "C — Fair" },
  D: { bg: "bg-orange-100", text: "text-orange-800", label: "D — Poor" },
  F: { bg: "bg-red-100", text: "text-red-800", label: "F — Out of Commission" },
};

// ─── Role Permissions (Blueprint Section 01) ───

type Permission =
  | "view_all_jobs"
  | "approve_bookings"
  | "edit_pricing"
  | "view_financials"
  | "access_billing"
  | "manage_fleet"
  | "send_comms"
  | "view_route_analytics"
  | "invite_users"
  | "delete_records"
  | "access_driver_app"
  | "generate_content"
  | "manage_brand";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "view_all_jobs",
    "approve_bookings",
    "edit_pricing",
    "view_financials",
    "access_billing",
    "manage_fleet",
    "send_comms",
    "view_route_analytics",
    "invite_users",
    "delete_records",
    "access_driver_app",
    "generate_content",
    "manage_brand",
  ],
  manager: [
    "view_all_jobs",
    "approve_bookings",
    "manage_fleet",
    "send_comms",
    "view_route_analytics",
    "access_driver_app",
    "generate_content",
  ],
  driver: ["access_driver_app"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// ─── Dumpster Sizes ───

export const DUMPSTER_SIZE_INFO = {
  "10yd": {
    label: "10 Yard",
    dimensions: '12\' L x 8\' W x 3.5\' H',
    description: "Small cleanouts, single room renovation, yard debris",
    price: 550,
    includedTons: 2,
  },
  "20yd": {
    label: "20 Yard",
    dimensions: '22\' L x 8\' W x 4.5\' H',
    description: "Full home cleanout, large renovation, construction debris",
    price: 750,
    includedTons: 4,
  },
  "30yd": {
    label: "30 Yard",
    dimensions: '22\' L x 8\' W x 6\' H',
    description: "Major construction, commercial demolition, whole-house cleanout",
    price: 850,
    includedTons: 5,
  },
} as const;

export const OVERAGE_PER_TON = 150;

// ─── Deposit ───

export const DEPOSIT_PERCENT = 0.25;
export const DEPOSIT_CANCELLATION_HOURS = 48;

// ─── Collections Cadence ───

export const COLLECTION_SCHEDULE = [
  { day: 30, action: "reminder", label: "First Reminder" },
  { day: 45, action: "reminder", label: "Second Reminder" },
  { day: 60, action: "late_fee", feePercent: 7, label: "7% Late Fee Applied" },
  { day: 80, action: "late_fee", feePercent: 10, label: "Additional 10% Late Fee" },
  { day: 90, action: "collections", label: "Sent to Collections" },
] as const;

// ─── Overdue Dumpster Alerts ───

export const OVERDUE_DUMPSTER_DAYS = [10, 14, 21] as const;
