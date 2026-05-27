-- VRS Studio - Initial schema
-- Run this in your Supabase project SQL editor (Database -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

-- =============================================================================
-- Enums
-- =============================================================================

do $$ begin
  create type modality as enum (
    'Karting', 'Monoplazas', 'Rally', 'Turismos', 'Endurance', 'Off-Road'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_type as enum (
    'Race', 'Test', 'Free Practice', 'Qualifying'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type weather as enum (
    'Dry', 'Cloudy', 'Light Rain', 'Rain', 'Heavy Rain', 'Windy', 'Cold', 'Hot'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type track_state as enum (
    'Green Flag', 'Yellow Flag', 'Red Flag',
    'Safety Car', 'Virtual Safety Car', 'Pit Lane'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum (
    'Incidencia', 'Pit In', 'Pit Out',
    'Safety Car Sale', 'Safety Car Entra', 'Bandera', 'Cambio de clima'
  );
exception when duplicate_object then null; end $$;

-- =============================================================================
-- Tables
-- =============================================================================

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  modality modality not null default 'Karting',
  session_type session_type not null default 'Test',
  category text,
  championship text,
  team text,
  event text,
  circuit text,
  driver text,
  chassis text,
  engine text,
  weather weather,
  air_temp numeric,
  track_temp numeric,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_date_idx on public.sessions(date desc);

create table if not exists public.laps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  lap_number integer not null,
  lap_time_ms integer not null check (lap_time_ms >= 0),
  total_time_ms integer not null check (total_time_ms >= 0),
  track_state track_state not null default 'Green Flag',
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, lap_number)
);

create index if not exists laps_session_id_idx on public.laps(session_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  event_type event_type not null,
  lap_number integer,
  elapsed_ms integer not null check (elapsed_ms >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists events_session_id_idx on public.events(session_id);

create table if not exists public.setups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  steering jsonb not null default '{}'::jsonb,
  rear_axle jsonb not null default '{}'::jsonb,
  engine jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- updated_at triggers
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_touch_updated_at on public.sessions;
create trigger sessions_touch_updated_at
  before update on public.sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists setups_touch_updated_at on public.setups;
create trigger setups_touch_updated_at
  before update on public.setups
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.sessions enable row level security;
alter table public.laps enable row level security;
alter table public.events enable row level security;
alter table public.setups enable row level security;

-- sessions: owner-only
drop policy if exists "sessions_owner_select" on public.sessions;
create policy "sessions_owner_select"
  on public.sessions for select
  using (auth.uid() = user_id);

drop policy if exists "sessions_owner_insert" on public.sessions;
create policy "sessions_owner_insert"
  on public.sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "sessions_owner_update" on public.sessions;
create policy "sessions_owner_update"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sessions_owner_delete" on public.sessions;
create policy "sessions_owner_delete"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- laps / events / setups: derived ownership through session
drop policy if exists "laps_owner_all" on public.laps;
create policy "laps_owner_all"
  on public.laps for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = laps.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = laps.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "events_owner_all" on public.events;
create policy "events_owner_all"
  on public.events for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = events.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = events.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "setups_owner_all" on public.setups;
create policy "setups_owner_all"
  on public.setups for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = setups.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = setups.session_id and s.user_id = auth.uid()
    )
  );
