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

-- Previsión (consenso de mercado) por indicador. No viene de FRED (FRED solo
-- publica datos ya salidos, no expectativas) — se carga a mano, igual para
-- los indicadores que sincronizan solos que para los manuales.
create table if not exists indicator_forecasts (
  indicator_id text primary key,
  forecast double precision not null,
  updated_at timestamptz not null default now()
);

-- FOMC Watch: probabilidad (0-100) que el mercado asigna a cada resultado de
-- la próxima reunión de la Fed. Es 100% manual — no hay API gratuita de
-- futuros de Fed Funds — normalmente se consulta en CME FedWatch
-- (cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html) y se carga acá.
create table if not exists fomc_watch (
  meeting_date date primary key,
  prob_cut smallint not null default 0,
  prob_hold smallint not null default 0,
  prob_hike smallint not null default 0,
  note text,
  updated_at timestamptz not null default now()
);

-- Banqueros centrales: comunicado actual y anterior (fecha + hawkish/dovish/
-- neutral + resumen + fuente), para poder ver si cambió la postura de un
-- comunicado al siguiente. Al cargar uno nuevo, el "actual" pasa a
-- "anterior" — un registro por banquero, no guarda historial más atrás. Las
-- fotos y el listado de banqueros (nombre, cargo, si vota) viven en el
-- código (src/data/centralBankers.ts), no en esta tabla.
create table if not exists banker_statements (
  banker_id text primary key,
  current_statement_date date,
  current_stance text check (current_stance in ('hawkish', 'dovish', 'neutral')),
  current_summary text,
  current_source_url text,
  previous_statement_date date,
  previous_stance text check (previous_stance in ('hawkish', 'dovish', 'neutral')),
  previous_summary text,
  previous_source_url text,
  updated_at timestamptz not null default now()
);

alter table indicator_overrides enable row level security;
alter table score_overrides enable row level security;
alter table indicator_forecasts enable row level security;
alter table fomc_watch enable row level security;
alter table banker_statements enable row level security;

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

create policy "public read/write indicator_forecasts"
  on indicator_forecasts for all
  using (true)
  with check (true);

create policy "public read/write fomc_watch"
  on fomc_watch for all
  using (true)
  with check (true);

create policy "public read/write banker_statements"
  on banker_statements for all
  using (true)
  with check (true);
