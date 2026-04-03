-- ============================================
-- CPI: Clinical Performance Index
-- Full Database Schema
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

create type cpi_category as enum (
  'flow',
  'clinical_judgment',
  'patient_impact',
  'vigilance',
  'ownership'
);

create type nomination_status as enum (
  'draft',
  'submitted',
  'in_review',
  'scored',
  'eligible',
  'recognized',
  'annual_finalist',
  'national_honoree'
);

create type user_role as enum (
  'staff',
  'reviewer',
  'site_admin',
  'national_board'
);

create type recognition_level as enum (
  'local',
  'national'
);

create type cycle_status as enum (
  'draft',
  'active',
  'closed',
  'finalized'
);

-- ============================================
-- TABLES
-- ============================================

-- Hospitals / Sites
create table hospitals (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text,
  state text,
  created_at timestamptz not null default now()
);

-- Departments within hospitals
create table departments (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_departments_hospital on departments(hospital_id);

-- Users (linked to Supabase Auth)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'staff',
  title text, -- e.g. "RN", "MD", "Tech"
  hospital_id uuid references hospitals(id),
  department_id uuid references departments(id),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_hospital on users(hospital_id);
create index idx_users_role on users(role);

-- Recognition Cycles (quarterly, annual, etc.)
create table recognition_cycles (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  name text not null, -- e.g. "Q1 2026"
  status cycle_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_cycles_hospital on recognition_cycles(hospital_id);
create index idx_cycles_status on recognition_cycles(status);

-- Nominations
create table nominations (
  id uuid primary key default uuid_generate_v4(),
  cycle_id uuid references recognition_cycles(id),
  nominee_id uuid not null references users(id),
  nominator_id uuid references users(id), -- null = anonymous
  is_anonymous boolean not null default false,
  category cpi_category not null,
  raw_text text not null,
  ai_text text, -- AI-cleaned version
  ai_category cpi_category, -- AI-suggested category
  ai_confidence numeric(4,3), -- 0.000 - 1.000
  ai_reasoning text,
  tags text[] default '{}',
  status nomination_status not null default 'submitted',
  hospital_id uuid not null references hospitals(id),
  department_id uuid references departments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_nominations_nominee on nominations(nominee_id);
create index idx_nominations_cycle on nominations(cycle_id);
create index idx_nominations_status on nominations(status);
create index idx_nominations_category on nominations(category);
create index idx_nominations_hospital on nominations(hospital_id);

-- Reviews (one per reviewer per nomination)
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  nomination_id uuid not null references nominations(id) on delete cascade,
  reviewer_id uuid not null references users(id),
  is_valid boolean, -- validation gate: above baseline?
  strength_score integer check (strength_score >= 0 and strength_score <= 100),
  impact_score integer check (impact_score >= 0 and impact_score <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(nomination_id, reviewer_id)
);

create index idx_reviews_nomination on reviews(nomination_id);
create index idx_reviews_reviewer on reviews(reviewer_id);

-- Committee Members
create table committee_members (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member', -- 'chair', 'member'
  is_national_board boolean not null default false,
  created_at timestamptz not null default now(),
  unique(hospital_id, user_id)
);

create index idx_committee_hospital on committee_members(hospital_id);

-- Recognition Outcomes (winners)
create table recognition_outcomes (
  id uuid primary key default uuid_generate_v4(),
  nomination_id uuid not null references nominations(id),
  cycle_id uuid not null references recognition_cycles(id),
  category cpi_category not null,
  level recognition_level not null default 'local',
  final_score numeric(5,2),
  selected_at timestamptz not null default now()
);

create index idx_outcomes_cycle on recognition_outcomes(cycle_id);
create index idx_outcomes_category on recognition_outcomes(category);

-- Credentials (badges)
create table credentials (
  id uuid primary key default uuid_generate_v4(),
  unique_code text not null unique, -- short human-friendly code
  outcome_id uuid not null references recognition_outcomes(id) on delete cascade,
  user_id uuid not null references users(id),
  category cpi_category not null,
  level recognition_level not null default 'local',
  citation text, -- short description shown on badge
  verification_url text, -- auto-generated
  issued_at timestamptz not null default now(),
  revoked_at timestamptz -- null = active
);

create index idx_credentials_user on credentials(user_id);
create index idx_credentials_code on credentials(unique_code);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table hospitals enable row level security;
alter table departments enable row level security;
alter table users enable row level security;
alter table recognition_cycles enable row level security;
alter table nominations enable row level security;
alter table reviews enable row level security;
alter table committee_members enable row level security;
alter table recognition_outcomes enable row level security;
alter table credentials enable row level security;

-- Users can read their own hospital's data
create policy "Users can view own hospital"
  on hospitals for select
  using (
    id in (select hospital_id from users where id = auth.uid())
  );

-- Users can view other users in their hospital
create policy "Users can view hospital members"
  on users for select
  using (
    hospital_id in (select hospital_id from users where id = auth.uid())
    or id = auth.uid()
  );

-- Users can update their own profile
create policy "Users can update own profile"
  on users for update
  using (id = auth.uid());

-- Anyone can submit nominations
create policy "Authenticated users can create nominations"
  on nominations for insert
  with check (auth.uid() is not null);

-- Users can view nominations in their hospital
create policy "Users can view own hospital nominations"
  on nominations for select
  using (
    hospital_id in (select hospital_id from users where id = auth.uid())
  );

-- Reviewers can create reviews
create policy "Reviewers can create reviews"
  on reviews for insert
  with check (
    reviewer_id = auth.uid()
  );

-- Reviewers can view and update their reviews
create policy "Reviewers can view own reviews"
  on reviews for select
  using (reviewer_id = auth.uid());

create policy "Reviewers can update own reviews"
  on reviews for update
  using (reviewer_id = auth.uid());

-- Credentials are publicly viewable (for verification)
create policy "Credentials are publicly viewable"
  on credentials for select
  using (true);

-- Recognition cycles viewable by hospital members
create policy "Cycles viewable by hospital"
  on recognition_cycles for select
  using (
    hospital_id in (select hospital_id from users where id = auth.uid())
  );

-- Departments viewable by hospital members
create policy "Departments viewable by hospital"
  on departments for select
  using (
    hospital_id in (select hospital_id from users where id = auth.uid())
  );

-- Committee members viewable by hospital
create policy "Committee viewable by hospital"
  on committee_members for select
  using (
    hospital_id in (select hospital_id from users where id = auth.uid())
  );

-- Outcomes viewable by hospital
create policy "Outcomes viewable by hospital"
  on recognition_outcomes for select
  using (
    cycle_id in (
      select id from recognition_cycles
      where hospital_id in (select hospital_id from users where id = auth.uid())
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate average score for a nomination
create or replace function get_nomination_score(nom_id uuid)
returns numeric as $$
  select coalesce(
    avg((r.strength_score + r.impact_score) / 2.0),
    0
  )
  from reviews r
  where r.nomination_id = nom_id
    and r.is_valid = true
    and r.strength_score is not null
    and r.impact_score is not null;
$$ language sql stable;

-- Get unique nominator count for a user in a cycle
create or replace function get_unique_nominators(user_id_param uuid, cycle_id_param uuid)
returns bigint as $$
  select count(distinct nominator_id)
  from nominations
  where nominee_id = user_id_param
    and cycle_id = cycle_id_param
    and nominator_id is not null;
$$ language sql stable;

-- Get average impact score (for tie-breaking)
create or replace function get_impact_score(nom_id uuid)
returns numeric as $$
  select coalesce(avg(r.impact_score), 0)
  from reviews r
  where r.nomination_id = nom_id
    and r.is_valid = true
    and r.impact_score is not null;
$$ language sql stable;
