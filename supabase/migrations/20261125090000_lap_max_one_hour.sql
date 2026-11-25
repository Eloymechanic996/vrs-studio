-- Una vuelta no puede durar más de 1 hora: el mismo límite que la app (MAX_LAP_MS
-- en src/lib/utils.ts). Antes la base de datos aceptaba hasta 24 h, así que una
-- vuelta enviada sin pasar por la pantalla podía estropear medias y gráficas.
alter table public.laps
  drop constraint if exists laps_lap_time_max,
  add constraint laps_lap_time_max check (lap_time_ms <= 3600000);
