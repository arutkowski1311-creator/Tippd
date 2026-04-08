export interface DumpLocation {
  id: string;
  operator_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours_open: string;
  hours_close: string;
  cost_per_ton: number;
  estimated_wait_minutes: number;
  is_active: boolean;
}

export interface DriverTimecard {
  id: string;
  driver_id: string;
  operator_id: string;
  route_id: string | null;
  clock_in: string;
  clock_out: string | null;
  regular_hours: number;
  overtime_hours: number;
  total_pay: number | null;
  date: string;
}
