// ============================================================
// Truck Maintenance Schedule — Visual Scorecard System
// ============================================================

export type MaintenanceCategory =
  | "weekly"
  | "core_service"
  | "extended"
  | "major"
  | "hydraulic"
  | "annual"
  | "tires";

export type MaintenanceStatus = "green" | "yellow" | "orange" | "red";

export interface MaintenanceItem {
  type: string;
  label: string;
  category: MaintenanceCategory;
  defaultMileInterval: number | null;
  defaultHourInterval: number | null;
  defaultDayInterval: number | null;
  defaultWarningMiles: number;
  defaultWarningDays: number;
  description: string;
}

// -----------------------------------------------------------
// All maintenance items for roll-off trucks
// -----------------------------------------------------------

export const MAINTENANCE_ITEMS: MaintenanceItem[] = [
  // ── Weekly / ~50 hours ───────────────────────────────────
  {
    type: "grease_pivots",
    label: "Grease Pivot Points",
    category: "weekly",
    defaultMileInterval: null,
    defaultHourInterval: 50,
    defaultDayInterval: 7,
    defaultWarningMiles: 0,
    defaultWarningDays: 2,
    description: "Grease all pivot points (hoist, rails, hook)",
  },
  {
    type: "hydraulic_inspection",
    label: "Hydraulic Hose Inspection",
    category: "weekly",
    defaultMileInterval: null,
    defaultHourInterval: 50,
    defaultDayInterval: 7,
    defaultWarningMiles: 0,
    defaultWarningDays: 2,
    description: "Inspect hydraulic hoses for cracking/chafing",
  },
  {
    type: "battery",
    label: "Battery Check",
    category: "weekly",
    defaultMileInterval: null,
    defaultHourInterval: 50,
    defaultDayInterval: 7,
    defaultWarningMiles: 0,
    defaultWarningDays: 2,
    description: "Check battery terminals",
  },
  {
    type: "air_tanks",
    label: "Drain Air Tanks",
    category: "weekly",
    defaultMileInterval: null,
    defaultHourInterval: 50,
    defaultDayInterval: 7,
    defaultWarningMiles: 0,
    defaultWarningDays: 2,
    description: "Drain air tanks (moisture)",
  },
  {
    type: "slack_adjusters",
    label: "Brake Slack Adjusters",
    category: "weekly",
    defaultMileInterval: null,
    defaultHourInterval: 50,
    defaultDayInterval: 7,
    defaultWarningMiles: 0,
    defaultWarningDays: 2,
    description: "Check brake slack adjusters",
  },

  // ── Every 5,000 miles (core service) ─────────────────────
  {
    type: "oil_filter",
    label: "Engine Oil & Filter",
    category: "core_service",
    defaultMileInterval: 5000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 500,
    defaultWarningDays: 0,
    description: "Engine oil + filter change",
  },
  {
    type: "fuel_filter",
    label: "Fuel Filters",
    category: "core_service",
    defaultMileInterval: 5000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 500,
    defaultWarningDays: 0,
    description: "Fuel filters (primary + secondary)",
  },
  {
    type: "air_filter",
    label: "Air Filter",
    category: "core_service",
    defaultMileInterval: 5000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 500,
    defaultWarningDays: 0,
    description: "Inspect/replace air filter",
  },
  {
    type: "chassis_lube",
    label: "Chassis Lube",
    category: "core_service",
    defaultMileInterval: 5000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 500,
    defaultWarningDays: 0,
    description: "Full chassis lube",
  },
  {
    type: "belts_hoses",
    label: "Belts & Hoses",
    category: "core_service",
    defaultMileInterval: 5000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 500,
    defaultWarningDays: 0,
    description: "Check belts & hoses",
  },
  {
    type: "brakes_inspection",
    label: "Brake Inspection",
    category: "core_service",
    defaultMileInterval: 5000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 500,
    defaultWarningDays: 0,
    description: "Inspect brakes",
  },

  // ── Every 15,000–25,000 miles (extended) ─────────────────
  {
    type: "transmission",
    label: "Transmission Fluid",
    category: "extended",
    defaultMileInterval: 20000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 2000,
    defaultWarningDays: 0,
    description: "Transmission fluid check/change",
  },
  {
    type: "differential",
    label: "Differential Oil",
    category: "extended",
    defaultMileInterval: 20000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 2000,
    defaultWarningDays: 0,
    description: "Differential oil check",
  },
  {
    type: "air_dryer",
    label: "Air Dryer Cartridge",
    category: "extended",
    defaultMileInterval: 20000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 2000,
    defaultWarningDays: 0,
    description: "Replace air dryer cartridge",
  },
  {
    type: "alignment",
    label: "Alignment Check",
    category: "extended",
    defaultMileInterval: 20000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 2000,
    defaultWarningDays: 0,
    description: "Alignment check",
  },

  // ── Every 30,000–50,000 miles (major) ────────────────────
  {
    type: "brakes_full_service",
    label: "Full Brake Service",
    category: "major",
    defaultMileInterval: 40000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 5000,
    defaultWarningDays: 0,
    description: "Full brake service",
  },
  {
    type: "suspension",
    label: "Suspension Inspection",
    category: "major",
    defaultMileInterval: 40000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 5000,
    defaultWarningDays: 0,
    description: "Suspension inspection (bushings, shocks)",
  },
  {
    type: "coolant",
    label: "Cooling System",
    category: "major",
    defaultMileInterval: 40000,
    defaultHourInterval: null,
    defaultDayInterval: null,
    defaultWarningMiles: 5000,
    defaultWarningDays: 0,
    description: "Cooling system inspection",
  },

  // ── Hydraulic System (by hours) ──────────────────────────
  {
    type: "hydraulic_filter",
    label: "Hydraulic Filter",
    category: "hydraulic",
    defaultMileInterval: null,
    defaultHourInterval: 750,
    defaultDayInterval: null,
    defaultWarningMiles: 0,
    defaultWarningDays: 0,
    description: "Replace hydraulic filter (every 500-1000 hours)",
  },
  {
    type: "hydraulic_fluid",
    label: "Hydraulic Fluid",
    category: "hydraulic",
    defaultMileInterval: null,
    defaultHourInterval: 1500,
    defaultDayInterval: null,
    defaultWarningMiles: 0,
    defaultWarningDays: 0,
    description: "Replace hydraulic fluid (every 1000-2000 hours)",
  },

  // ── Annual ───────────────────────────────────────────────
  {
    type: "dot_inspection",
    label: "DOT Inspection",
    category: "annual",
    defaultMileInterval: null,
    defaultHourInterval: null,
    defaultDayInterval: 365,
    defaultWarningMiles: 0,
    defaultWarningDays: 30,
    description: "DOT inspection",
  },
  {
    type: "frame_inspection",
    label: "Frame Inspection",
    category: "annual",
    defaultMileInterval: null,
    defaultHourInterval: null,
    defaultDayInterval: 365,
    defaultWarningMiles: 0,
    defaultWarningDays: 30,
    description: "Frame inspection (cracks near hoist mounts)",
  },
  {
    type: "electrical",
    label: "Electrical System",
    category: "annual",
    defaultMileInterval: null,
    defaultHourInterval: null,
    defaultDayInterval: 365,
    defaultWarningMiles: 0,
    defaultWarningDays: 30,
    description: "Electrical system check",
  },
  {
    type: "def_system",
    label: "DEF System Service",
    category: "annual",
    defaultMileInterval: null,
    defaultHourInterval: null,
    defaultDayInterval: 365,
    defaultWarningMiles: 0,
    defaultWarningDays: 30,
    description: "DEF system service",
  },
  {
    type: "exhaust_dpf",
    label: "Exhaust / DPF Service",
    category: "annual",
    defaultMileInterval: null,
    defaultHourInterval: null,
    defaultDayInterval: 365,
    defaultWarningMiles: 0,
    defaultWarningDays: 30,
    description: "Exhaust/DPF service",
  },
  {
    type: "registration",
    label: "Registration",
    category: "annual",
    defaultMileInterval: null,
    defaultHourInterval: null,
    defaultDayInterval: 365,
    defaultWarningMiles: 0,
    defaultWarningDays: 30,
    description: "Registration renewal",
  },
  {
    type: "state_inspection",
    label: "NJ State Inspection",
    category: "annual",
    defaultMileInterval: null,
    defaultHourInterval: null,
    defaultDayInterval: 365,
    defaultWarningMiles: 0,
    defaultWarningDays: 30,
    description: "NJ state inspection",
  },
];

// -----------------------------------------------------------
// Category labels & order
// -----------------------------------------------------------

export const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  weekly: "Weekly / 50 Hours",
  core_service: "Core Service (5,000 mi)",
  extended: "Extended (15–25k mi)",
  major: "Major (30–50k mi)",
  hydraulic: "Hydraulic System",
  annual: "Annual",
  tires: "Tires",
};

export const CATEGORY_ORDER: MaintenanceCategory[] = [
  "weekly",
  "core_service",
  "extended",
  "major",
  "hydraulic",
  "annual",
];

// -----------------------------------------------------------
// Helper: Calculate percentage life remaining
// Returns 0-100 (100 = just serviced, 0 = overdue)
// -----------------------------------------------------------

export function getLifeRemaining(currentSince: number, interval: number): number {
  if (interval <= 0) return 100;
  const used = Math.max(0, currentSince);
  const remaining = interval - used;
  const percent = (remaining / interval) * 100;
  return Math.max(0, Math.min(100, percent));
}

// -----------------------------------------------------------
// Helper: Get status color from percentage
// -----------------------------------------------------------

export function getStatusFromPercent(percent: number): MaintenanceStatus {
  if (percent > 50) return "green";
  if (percent > 25) return "yellow";
  if (percent > 10) return "orange";
  return "red";
}

// -----------------------------------------------------------
// Helper: Get day-based life remaining
// -----------------------------------------------------------

export function getDayLifeRemaining(lastServiceDate: string | null, dayInterval: number): number {
  if (!lastServiceDate || dayInterval <= 0) return 100;
  const last = new Date(lastServiceDate + "T00:00:00");
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = dayInterval - daysSince;
  const percent = (remaining / dayInterval) * 100;
  return Math.max(0, Math.min(100, percent));
}

// -----------------------------------------------------------
// Helper: Days remaining from last service date
// -----------------------------------------------------------

export function getDaysRemaining(lastServiceDate: string | null, dayInterval: number): number | null {
  if (!lastServiceDate || !dayInterval) return null;
  const last = new Date(lastServiceDate + "T00:00:00");
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return dayInterval - daysSince;
}

// -----------------------------------------------------------
// Color utilities for Tailwind classes
// -----------------------------------------------------------

export function statusBarColor(status: MaintenanceStatus): string {
  switch (status) {
    case "green":
      return "bg-emerald-500";
    case "yellow":
      return "bg-yellow-500";
    case "orange":
      return "bg-orange-500";
    case "red":
      return "bg-red-500";
  }
}

export function statusTextColor(status: MaintenanceStatus): string {
  switch (status) {
    case "green":
      return "text-emerald-400";
    case "yellow":
      return "text-yellow-400";
    case "orange":
      return "text-orange-400";
    case "red":
      return "text-red-400";
  }
}

export function statusBgColor(status: MaintenanceStatus): string {
  switch (status) {
    case "green":
      return "bg-emerald-900/30 text-emerald-400";
    case "yellow":
      return "bg-yellow-900/30 text-yellow-400";
    case "orange":
      return "bg-orange-900/30 text-orange-400";
    case "red":
      return "bg-red-900/30 text-red-400";
  }
}

export function statusLabel(status: MaintenanceStatus): string {
  switch (status) {
    case "green":
      return "Good";
    case "yellow":
      return "Due Soon";
    case "orange":
      return "Warning";
    case "red":
      return "Overdue";
  }
}

// -----------------------------------------------------------
// Look up a MaintenanceItem by its type
// -----------------------------------------------------------

export function getMaintenanceItemByType(serviceType: string): MaintenanceItem | undefined {
  return MAINTENANCE_ITEMS.find((m) => m.type === serviceType);
}

// -----------------------------------------------------------
// Tire positions
// -----------------------------------------------------------

export const TIRE_POSITIONS = [
  "front_left",
  "front_right",
  "rear_1",
  "rear_2",
  "rear_3",
  "rear_4",
  "rear_5",
  "rear_6",
  "rear_7",
  "rear_8",
] as const;

export type TirePosition = (typeof TIRE_POSITIONS)[number];

export const TIRE_POSITION_LABELS: Record<TirePosition, string> = {
  front_left: "Front Left",
  front_right: "Front Right",
  rear_1: "Rear 1 (OL)",
  rear_2: "Rear 2 (IL)",
  rear_3: "Rear 3 (IR)",
  rear_4: "Rear 4 (OR)",
  rear_5: "Rear 5 (OL)",
  rear_6: "Rear 6 (IL)",
  rear_7: "Rear 7 (IR)",
  rear_8: "Rear 8 (OR)",
};

export const TIRE_CONDITIONS = ["new", "good", "fair", "worn", "replace"] as const;
export type TireCondition = (typeof TIRE_CONDITIONS)[number];

export function tireConditionColor(condition: TireCondition): string {
  switch (condition) {
    case "new":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "good":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "fair":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "worn":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "replace":
      return "bg-red-500/10 text-red-400 border-red-500/20";
  }
}

// Tread depth: new = 20-24/32, replace at 4/32
export function treadDepthPercent(depth: number): number {
  const max = 22; // average new tread
  const min = 4;  // legal minimum
  const percent = ((depth - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, percent));
}

export function treadDepthStatus(depth: number): MaintenanceStatus {
  if (depth >= 12) return "green";
  if (depth >= 8) return "yellow";
  if (depth >= 4) return "orange";
  return "red";
}
