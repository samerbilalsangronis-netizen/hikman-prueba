-- Esquema para el dashboard USD Macro.
-- Copia y pega este archivo completo en Supabase > SQL Editor > New query > Run.

create table if not exists indicator_overrides (
  indicator_id text not null,
  date date not null,
  value double precision not null,
  updated_at timestamptz not null default now(),
  primary key (indicator_id, date)
);

create table if not exists score_overrides (
  id text primary key,
  valoracion smallint not null,
  updated_at timestamptz not null default now()
);

alter table indicator_overrides enable row level security;
alter table score_overrides enable row level security;

-- Nota de seguridad: estas políticas permiten leer y escribir a cualquiera que
-- tenga la URL y la clave "anon" del proyecto (que va embebida en el sitio
-- público). Está bien para un dashboard personal de uso propio. Si más adelante
-- quieres que solo tú puedas editar, la forma simple es activar Supabase Auth
-- y cambiar "using (true)" por "using (auth.uid() is not null)" en las
-- políticas de escritura.
create policy "public read/write indicator_overrides"
  on indicator_overrides for all
  using (true)
  with check (true);

create policy "public read/write score_overrides"
  on score_overrides for all
  using (true)
  with check (true);
