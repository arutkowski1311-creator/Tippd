export interface Operator {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  phone: string;
  email: string;
  address: string;
  service_area_description: string | null;
  tagline: string | null;
  twilio_number: string;
  stripe_account_id: string | null;
  // Pricing
  base_rate_10yd: number;
  base_rate_20yd: number;
  base_rate_30yd: number;
  included_tons_10yd: number;
  included_tons_20yd: number;
  included_tons_30yd: number;
  overage_per_ton: number;
  daily_overage_rate: number;
  standard_rental_days: number;
  quote_expiry_days: number;
  route_buffer_minutes: number;
  // Fleet right-sizing config
  new_dumpster_cost: number | null;
  used_dumpster_cost: number | null;
  used_dumpster_sale_price: number | null;
  utilization_high_threshold: number | null;
  utilization_low_threshold: number | null;
  new_truck_cost: number | null;
  used_truck_cost: number | null;
  truck_monthly_insurance: number | null;
  truck_maintenance_reserve: number | null;
  driver_monthly_wage: number | null;
  truck_amortization_months: number | null;
  // Dispatch & exception config
  workday_cap_hours: number;
  service_time_drop_minutes: number;
  service_time_pickup_minutes: number;
  service_time_dump_minutes: number;
  exception_auto_notify_customer: boolean;
  breakdown_redistribution_auto_propose: boolean;
  dump_alternate_radius_miles: number;
  prohibited_materials_list: string[];
  created_at: string;
}
