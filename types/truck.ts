export const TRUCK_STATUSES = ["active", "repair", "retired"] as const;
export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export const SERVICE_TYPES = [
  // Weekly
  "grease_pivots",
  "hydraulic_inspection",
  "battery",
  "air_tanks",
  "slack_adjusters",
  // Core service (5k mi)
  "oil_filter",
  "fuel_filter",
  "air_filter",
  "chassis_lube",
  "belts_hoses",
  "brakes_inspection",
  // Extended (15-25k mi)
  "transmission",
  "differential",
  "air_dryer",
  "alignment",
  // Major (30-50k mi)
  "brakes_full_service",
  "suspension",
  "coolant",
  // Hydraulic (by hours)
  "hydraulic_filter",
  "hydraulic_fluid",
  // Annual
  "dot_inspection",
  "frame_inspection",
  "electrical",
  "def_system",
  "exhaust_dpf",
  "registration",
  "state_inspection",
  // Tires
  "tire_front_left",
  "tire_front_right",
  "tire_rear_1",
  "tire_rear_2",
  "tire_rear_3",
  "tire_rear_4",
  "tire_rear_5",
  "tire_rear_6",
  "tire_rear_7",
  "tire_rear_8",
  // Other
  "other",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/** Human-readable labels for each service type */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  grease_pivots: "Grease Pivot Points",
  hydraulic_inspection: "Hydraulic Hose Inspection",
  battery: "Battery Check",
  air_tanks: "Drain Air Tanks",
  slack_adjusters: "Brake Slack Adjusters",
  oil_filter: "Engine Oil & Filter",
  fuel_filter: "Fuel Filters",
  air_filter: "Air Filter",
  chassis_lube: "Chassis Lube",
  belts_hoses: "Belts & Hoses",
  brakes_inspection: "Brake Inspection",
  transmission: "Transmission Fluid",
  differential: "Differential Oil",
  air_dryer: "Air Dryer Cartridge",
  alignment: "Alignment Check",
  brakes_full_service: "Full Brake Service",
  suspension: "Suspension Inspection",
  coolant: "Cooling System",
  hydraulic_filter: "Hydraulic Filter",
  hydraulic_fluid: "Hydraulic Fluid",
  dot_inspection: "DOT Inspection",
  frame_inspection: "Frame Inspection",
  electrical: "Electrical System",
  def_system: "DEF System Service",
  exhaust_dpf: "Exhaust / DPF Service",
  registration: "Registration",
  state_inspection: "NJ State Inspection",
  tire_front_left: "Tire — Front Left",
  tire_front_right: "Tire — Front Right",
  tire_rear_1: "Tire — Rear 1",
  tire_rear_2: "Tire — Rear 2",
  tire_rear_3: "Tire — Rear 3",
  tire_rear_4: "Tire — Rear 4",
  tire_rear_5: "Tire — Rear 5",
  tire_rear_6: "Tire — Rear 6",
  tire_rear_7: "Tire — Rear 7",
  tire_rear_8: "Tire — Rear 8",
  other: "Other",
};

export interface Truck {
  id: string;
  operator_id: string;
  name: string;
  plate: string;
  year: number;
  make: string;
  model: string;
  current_mileage: number;
  current_hours?: number;
  status: TruckStatus;
  created_at: string;
}

export interface TruckServiceLog {
  id: string;
  truck_id: string;
  operator_id: string;
  service_type: string;
  date_performed: string;
  mileage_at_service: number;
  next_due_miles: number | null;
  next_due_date: string | null;
  cost: number;
  vendor: string | null;
  notes: string | null;
  created_at: string;
}
