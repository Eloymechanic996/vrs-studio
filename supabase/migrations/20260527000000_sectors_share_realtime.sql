-- VRS Studio - Migration 0002
-- Sectors per lap, public share links, realtime publication.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. Sessions: sector count + public share
-- ============================================================================
alter table public.sessions
  add column if not exists sectors_count integer not null default 0
    check (sectors_count >= 0 and sectors_count <= 10);

alter table public.sessions
  add column if not exists is_public boolean not null default false;

alter table public.sessions
  add column if not exists public_slug text;

-- Unique only when non-null
create unique index if not exists sessions_public_slug_uidx
  on public.sessions (public_slug) where public_slug is not null;

-- ============================================================================
-- 2. Lap sectors table
-- ============================================================================
create table if not exists public.lap_sectors (
  id uuid primary key default gen_random_uuid(),
  lap_id uuid not null references public.laps(id) on delete cascade,
  sector_number integer not null check (sector_number >= 1 and sector_number <= 10),
  time_ms integer not null check (time_ms >= 0),
  created_at timestamptz not null default now(),
  unique (lap_id, sector_number)
);

create index if not exists lap_sectors_lap_id_idx on public.lap_sectors(lap_id);

alter table public.lap_sectors enable row level security;

drop policy if exists "lap_sectors_owner_all" on public.lap_sectors;
create policy "lap_sectors_owner_all"
  on public.lap_sectors for all
  using (
    exists (
      select 1 from public.laps l
      join public.sessions s on s.id = l.session_id
      where l.id = lap_sectors.lap_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.laps l
      join public.sessions s on s.id = l.session_id
      where l.id = lap_sectors.lap_id and s.user_id = auth.uid()
    )
  );

-- Public read for lap_sectors when the parent session is public.
drop policy if exists "lap_sectors_public_select" on public.lap_sectors;
create policy "lap_sectors_public_select"
  on public.lap_sectors for select
  using (
    exists (
      select 1 from public.laps l
      join public.sessions s on s.id = l.session_id
      where l.id = lap_sectors.lap_id and s.is_public = true
    )
  );

-- ============================================================================
-- 3. Public read policies for shared sessions
-- ============================================================================
drop policy if exists "sessions_public_select" on public.sessions;
create policy "sessions_public_select"
  on public.sessions for select
  using (is_public = true);

drop policy if exists "laps_public_select" on public.laps;
create policy "laps_public_select"
  on public.laps for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = laps.session_id and s.is_public = true
    )
  );

drop policy if exists "events_public_select" on public.events;
create policy "events_public_select"
  on public.events for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = events.session_id and s.is_public = true
    )
  );

drop policy if exists "setups_public_select" on public.setups;
create policy "setups_public_select"
  on public.setups for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = setups.session_id and s.is_public = true
    )
  );

-- ============================================================================
-- 4. Realtime publication
-- Adds tables to supabase_realtime publication if not already present.
-- ============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.sessions;
  exception when duplicate_object then null;
    when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.laps;
  exception when duplicate_object then null;
    when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
    when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.lap_sectors;
  exception when duplicate_object then null;
    when others then null;
  end;
end $$;

-- ============================================================================
-- 5. Slug generator helper (random 10-char URL-safe)
-- Used from the application; defined here as a convenience.
-- ============================================================================
create or replace function public.generate_session_slug()
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := substr(
      replace(replace(replace(encode(gen_random_bytes(8), 'base64'),
        '/', ''), '+', ''), '=', ''),
      1, 10);
    perform 1 from public.sessions where public_slug = candidate;
    exit when not found;
    attempts := attempts + 1;
    if attempts > 5 then
      raise exception 'Could not generate unique slug';
    end if;
  end loop;
  return candidate;
end;
$$;
