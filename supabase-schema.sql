-- ═══════════════════════════════════════════════════════════════
-- TIPPD — Complete Database Schema
-- Multi-tenant dumpster rental SaaS
-- Idempotent: safe to re-run at any time
-- ═══════════════════════════════════════════════════════════════

-- ─── Enable extensions ───
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- OPERATORS (top-level tenant)
-- ═══════════════════════════════════════════════════════════════
create table if not exists operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  custom_domain text,
  logo_url text,
  primary_color text default '#E63946',
  accent_color text default '#F4A261',
  phone text not null,
  email text not null,
  address text not null,
  service_area_description text,
  tagline text,
  twilio_number text,
  stripe_account_id text,
  -- Pricing
  base_rate_10yd decimal default 300.00,
  base_rate_20yd decimal default 400.00,
  weight_rate_per_lb decimal default 0.05,
  daily_overage_rate decimal default 25.00,
  standard_rental_days integer default 7,
  quote_expiry_days integer default 7,
  route_buffer_minutes integer default 30,
  -- Fleet right-sizing config (Section 10)
  new_dumpster_cost decimal,
  used_dumpster_cost decimal,
  used_dumpster_sale_price decimal,
  utilization_high_threshold integer default 88,
  utilization_low_threshold integer default 55,
  new_truck_cost decimal default 105000,
  used_truck_cost decimal default 45000,
  truck_monthly_insurance decimal,
  truck_maintenance_reserve decimal default 500,
  driver_monthly_wage decimal,
  truck_amortization_months integer default 60,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- USERS (linked to Supabase Auth)
-- ═══════════════════════════════════════════════════════════════
create table if not exists users (
  id uuid primary key references auth.users on delete cascade,
  operator_id uuid references operators(id),
  role text not null check (role in ('owner', 'manager', 'driver')),
  name text not null,
  phone text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_users_operator on users(operator_id);

-- ═══════════════════════════════════════════════════════════════
-- CUSTOMERS
-- ═══════════════════════════════════════════════════════════════
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  name text not null,
  phone text not null,
  email text,
  type text not null check (type in ('residential', 'contractor')),
  billing_address text,
  autopay_enabled boolean default false,
  stripe_customer_id text,
  stripe_payment_method_id text,
  pain_score integer default 0,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_customers_operator on customers(operator_id);
create index if not exists idx_customers_phone on customers(operator_id, phone);

-- ═══════════════════════════════════════════════════════════════
-- TRUCKS
-- ═══════════════════════════════════════════════════════════════
create table if not exists trucks (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  name text not null,
  plate text not null,
  year integer not null,
  make text not null,
  model text not null,
  current_mileage integer default 0,
  status text default 'active' check (status in ('active', 'repair', 'retired')),
  created_at timestamptz default now()
);
create index if not exists idx_trucks_operator on trucks(operator_id);

-- ═══════════════════════════════════════════════════════════════
-- QUOTES
-- ═══════════════════════════════════════════════════════════════
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  customer_id uuid references customers(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  status text default 'draft' check (status in ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired', 'converted')),
  line_items jsonb not null default '[]',
  discount_type text check (discount_type in ('flat', 'percent')),
  discount_value decimal default 0,
  deposit_percent integer default 0,
  deposit_amount decimal default 0,
  subtotal decimal not null default 0,
  total decimal not null default 0,
  expiry_date date not null default (current_date + interval '7 days'),
  terms text,
  internal_notes text,
  approve_token text unique default gen_random_uuid()::text,
  approved_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz default now()
);
create index if not exists idx_quotes_operator on quotes(operator_id);
create index if not exists idx_quotes_token on quotes(approve_token);

-- ═══════════════════════════════════════════════════════════════
-- DUMP LOCATIONS (Section 07)
-- ═══════════════════════════════════════════════════════════════
create table if not exists dump_locations (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  name text not null,
  address text not null,
  lat decimal,
  lng decimal,
  hours_open time,
  hours_close time,
  cost_per_ton decimal default 0,
  estimated_wait_minutes integer default 15,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_dump_locations_operator on dump_locations(operator_id);

-- ═══════════════════════════════════════════════════════════════
-- DUMPSTERS
-- ═══════════════════════════════════════════════════════════════
create table if not exists dumpsters (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  unit_number text not null,
  size text not null check (size in ('10yd', '20yd')),
  condition_grade text default 'A' check (condition_grade in ('A', 'B', 'C', 'D', 'F')),
  status text default 'available' check (status in ('available', 'assigned', 'deployed', 'returning', 'in_yard', 'repair', 'retired')),
  current_job_id uuid, -- FK added after jobs table
  last_inspection_date date,
  repair_notes text,
  repair_cost_estimate decimal,
  repair_return_date date,
  created_at timestamptz default now(),
  unique(operator_id, unit_number)
);
create index if not exists idx_dumpsters_operator on dumpsters(operator_id);
create index if not exists idx_dumpsters_status on dumpsters(operator_id, status);

-- ═══════════════════════════════════════════════════════════════
-- JOBS
-- ═══════════════════════════════════════════════════════════════
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  customer_id uuid not null references customers(id),
  customer_name text not null,
  customer_phone text not null,
  dumpster_id uuid references dumpsters(id),
  dumpster_unit_number text,
  truck_id uuid references trucks(id),
  truck_name text,
  assigned_driver_id uuid references users(id),
  status text default 'pending_approval' check (status in (
    'pending_approval', 'scheduled', 'en_route_drop', 'dropped', 'active',
    'pickup_requested', 'pickup_scheduled', 'en_route_pickup', 'picked_up',
    'invoiced', 'paid', 'cancelled', 'disputed'
  )),
  job_type text default 'residential' check (job_type in (
    'residential', 'commercial', 'construction', 'industrial', 'estate_cleanout', 'other'
  )),
  drop_address text not null,
  drop_lat decimal,
  drop_lng decimal,
  requested_drop_start timestamptz,
  requested_drop_end timestamptz,
  actual_drop_time timestamptz,
  requested_pickup_start timestamptz,
  requested_pickup_end timestamptz,
  actual_pickup_time timestamptz,
  days_on_site integer,
  weight_lbs integer,
  driver_notes text,
  customer_notes text,
  photos_drop jsonb default '[]',
  photos_pickup jsonb default '[]',
  base_rate decimal not null default 0,
  weight_charge decimal,
  daily_overage_charge decimal default 0,
  discount_amount decimal default 0,
  quote_id uuid references quotes(id),
  -- Dump tracking (Section 07)
  dump_location_id uuid references dump_locations(id),
  dump_arrival_time timestamptz,
  dump_departure_time timestamptz,
  dumpster_reused boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_jobs_operator on jobs(operator_id);
create index if not exists idx_jobs_status on jobs(operator_id, status);
create index if not exists idx_jobs_customer on jobs(customer_id);
create index if not exists idx_jobs_driver on jobs(assigned_driver_id);
create index if not exists idx_jobs_dumpster on jobs(dumpster_id);

-- Add FK on dumpsters now that jobs exists
do $$ begin
  alter table dumpsters add constraint fk_dumpster_job
    foreign key (current_job_id) references jobs(id);
exception when duplicate_object then null;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- INVOICES
-- ═══════════════════════════════════════════════════════════════
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  job_id uuid not null references jobs(id),
  customer_id uuid not null references customers(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  status text default 'draft' check (status in (
    'draft', 'sent', 'partial', 'paid',
    'overdue_30', 'overdue_45', 'overdue_60', 'overdue_80',
    'collections', 'disputed', 'written_off'
  )),
  issued_date date not null default current_date,
  due_date date not null default (current_date + interval '30 days'),
  base_amount decimal not null,
  weight_amount decimal default 0,
  daily_overage_amount decimal default 0,
  discount_amount decimal default 0,
  late_fee_amount decimal default 0,
  total_amount decimal not null,
  amount_paid decimal default 0,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  pay_link text,
  reminder_log jsonb default '[]',
  paid_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_invoices_operator on invoices(operator_id);
create index if not exists idx_invoices_status on invoices(operator_id, status);
create index if not exists idx_invoices_customer on invoices(customer_id);
create index if not exists idx_invoices_job on invoices(job_id);

-- ═══════════════════════════════════════════════════════════════
-- ROUTES
-- ═══════════════════════════════════════════════════════════════
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  truck_id uuid not null references trucks(id),
  driver_id uuid references users(id),
  date date not null,
  jobs_sequence jsonb default '[]',
  status text default 'draft' check (status in ('draft', 'locked', 'in_progress', 'completed')),
  total_miles decimal,
  fuel_used_gallons decimal,
  start_time timestamptz,
  end_time timestamptz,
  revenue_generated decimal,
  miles_per_box decimal,
  created_at timestamptz default now()
);
create index if not exists idx_routes_operator on routes(operator_id);
create index if not exists idx_routes_date on routes(operator_id, date);

-- ═══════════════════════════════════════════════════════════════
-- TRUCK SERVICE LOG
-- ═══════════════════════════════════════════════════════════════
create table if not exists truck_service_log (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks(id),
  operator_id uuid not null references operators(id),
  service_type text not null check (service_type in (
    'oil', 'hydraulics', 'bearings', 'diesel', 'registration',
    'inspection', 'tires', 'brakes', 'other'
  )),
  date_performed date not null,
  mileage_at_service integer not null,
  next_due_miles integer,
  next_due_date date,
  cost decimal not null,
  vendor text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_service_log_truck on truck_service_log(truck_id);

-- ═══════════════════════════════════════════════════════════════
-- COMMUNICATIONS
-- ═══════════════════════════════════════════════════════════════
create table if not exists communications (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  customer_id uuid references customers(id),
  job_id uuid references jobs(id),
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text not null check (channel in ('sms', 'voicemail', 'email')),
  from_number text,
  to_number text,
  raw_content text not null,
  voicemail_url text,
  intent text check (intent in ('drop_request', 'pickup_request', 'reschedule', 'driver_note', 'complaint', 'other')),
  intent_confidence decimal,
  auto_responded boolean default false,
  response_content text,
  responded_at timestamptz,
  twilio_sid text,
  created_at timestamptz default now()
);
create index if not exists idx_comms_operator on communications(operator_id);
create index if not exists idx_comms_customer on communications(customer_id);

-- ═══════════════════════════════════════════════════════════════
-- EXPENSES
-- ═══════════════════════════════════════════════════════════════
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  date date not null,
  category text not null check (category in (
    'fuel', 'repair', 'wages', 'tolls', 'utilities', 'office',
    'insurance', 'registration', 'other'
  )),
  tax_bucket text not null check (tax_bucket in ('COGS', 'vehicle', 'payroll', 'SGA')),
  amount decimal not null,
  vendor text,
  truck_id uuid references trucks(id),
  job_id uuid references jobs(id),
  receipt_url text,
  ocr_raw jsonb,
  notes text,
  created_by uuid not null references users(id),
  created_at timestamptz default now()
);
create index if not exists idx_expenses_operator on expenses(operator_id);
create index if not exists idx_expenses_date on expenses(operator_id, date);

-- ═══════════════════════════════════════════════════════════════
-- DUMPSTER CONDITION LOG (immutable)
-- ═══════════════════════════════════════════════════════════════
create table if not exists dumpster_condition_log (
  id uuid primary key default gen_random_uuid(),
  dumpster_id uuid not null references dumpsters(id),
  job_id uuid references jobs(id),
  previous_grade text not null,
  new_grade text not null,
  changed_by uuid not null references users(id),
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_condition_log_dumpster on dumpster_condition_log(dumpster_id);

-- ═══════════════════════════════════════════════════════════════
-- AI INSIGHTS (Section 09)
-- ═══════════════════════════════════════════════════════════════
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  type text not null check (type in ('route', 'customer', 'asset', 'pricing', 'labor', 'payment', 'opportunity')),
  title text not null,
  body text not null,
  dollar_impact decimal,
  action_taken boolean default false,
  week_of date not null,
  created_at timestamptz default now()
);
create index if not exists idx_insights_operator on insights(operator_id);
create index if not exists idx_insights_week on insights(operator_id, week_of);

-- ═══════════════════════════════════════════════════════════════
-- DRIVER TIMECARDS (Section 09)
-- ═══════════════════════════════════════════════════════════════
create table if not exists driver_timecards (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references users(id),
  operator_id uuid not null references operators(id),
  route_id uuid references routes(id),
  clock_in timestamptz not null,
  clock_out timestamptz,
  regular_hours decimal default 0,
  overtime_hours decimal default 0,
  total_pay decimal,
  date date not null,
  created_at timestamptz default now()
);
create index if not exists idx_timecards_driver on driver_timecards(driver_id);
create index if not exists idx_timecards_operator on driver_timecards(operator_id, date);

-- ═══════════════════════════════════════════════════════════════
-- PRICING RECOMMENDATIONS (Section 10)
-- ═══════════════════════════════════════════════════════════════
create table if not exists pricing_recommendations (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  signal_type text not null check (signal_type in ('conversion_drop', 'fuel_increase', 'high_demand', 'low_demand')),
  title text not null,
  observation text not null,
  math text not null,
  proposed_action text not null,
  dollar_impact decimal not null,
  status text default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  approved_at timestamptz,
  outcome_revenue decimal,
  created_at timestamptz default now()
);
create index if not exists idx_pricing_recs_operator on pricing_recommendations(operator_id);

-- ═══════════════════════════════════════════════════════════════
-- FLEET RECOMMENDATIONS (Section 10)
-- ═══════════════════════════════════════════════════════════════
create table if not exists fleet_recommendations (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  type text not null check (type in ('add', 'sell')),
  units_count integer not null,
  target_unit_ids jsonb,
  utilization_trigger decimal not null,
  new_unit_cost decimal not null,
  used_unit_cost decimal not null,
  sale_price decimal,
  monthly_revenue_per_unit decimal not null,
  payback_months_new decimal,
  payback_months_used decimal,
  revenue_impact decimal not null,
  utilization_after decimal not null,
  status text default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz default now()
);
create index if not exists idx_fleet_recs_operator on fleet_recommendations(operator_id);

-- ═══════════════════════════════════════════════════════════════
-- FUEL PRICE LOG (Section 10)
-- ═══════════════════════════════════════════════════════════════
create table if not exists fuel_price_log (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  price_per_gallon decimal not null,
  region text not null default 'East Coast',
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- BOOKING FUNNEL EVENTS (Section 10)
-- ═══════════════════════════════════════════════════════════════
create table if not exists booking_funnel_events (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  session_id text not null,
  event text not null check (event in (
    'page_view', 'pricing_viewed', 'date_selected',
    'booking_started', 'booking_complete', 'abandoned'
  )),
  job_size text check (job_size in ('10yd', '20yd')),
  created_at timestamptz default now()
);
create index if not exists idx_funnel_operator on booking_funnel_events(operator_id);
create index if not exists idx_funnel_session on booking_funnel_events(session_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

alter table operators enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table dumpsters enable row level security;
alter table jobs enable row level security;
alter table trucks enable row level security;
alter table truck_service_log enable row level security;
alter table routes enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table communications enable row level security;
alter table expenses enable row level security;
alter table dumpster_condition_log enable row level security;
alter table dump_locations enable row level security;
alter table insights enable row level security;
alter table driver_timecards enable row level security;
alter table pricing_recommendations enable row level security;
alter table fleet_recommendations enable row level security;
alter table booking_funnel_events enable row level security;

-- Helper function: get current user's operator_id
create or replace function public.get_operator_id()
returns uuid
language sql
stable
security definer
as $$
  select operator_id from public.users where id = auth.uid()
$$;

-- ─── RLS Policies ───
drop policy if exists "Users see own operator" on operators;
create policy "Users see own operator" on operators for select using (id = public.get_operator_id());

drop policy if exists "Users see own operator users" on users;
create policy "Users see own operator users" on users for select using (operator_id = public.get_operator_id());

drop policy if exists "Users can update own profile" on users;
create policy "Users can update own profile" on users for update using (id = auth.uid());

drop policy if exists "Tenant isolation" on customers;
create policy "Tenant isolation" on customers for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on dumpsters;
create policy "Tenant isolation" on dumpsters for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on jobs;
create policy "Tenant isolation" on jobs for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on trucks;
create policy "Tenant isolation" on trucks for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on truck_service_log;
create policy "Tenant isolation" on truck_service_log for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on routes;
create policy "Tenant isolation" on routes for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on quotes;
create policy "Tenant isolation" on quotes for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on invoices;
create policy "Tenant isolation" on invoices for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on communications;
create policy "Tenant isolation" on communications for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on expenses;
create policy "Tenant isolation" on expenses for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on dump_locations;
create policy "Tenant isolation" on dump_locations for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on insights;
create policy "Tenant isolation" on insights for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on driver_timecards;
create policy "Tenant isolation" on driver_timecards for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on pricing_recommendations;
create policy "Tenant isolation" on pricing_recommendations for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on fleet_recommendations;
create policy "Tenant isolation" on fleet_recommendations for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on booking_funnel_events;
create policy "Tenant isolation" on booking_funnel_events for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on dumpster_condition_log;
create policy "Tenant isolation" on dumpster_condition_log for all using (
  dumpster_id in (select id from dumpsters where operator_id = public.get_operator_id())
);

-- ─── Public access policies for customer-facing pages ───
drop policy if exists "Public funnel insert" on booking_funnel_events;
create policy "Public funnel insert" on booking_funnel_events for insert with check (true);

-- ═══════════════════════════════════════════════════════════════
-- ROUTE SEGMENTS (driver app segment-based routing)
-- ═══════════════════════════════════════════════════════════════
create table if not exists route_segments (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id),
  operator_id uuid not null references operators(id),
  driver_id uuid references users(id),
  date date not null default current_date,
  sequence_number integer not null,
  type text not null check (type in (
    'yard_depart', 'drop', 'pickup', 'dump', 'yard_return', 'lunch', 'reposition'
  )),
  job_id uuid references jobs(id),
  dump_location_id uuid references dump_locations(id),
  from_address text,
  from_lat decimal,
  from_lng decimal,
  to_address text,
  to_lat decimal,
  to_lng decimal,
  customer_name text,
  box_id uuid references dumpsters(id),
  box_size text,
  box_condition text,
  box_reused boolean default false,
  box_action text,
  decision text,
  decision_reason text,
  label text not null,
  -- Planned timing
  planned_drive_minutes decimal default 0,
  planned_drive_miles decimal default 0,
  planned_stop_minutes decimal default 0,
  planned_total_minutes decimal default 0,
  depart_time_offset decimal default 0,
  arrive_time_offset decimal default 0,
  -- Actual timing (filled by driver)
  actual_drive_minutes decimal,
  actual_stop_minutes decimal,
  actual_total_minutes decimal,
  arrived_at timestamptz,
  completed_at timestamptz,
  -- Status
  status text default 'pending' check (status in ('pending', 'active', 'completed', 'skipped')),
  -- Driver input
  photos jsonb default '[]',
  weight_lbs integer,
  condition_grade text,
  notes text,
  -- Scores (from routing engine)
  scores jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_route_segments_driver_date on route_segments(driver_id, date);
create index if not exists idx_route_segments_route on route_segments(route_id);
create index if not exists idx_route_segments_job on route_segments(job_id);

-- ═══════════════════════════════════════════════════════════════
-- DRIVER STATE (real-time GPS + status tracking)
-- ═══════════════════════════════════════════════════════════════
create table if not exists driver_state (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references users(id) unique,
  operator_id uuid not null references operators(id),
  lat decimal,
  lng decimal,
  heading decimal,
  speed decimal,
  status text default 'offline' check (status in (
    'offline', 'on_route', 'at_stop', 'at_dump', 'on_break', 'returning'
  )),
  current_segment_id uuid references route_segments(id),
  current_route_id uuid references routes(id),
  updated_at timestamptz default now()
);
create index if not exists idx_driver_state_operator on driver_state(operator_id);

-- ═══════════════════════════════════════════════════════════════
-- ROUTE LEARNING (historical data for prediction)
-- ═══════════════════════════════════════════════════════════════
create table if not exists route_learning (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  segment_type text not null,
  entity_id uuid,
  box_size text,
  time_of_day text,
  day_of_week integer,
  planned_minutes decimal,
  actual_minutes decimal,
  planned_miles decimal,
  actual_miles decimal,
  created_at timestamptz default now()
);
create index if not exists idx_route_learning_operator on route_learning(operator_id);

-- RLS for new tables
alter table route_segments enable row level security;
alter table driver_state enable row level security;
alter table route_learning enable row level security;

drop policy if exists "Tenant isolation" on route_segments;
create policy "Tenant isolation" on route_segments for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on driver_state;
create policy "Tenant isolation" on driver_state for all using (operator_id = public.get_operator_id());

drop policy if exists "Tenant isolation" on route_learning;
create policy "Tenant isolation" on route_learning for all using (operator_id = public.get_operator_id());
