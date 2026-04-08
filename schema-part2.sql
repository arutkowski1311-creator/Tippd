
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
