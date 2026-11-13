-- VRS Studio: privacidad de enlaces públicos, guardado atómico de vueltas,
-- ajustes de usuario y borrado de cuenta.

-- ============================================================================
-- 1. Funciones existentes: search_path fijo
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create or replace function public.generate_session_slug()
returns text
language plpgsql
set search_path = ''
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := substr(
      replace(replace(replace(encode(extensions.gen_random_bytes(12), 'base64'),
        '/', ''), '+', ''), '=', ''),
      1, 12);
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

revoke all on function public.generate_session_slug() from public, anon;
grant execute on function public.generate_session_slug() to authenticated;

-- ============================================================================
-- 2. Sesiones públicas: ya no se leen tablas directamente
-- ============================================================================
drop policy if exists "sessions_public_select" on public.sessions;
drop policy if exists "laps_public_select" on public.laps;
drop policy if exists "events_public_select" on public.events;
drop policy if exists "setups_public_select" on public.setups;
drop policy if exists "lap_sectors_public_select" on public.lap_sectors;

revoke all on public.sessions, public.laps, public.events, public.setups, public.lap_sectors from anon;
revoke truncate, references, trigger on public.sessions, public.laps, public.events, public.setups, public.lap_sectors from authenticated;

-- Devuelve una única sesión pública a partir de su enlace, sin datos internos
-- (ni user_id, ni notas de la sesión, ni setup).
create or replace function public.get_public_session(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'session', jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'modality', s.modality,
      'session_type', s.session_type,
      'circuit', s.circuit,
      'driver', s.driver,
      'date', s.date,
      'sectors_count', s.sectors_count
    ),
    'laps', coalesce((
      select jsonb_agg(to_jsonb(l) - 'created_at' order by l.lap_number)
      from public.laps l where l.session_id = s.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'session_id', e.session_id, 'event_type', e.event_type,
        'lap_number', e.lap_number, 'elapsed_ms', e.elapsed_ms,
        'notes', null, 'created_at', e.created_at
      ) order by e.elapsed_ms)
      from public.events e where e.session_id = s.id
    ), '[]'::jsonb),
    'sectors', coalesce((
      select jsonb_agg(to_jsonb(ls))
      from public.lap_sectors ls
      join public.laps l on l.id = ls.lap_id
      where l.session_id = s.id
    ), '[]'::jsonb)
  )
  from public.sessions s
  where s.public_slug = p_slug and s.is_public = true;
$$;

revoke all on function public.get_public_session(text) from public;
grant execute on function public.get_public_session(text) to anon, authenticated;

-- ============================================================================
-- 3. Políticas del propietario, solo para usuarios autenticados
-- ============================================================================
drop policy if exists "sessions_owner_select" on public.sessions;
create policy "sessions_owner_select" on public.sessions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "sessions_owner_insert" on public.sessions;
create policy "sessions_owner_insert" on public.sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "sessions_owner_update" on public.sessions;
create policy "sessions_owner_update" on public.sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "sessions_owner_delete" on public.sessions;
create policy "sessions_owner_delete" on public.sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "laps_owner_all" on public.laps;
create policy "laps_owner_all" on public.laps for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = laps.session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.sessions s where s.id = laps.session_id and s.user_id = (select auth.uid())));

drop policy if exists "events_owner_all" on public.events;
create policy "events_owner_all" on public.events for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = events.session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.sessions s where s.id = events.session_id and s.user_id = (select auth.uid())));

drop policy if exists "setups_owner_all" on public.setups;
create policy "setups_owner_all" on public.setups for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = setups.session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.sessions s where s.id = setups.session_id and s.user_id = (select auth.uid())));

drop policy if exists "lap_sectors_owner_all" on public.lap_sectors;
create policy "lap_sectors_owner_all" on public.lap_sectors for all to authenticated
  using (exists (select 1 from public.laps l join public.sessions s on s.id = l.session_id where l.id = lap_sectors.lap_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.laps l join public.sessions s on s.id = l.session_id where l.id = lap_sectors.lap_id and s.user_id = (select auth.uid())));

-- ============================================================================
-- 4. Guardar una vuelta: número asignado en servidor, idempotente y atómico
-- ============================================================================
create or replace function public.record_lap(
  p_id uuid,
  p_session_id uuid,
  p_lap_time_ms integer,
  p_total_time_ms integer,
  p_track_state public.track_state default 'Green Flag'::public.track_state,
  p_notes text default null,
  p_sectors integer[] default null
)
returns public.laps
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lap public.laps;
  v_number integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_session_id::text, 0));

  select * into v_lap from public.laps where id = p_id;
  if found then
    return v_lap;
  end if;

  select coalesce(max(lap_number), 0) + 1 into v_number
  from public.laps where session_id = p_session_id;

  insert into public.laps (id, session_id, lap_number, lap_time_ms, total_time_ms, track_state, notes)
  values (p_id, p_session_id, v_number, p_lap_time_ms, p_total_time_ms, p_track_state, p_notes)
  returning * into v_lap;

  if p_sectors is not null and cardinality(p_sectors) > 0 then
    insert into public.lap_sectors (lap_id, sector_number, time_ms)
    select v_lap.id, u.ord::integer, u.t
    from unnest(p_sectors) with ordinality as u(t, ord);
  end if;

  return v_lap;
end;
$$;

revoke all on function public.record_lap(uuid, uuid, integer, integer, public.track_state, text, integer[]) from public, anon;
grant execute on function public.record_lap(uuid, uuid, integer, integer, public.track_state, text, integer[]) to authenticated;

-- ============================================================================
-- 5. Corregir una vuelta: ajusta sectores, acumulados y eventos posteriores
-- ============================================================================
create or replace function public.update_lap(
  p_lap_id uuid,
  p_lap_time_ms integer,
  p_track_state public.track_state,
  p_notes text default null,
  p_sectors integer[] default null
)
returns public.laps
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old public.laps;
  v_new public.laps;
  v_delta integer;
begin
  select * into v_old from public.laps where id = p_lap_id for update;
  if not found then
    raise exception 'Vuelta no encontrada' using errcode = 'P0002';
  end if;

  v_delta := p_lap_time_ms - v_old.lap_time_ms;

  update public.laps
  set lap_time_ms = p_lap_time_ms, track_state = p_track_state, notes = p_notes
  where id = p_lap_id
  returning * into v_new;

  if v_delta <> 0 then
    update public.laps
    set total_time_ms = total_time_ms + v_delta
    where session_id = v_old.session_id and lap_number >= v_old.lap_number;

    update public.events
    set elapsed_ms = elapsed_ms + v_delta
    where session_id = v_old.session_id and elapsed_ms > v_old.total_time_ms;
  end if;

  if p_sectors is not null then
    delete from public.lap_sectors where lap_id = p_lap_id;
    if cardinality(p_sectors) > 0 then
      insert into public.lap_sectors (lap_id, sector_number, time_ms)
      select p_lap_id, u.ord::integer, u.t
      from unnest(p_sectors) with ordinality as u(t, ord);
    end if;
  end if;

  select * into v_new from public.laps where id = p_lap_id;
  return v_new;
end;
$$;

revoke all on function public.update_lap(uuid, integer, public.track_state, text, integer[]) from public, anon;
grant execute on function public.update_lap(uuid, integer, public.track_state, text, integer[]) to authenticated;

-- ============================================================================
-- 6. Ajustes de usuario
-- ============================================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  appearance text not null default 'racing'
    check (appearance in ('racing', 'lofi', 'aviation', 'military', 'mechanic')),
  theme text not null default 'dark'
    check (theme in ('dark', 'light', 'auto', 'sun')),
  min_lap_seconds numeric not null default 5
    check (min_lap_seconds >= 0 and min_lap_seconds <= 600),
  vibrate boolean not null default true,
  keep_awake boolean not null default true,
  default_modality public.modality not null default 'Karting',
  default_session_type public.session_type not null default 'Test',
  default_sectors integer not null default 0
    check (default_sectors >= 0 and default_sectors <= 10),
  default_team text,
  default_driver text,
  default_chassis text,
  default_engine text,
  default_circuit text,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

revoke all on public.user_settings from anon;
grant select, insert, update, delete on public.user_settings to authenticated;

drop policy if exists "user_settings_owner_all" on public.user_settings;
create policy "user_settings_owner_all" on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists user_settings_touch_updated_at on public.user_settings;
create trigger user_settings_touch_updated_at
  before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 7. Borrar la propia cuenta (cascada a sesiones, vueltas, setup y ajustes)
-- ============================================================================
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ============================================================================
-- 8. Ping diario para que el proyecto gratuito no se pause por inactividad
-- ============================================================================
create or replace function public.ping()
returns boolean
language sql
stable
set search_path = ''
as $$ select true $$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
