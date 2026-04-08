-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Blueprint v7 — Exceptions, Inspections, Dispatch Config
-- Run AFTER supabase-schema.sql and all prior migrations
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Expand dumpster status enum ───
-- Add 4 new operational statuses for real-time tracking
alter table dumpsters drop constraint if exists dumpsters_status_check;
alter table dumpsters add constraint dumpsters_status_check
  check (status in (
    'available', 'assigned', 'deployed', 'returning', 'in_yard',
    'needs_cleaning', 'needs_repair', 'picked_up_full', 'at_transfer',
    'repair', 'retired'
  ));

-- ─── 2. New operator columns for dispatch & exception config ───
alter table operators
  add column if not exists workday_cap_hours integer default 10,
  add column if not exists service_time_drop_minutes integer default 20,
  add column if not exists service_time_pickup_minutes integer default 20,
  add column if not exists service_time_dump_minutes integer default 25,
  add column if not exists exception_auto_notify_customer boolean default true,
  add column if not exists breakdown_redistribution_auto_propose boolean default true,
  add column if not exists dump_alternate_radius_miles integer default 15,
  add column if not exists prohibited_materials_list jsonb default '["concrete", "tires", "hazmat", "electronics", "batteries", "appliances", "paint", "chemicals"]';

-- ─── 3. Dead mile tracking on routes ───
alter table routes
  add column if not exists dead_mile_breakdown jsonb default '{}',
  add column if not exists dead_mile_pct decimal;

-- ─── 4. Exceptions table ───
-- Operational events that disrupt the day. Each has severity,
-- resolution owner, time sensitivity, and cascade scope.
create table if not exists exceptions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  job_id uuid references jobs(id),
  stop_id uuid references route_segments(id),
  driver_id uuid references users(id),
  truck_id uuid references trucks(id),
  type text not null check (type in (
    'box_inaccessible', 'overloaded_container', 'prohibited_material',
    'customer_change_request', 'truck_breakdown', 'transfer_station_issue',
    'customer_not_present', 'access_restriction'
  )),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  resolution_owner text not null check (resolution_owner in ('driver', 'customer', 'owner', 'system')),
  time_sensitivity text not null check (time_sensitivity in ('can_wait', 'resolve_within_30min', 'resolve_now', 'tomorrow_ok')),
  cascade_scope text not null check (cascade_scope in ('stop_only', 'this_route', 'all_routes')),
  status text default 'open' check (status in ('open', 'in_resolution', 'resolved', 'escalated')),
  driver_notes text,
  photo_urls jsonb default '[]',
  material_type text,
  resolution_notes text,
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  customer_notified boolean default false,
  owner_notified boolean default false,
  created_at timestamptz default now()
);
create index idx_exceptions_operator on exceptions(operator_id);
create index idx_exceptions_status on exceptions(operator_id, status);
create index idx_exceptions_job on exceptions(job_id);

-- ─── 5. Dumpster inspections table ───
-- Sub-scores from formal inspections by owner/manager (not drivers).
create table if not exists dumpster_inspections (
  id uuid primary key default gen_random_uuid(),
  dumpster_id uuid not null references dumpsters(id),
  operator_id uuid not null references operators(id),
  inspected_by uuid not null references users(id),
  inspection_date date not null default current_date,
  appearance_score integer not null check (appearance_score between 1 and 10),
  structural_score integer not null check (structural_score between 1 and 10),
  cleanliness_score integer not null check (cleanliness_score between 1 and 10),
  overall_grade text not null check (overall_grade in ('A', 'B', 'C', 'D', 'F')),
  notes text,
  photos jsonb default '[]',
  repair_items jsonb default '[]',
  created_at timestamptz default now()
);
create index idx_inspections_dumpster on dumpster_inspections(dumpster_id);
create index idx_inspections_operator on dumpster_inspections(operator_id);

-- ─── 6. RLS for new tables ───
alter table exceptions enable row level security;
alter table dumpster_inspections enable row level security;

create policy "Tenant isolation" on exceptions
  for all using (operator_id = public.get_operator_id());

create policy "Tenant isolation" on dumpster_inspections
  for all using (operator_id = public.get_operator_id());
