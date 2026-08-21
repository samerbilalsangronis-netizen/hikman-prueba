-- Esquema para el dashboard USD Macro.
-- Copia y pega este archivo completo en Supabase > SQL Editor > New query > Run.

create table if not exists indicator_overrides (
  indicator_id text not null,
  date date not null,
  value double precision not null,
  -- Etapa de esta lectura puntual cuando la fuente publica el mismo dato en
  -- dos vueltas (ej. PMI Flash/Final, PIB preliminar/revisado). NULL cuando
  -- no aplica o no se especificó. Se guarda por punto (no por indicador)
  -- porque el mismo id alterna preliminar/final mes a mes según el más
  -- reciente cargado — ver IndicatorMeta.releaseStage en src/types.ts.
  stage text check (stage in ('preliminar', 'final')),
  -- Fecha en la que se PUBLICÓ este dato — distinta de `date` (el período
  -- al que corresponde, ej. un CPI de julio publicado en agosto). Solo se
  -- llena en la carga manual (Actualizar.tsx); para indicadores
  -- automatizados queda NULL y el frontend usa `updated_at` (la fecha en
  -- que este punto se escribió por primera vez) como aproximación.
  published_at date,
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

-- Apartado "Banco Central" del Resumen de cada divisa (Dashboard.tsx, debajo
-- del Score Compuesto) — a diferencia de banker_statements (un banquero
-- puntual), esto es UNA fila por divisa: postura institucional del banco
-- central. Solo current, sin "previous" — a diferencia de banker_statements,
-- acá alcanza con "la última", no hace falta ver el cambio comunicado a
-- comunicado. inflation_expectations/growth_expectations quedan como texto
-- libre porque no todos los bancos centrales las publican igual.
create table if not exists central_bank_notes (
  currency text primary key,
  rate_decision_date date,
  rate_decision_stance text check (rate_decision_stance in ('hawkish', 'dovish', 'neutral')),
  rate_decision_summary text,
  rate_decision_source_url text,
  press_conference_date date,
  press_conference_summary text,
  press_conference_source_url text,
  inflation_expectations text,
  growth_expectations text,
  updated_at timestamptz not null default now()
);

-- Titulares de alto impacto (sección Titulares): mezcla de lo que trae
-- /api/headlines-sync.ts (noticias de Finnhub, filtradas a G10 + CNY +
-- bonos/renta variable — solo noticias, no calendario económico programado,
-- eso va aparte en indicator_overrides/Actualizar Datos) y lo que se carga
-- a mano desde la UI cuando el usuario ve algo relevante que la API no
-- captó. "pinned" = aparece en la cinta corrediza del Panel de Control.
create table if not exists headlines (
  -- id como texto (no uuid autogenerado): /api/headlines-sync.ts arma un id
  -- determinístico (fuente + hash del título/fecha) para poder upsertear sin
  -- duplicar el mismo titular en cada corrida; las cargas manuales usan
  -- crypto.randomUUID() desde el navegador.
  id text primary key,
  title text not null,
  source text not null,
  url text,
  published_at timestamptz not null,
  impact text not null check (impact in ('alto', 'medio', 'bajo')),
  tags text[] not null default '{}',
  is_manual boolean not null default false,
  pinned boolean not null default false,
  -- Si está fijado como motivo del sesgo de una divisa (Panel de Control).
  -- Fijar acá siempre implica pinned=true (aparece también en la cinta).
  bias_currency text,
  -- Traducción al español del título — solo se completa para lo que trae
  -- Finnhub (viene en inglés); las cargas manuales ya se escriben en
  -- español, se dejan en null. Se muestra debajo del título original en
  -- HeadlineCard.tsx.
  title_es text,
  created_at timestamptz not null default now()
);

-- Migración para proyectos que ya tenían la tabla headlines creada antes de
-- esta sesión (create table if not exists no agrega columnas nuevas a una
-- tabla existente).
alter table headlines add column if not exists bias_currency text;
alter table headlines add column if not exists title_es text;

-- Sesgo por divisa (Panel de Control, "3ra capa"): badge grande manual
-- (hawkish/neutro alcista/neutro/neutro bajista/dovish), datos base del
-- banco central y la semana EN CURSO — ver currency_bias_history abajo para
-- las semanas archivadas y currency_bias_reasons para los motivos de la
-- semana en curso. Un registro por divisa.
create table if not exists currency_bias (
  currency text primary key,
  central_bank text not null default '',
  policy_rate text not null default '',
  next_meeting date,
  current_level text check (current_level in ('hawkish', 'neutral_alcista', 'neutral', 'neutral_bajista', 'dovish')),
  current_summary text not null default '',
  current_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migración: versiones anteriores de este archivo guardaban solo UNA semana
-- "anterior" en estas columnas — se reemplazó por currency_bias_history
-- (historial completo, sin límite). Borra las columnas viejas si existen;
-- no pierde datos reales porque nunca se llegó a usar "Actualizar sesgo" en
-- producción con esa versión.
alter table currency_bias drop column if exists previous_level;
alter table currency_bias drop column if exists previous_summary;
alter table currency_bias drop column if exists previous_started_at;
alter table currency_bias drop column if exists previous_reasons;

-- Semanas archivadas de sesgo (una fila por vez que se presionó "Actualizar
-- sesgo"), con sus motivos ya congelados en "reasons" (jsonb, array de
-- {id,label,color,headlineId} — no se linkea a currency_bias_reasons porque
-- esa tabla solo guarda los de la semana EN CURSO). Sin límite de filas por
-- divisa, a diferencia de la versión anterior que solo guardaba una semana
-- atrás.
create table if not exists currency_bias_history (
  id text primary key,
  currency text not null,
  level text check (level in ('hawkish', 'neutral_alcista', 'neutral', 'neutral_bajista', 'dovish')),
  summary text not null default '',
  reasons jsonb not null default '[]',
  started_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Motivos de la semana en curso de cada divisa: nombre del dato + tono
-- (misma escala de 5 niveles que el sesgo grande — no anterior/previsión/
-- actual como en Actualizar Datos). Se cargan a mano o se fijan desde un
-- titular en Titulares (headline_id). Se borran todos los de una divisa al
-- presionar "Actualizar sesgo" (ya quedaron congelados en
-- currency_bias_history.reasons).
create table if not exists currency_bias_reasons (
  id text primary key,
  currency text not null,
  label text not null,
  color text not null check (color in ('hawkish', 'neutral_alcista', 'neutral', 'neutral_bajista', 'dovish')),
  headline_id text,
  created_at timestamptz not null default now()
);

-- Migración: la versión anterior de esta tabla usaba color en
-- ('good','bad','neutral'). Se reemplaza por la escala de 5 niveles real
-- del usuario — mapeo aproximado antes de aplicar el constraint nuevo
-- (good→hawkish, bad→dovish, neutral se mantiene). No hace nada si la
-- tabla ya tiene el constraint nuevo o está vacía.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'currency_bias_reasons' and column_name = 'color'
  ) then
    update currency_bias_reasons
    set color = case color when 'good' then 'hawkish' when 'bad' then 'dovish' else color end
    where color in ('good', 'bad');
  end if;
end $$;
alter table currency_bias_reasons drop constraint if exists currency_bias_reasons_color_check;
alter table currency_bias_reasons
  add constraint currency_bias_reasons_color_check
  check (color in ('hawkish', 'neutral_alcista', 'neutral', 'neutral_bajista', 'dovish'));

-- Informes económicos (menú izquierdo del Panel de Control) y resúmenes del
-- mentor Nufal Bakali — mismo shape, tablas separadas para listarlos aparte.
-- Archivo opcional (PDF/imagen, sube al bucket de Storage "documents") y/o
-- texto pegado; al menos uno de los dos debería estar presente (no se fuerza
-- por SQL para no complicar el insert desde la UI).
create table if not exists reports (
  id text primary key,
  title text not null,
  text_content text,
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);

create table if not exists mentor_notes (
  id text primary key,
  title text not null,
  text_content text,
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);

alter table indicator_overrides enable row level security;
alter table score_overrides enable row level security;
alter table indicator_forecasts enable row level security;
alter table fomc_watch enable row level security;
alter table banker_statements enable row level security;
alter table central_bank_notes enable row level security;
alter table headlines enable row level security;
alter table currency_bias enable row level security;
alter table currency_bias_history enable row level security;
alter table currency_bias_reasons enable row level security;
alter table reports enable row level security;
alter table mentor_notes enable row level security;

-- Nota de seguridad: estas políticas permiten leer y escribir a cualquiera que
-- tenga la URL y la clave "anon" del proyecto (que va embebida en el sitio
-- público). Está bien para un dashboard personal de uso propio. Si más adelante
-- quieres que solo tú puedas editar, la forma simple es activar Supabase Auth
-- y cambiar "using (true)" por "using (auth.uid() is not null)" en las
-- políticas de escritura.
--
-- "create policy" no soporta "if not exists" en Postgres — por eso cada una
-- va precedida de "drop policy if exists", para que este archivo se pueda
-- volver a pegar entero sin error aunque las políticas ya existan de una
-- corrida anterior.
drop policy if exists "public read/write indicator_overrides" on indicator_overrides;
create policy "public read/write indicator_overrides"
  on indicator_overrides for all
  using (true)
  with check (true);

drop policy if exists "public read/write score_overrides" on score_overrides;
create policy "public read/write score_overrides"
  on score_overrides for all
  using (true)
  with check (true);

drop policy if exists "public read/write indicator_forecasts" on indicator_forecasts;
create policy "public read/write indicator_forecasts"
  on indicator_forecasts for all
  using (true)
  with check (true);

drop policy if exists "public read/write fomc_watch" on fomc_watch;
create policy "public read/write fomc_watch"
  on fomc_watch for all
  using (true)
  with check (true);

drop policy if exists "public read/write banker_statements" on banker_statements;
create policy "public read/write banker_statements"
  on banker_statements for all
  using (true)
  with check (true);

drop policy if exists "public read/write central_bank_notes" on central_bank_notes;
create policy "public read/write central_bank_notes"
  on central_bank_notes for all
  using (true)
  with check (true);

drop policy if exists "public read/write headlines" on headlines;
create policy "public read/write headlines"
  on headlines for all
  using (true)
  with check (true);

drop policy if exists "public read/write currency_bias" on currency_bias;
create policy "public read/write currency_bias"
  on currency_bias for all
  using (true)
  with check (true);

drop policy if exists "public read/write currency_bias_history" on currency_bias_history;
create policy "public read/write currency_bias_history"
  on currency_bias_history for all
  using (true)
  with check (true);

drop policy if exists "public read/write currency_bias_reasons" on currency_bias_reasons;
create policy "public read/write currency_bias_reasons"
  on currency_bias_reasons for all
  using (true)
  with check (true);

drop policy if exists "public read/write reports" on reports;
create policy "public read/write reports"
  on reports for all
  using (true)
  with check (true);

drop policy if exists "public read/write mentor_notes" on mentor_notes;
create policy "public read/write mentor_notes"
  on mentor_notes for all
  using (true)
  with check (true);

-- Bucket de Storage para los archivos de informes/resúmenes del mentor
-- (PDF/imagen). Se crea acá con SQL para no depender de tocar la UI de
-- Supabase; público de solo lectura, mismo criterio de seguridad que el
-- resto del proyecto (cualquiera con la URL del proyecto puede leer/escribir
-- — está bien para un dashboard personal de uso propio).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "public read documents" on storage.objects;
create policy "public read documents"
  on storage.objects for select
  using (bucket_id = 'documents');

drop policy if exists "public write documents" on storage.objects;
create policy "public write documents"
  on storage.objects for insert
  with check (bucket_id = 'documents');

drop policy if exists "public delete documents" on storage.objects;
create policy "public delete documents"
  on storage.objects for delete
  using (bucket_id = 'documents');
