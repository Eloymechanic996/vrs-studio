-- Seis estilos de color nuevos: retro, papaya, british, rally, neon y carbon.
-- La lista tiene que coincidir con APPEARANCES en src/lib/settings.ts.

-- Quita la regla antigua, sea cual sea su nombre (se creó dentro de CREATE TABLE).
do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.user_settings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%appearance%'
  loop
    execute format('alter table public.user_settings drop constraint %I', c);
  end loop;
end $$;

alter table public.user_settings
  add constraint user_settings_appearance_check check (
    appearance in (
      'racing', 'lofi', 'aviation', 'military', 'mechanic',
      'retro', 'papaya', 'british', 'rally', 'neon', 'carbon'
    )
  );
