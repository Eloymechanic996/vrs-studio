-- ============================================================================
-- Sesión 2 (24/11/2026): privacidad del enlace público y límites en la base
-- de datos. Los límites de la app (zod) solo protegen los formularios; con la
-- clave pública cualquiera puede llamar a la API directamente, así que aquí se
-- repiten para que nadie pueda llenar la base de datos ni meter datos absurdos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. El enlace público ya no expone las notas de cada vuelta
-- ----------------------------------------------------------------------------
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
      select jsonb_agg(to_jsonb(l) - 'created_at' - 'notes' order by l.lap_number)
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

-- ----------------------------------------------------------------------------
-- 2. Tamaños máximos (los mismos que usa la app)
-- ----------------------------------------------------------------------------
alter table public.sessions
  add constraint sessions_name_len check (char_length(name) between 1 and 120),
  add constraint sessions_category_len check (char_length(category) <= 300),
  add constraint sessions_championship_len check (char_length(championship) <= 300),
  add constraint sessions_team_len check (char_length(team) <= 300),
  add constraint sessions_event_len check (char_length(event) <= 300),
  add constraint sessions_circuit_len check (char_length(circuit) <= 300),
  add constraint sessions_driver_len check (char_length(driver) <= 300),
  add constraint sessions_chassis_len check (char_length(chassis) <= 300),
  add constraint sessions_engine_len check (char_length(engine) <= 300),
  add constraint sessions_notes_len check (char_length(notes) <= 4000),
  add constraint sessions_date_range check (date between '1900-01-01' and '2100-12-31'),
  add constraint sessions_temps_range check (
    (air_temp is null or air_temp between -60 and 80) and
    (track_temp is null or track_temp between -60 and 100)
  ),
  add constraint sessions_slug_format check (public_slug ~ '^[A-Za-z0-9]{6,16}$');

alter table public.laps
  add constraint laps_notes_len check (char_length(notes) <= 500),
  add constraint laps_lap_time_max check (lap_time_ms <= 86400000);

alter table public.events
  add constraint events_notes_len check (char_length(notes) <= 500);

alter table public.setups
  add constraint setups_size check (
    coalesce(pg_column_size(steering), 0) +
    coalesce(pg_column_size(rear_axle), 0) +
    coalesce(pg_column_size(engine), 0) < 65536
  );

alter table public.user_settings
  add constraint user_settings_defaults_len check (
    coalesce(char_length(default_team), 0) <= 120 and
    coalesce(char_length(default_driver), 0) <= 120 and
    coalesce(char_length(default_chassis), 0) <= 120 and
    coalesce(char_length(default_engine), 0) <= 120 and
    coalesce(char_length(default_circuit), 0) <= 120
  );

-- ----------------------------------------------------------------------------
-- 3. El enlace público siempre lo genera el servidor
--    Nadie puede elegir uno a medida (p. ej. /s/avisoprofesor) llamando a la API.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_generated_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.public_slug is not null
     and (tg_op = 'INSERT' or new.public_slug is distinct from old.public_slug) then
    new.public_slug := public.generate_session_slug();
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_generated_slug on public.sessions;
create trigger sessions_generated_slug
  before insert or update of public_slug on public.sessions
  for each row execute function public.enforce_generated_slug();

-- ----------------------------------------------------------------------------
-- 4. Cantidades máximas, para que nadie llene los 500 MB del plan gratuito
-- ----------------------------------------------------------------------------
create or replace function public.enforce_row_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n int;
begin
  if tg_table_name = 'sessions' then
    select count(*) into n from public.sessions where user_id = new.user_id;
    if n >= 1000 then
      raise exception 'Has llegado al máximo de 1000 sesiones.' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'laps' then
    select count(*) into n from public.laps where session_id = new.session_id;
    if n >= 5000 then
      raise exception 'Esta sesión ya tiene el máximo de 5000 vueltas.' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'events' then
    select count(*) into n from public.events where session_id = new.session_id;
    if n >= 5000 then
      raise exception 'Esta sesión ya tiene el máximo de 5000 eventos.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_row_limit on public.sessions;
create trigger sessions_row_limit before insert on public.sessions
  for each row execute function public.enforce_row_limits();

drop trigger if exists laps_row_limit on public.laps;
create trigger laps_row_limit before insert on public.laps
  for each row execute function public.enforce_row_limits();

drop trigger if exists events_row_limit on public.events;
create trigger events_row_limit before insert on public.events
  for each row execute function public.enforce_row_limits();

revoke all on function public.enforce_generated_slug() from public, anon, authenticated;
revoke all on function public.enforce_row_limits() from public, anon, authenticated;
