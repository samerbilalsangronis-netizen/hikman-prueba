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

-- Bitácora de Trading (migrado del sistema anterior en Excel/Apps Script,
-- sesión 7-sep-2026): cuentas con sus reglas de consistencia/límites,
-- trades y las capturas de pantalla adjuntas. El motor de alertas (qué tan
-- cerca está una cuenta de romper una regla) se calcula en el cliente a
-- partir de estas tres tablas, no se guarda — ver src/lib/tradingRules.ts.
create table if not exists trading_accounts (
  id text primary key,
  name text not null,
  type text not null check (type in ('fondeo', 'real')),
  status text not null default 'activa' check (status in ('activa', 'inactiva')),
  initial_balance double precision not null default 0,
  created_at timestamptz not null default now()
);

-- Una fila por regla (no una columna por tipo) para poder agregar tipos de
-- regla nuevos sin migrar el esquema. 'custom' es texto libre sin `value`
-- monitoreable automáticamente.
create table if not exists trading_account_rules (
  id text primary key,
  account_id text not null references trading_accounts(id) on delete cascade,
  type text not null check (type in ('max_daily_loss_pct', 'max_drawdown_pct', 'profit_target_pct', 'min_trading_days', 'custom')),
  value double precision,
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Se inserta al ABRIR la posición (status='abierto', exit_price/exit_time
-- null) y se actualiza el MISMO registro al cerrarla (status='cerrado') —
-- a diferencia del sistema anterior, que solo cargaba el trade completo al
-- final. entry_time/exit_time son timestamptz completos (fecha + hora) para
-- soportar trades que cruzan más de un día y hora militar 24h en la UI.
create table if not exists trades (
  id text primary key,
  account_id text not null references trading_accounts(id) on delete cascade,
  instrument text not null,
  direction text not null check (direction in ('compra', 'venta')),
  size double precision not null,
  -- Nullable: no todos los traders registran el precio exacto (el sistema
  -- anterior en Excel/Apps Script nunca lo pedía, solo resultado en USD y
  -- R:R) — se guarda si se tiene, pero el P&L manual no depende de esto.
  entry_price double precision,
  exit_price double precision,
  stop_loss double precision,
  take_profit double precision,
  commission double precision not null default 0,
  entry_time timestamptz not null,
  exit_time timestamptz,
  status text not null default 'abierto' check (status in ('abierto', 'cerrado')),
  pnl double precision,
  notes text,
  screenshot_url text,
  -- Link externo al gráfico (ej. TradingView) — separado de screenshot_url,
  -- que es una captura subida al bucket "documents". Pedido explícito del
  -- usuario: quiere poder pegar el link directo sin necesidad de subir
  -- una imagen, para revisar entradas/salidas con más contexto.
  chart_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migración para trades ya creada antes de este campo.
alter table trades add column if not exists chart_url text;

-- Migración: si trades ya se había creado con entry_price not null en una
-- corrida anterior de este archivo, se relaja acá (ver comentario arriba).
alter table trades alter column entry_price drop not null;

-- Seguimiento de Idea Operativa (4-oct-2026) — una idea "activa" por vez
-- (la más reciente), para tenerla presente sin fomentar sobre-operativa.
-- entry_zone/stop_loss/take_profit son texto libre (no double precision como
-- en `trades`) porque una idea en seguimiento suele ser una zona aproximada
-- ("1.0820-1.0850"), no un precio exacto todavía.
create table if not exists trade_ideas (
  id text primary key,
  instrument text not null,
  direction text not null check (direction in ('compra', 'venta')),
  entry_zone text,
  stop_loss text,
  take_profit text,
  notes text not null default '',
  status text not null default 'activa' check (status in ('activa', 'ejecutada', 'descartada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trade_ideas_status_idx on trade_ideas (status, created_at desc);

alter table trading_accounts enable row level security;
alter table trading_account_rules enable row level security;
alter table trades enable row level security;
alter table trade_ideas enable row level security;

drop policy if exists "public read/write trading_accounts" on trading_accounts;
create policy "public read/write trading_accounts"
  on trading_accounts for all
  using (true)
  with check (true);

drop policy if exists "public read/write trading_account_rules" on trading_account_rules;
create policy "public read/write trading_account_rules"
  on trading_account_rules for all
  using (true)
  with check (true);

drop policy if exists "public read/write trades" on trades;
create policy "public read/write trades"
  on trades for all
  using (true)
  with check (true);

drop policy if exists "public read/write trade_ideas" on trade_ideas;
create policy "public read/write trade_ideas"
  on trade_ideas for all
  using (true)
  with check (true);

-- Las capturas de pantalla de los trades reusan el bucket "documents" ya
-- creado arriba (mismo criterio de seguridad, path prefijado "trades/" para
-- no mezclarse con los informes/resúmenes del mentor).

-- --- Cuaderno de Economía + Informe Diario de Mentoría (2-oct-2026) --------
-- Misma tabla para ambos (distinguidos por `kind`): una fila por día, con
-- color y fotos opcionales. No hay una tabla/acción de "archivado" — una
-- entrada pasa a ser "historial" solo porque su `entry_date` quedó fuera de
-- la semana en curso (ver src/lib/journalWeek.ts), así que no hace falta
-- mover nada con un cron a medianoche del domingo.
create table if not exists journal_entries (
  id text primary key,
  kind text not null check (kind in ('economia', 'mentoria')),
  entry_date date not null,
  color text not null default 'gris' check (color in ('rojo', 'naranja', 'naranja_tenue', 'gris', 'verde_claro', 'verde_fuerte')),
  text text not null default '',
  image_urls text[] not null default '{}',
  -- Solo se usa en kind='mentoria' — resultado de la última corrida del
  -- agente IA (api/trading-alert-email.ts?action=mentor-analyze) sobre
  -- `text`. jsonb en vez de columnas separadas porque la forma exacta
  -- (catalysts/keyLevels/scenario) puede evolucionar sin migrar el esquema.
  ai_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Una sola entrada por día y tipo (el formulario es "editar el día de
  -- hoy", no "agregar entradas sueltas").
  unique (kind, entry_date)
);
create index if not exists journal_entries_kind_date_idx on journal_entries (kind, entry_date desc);

-- Migración: la paleta original tenía 7 colores genéricos (rojo/verde/
-- amarillo/azul/morado/naranja/gris) — se reemplaza por la escala de
-- sentimiento de 6 pasos que pidió el usuario (4-oct-2026). Mapeo
-- aproximado de lo viejo a lo nuevo antes de aplicar el constraint nuevo
-- (no hace nada si la tabla ya tiene el constraint nuevo o está vacía).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'journal_entries' and column_name = 'color'
  ) then
    update journal_entries
    set color = case color
      when 'verde' then 'verde_fuerte'
      when 'amarillo' then 'naranja_tenue'
      when 'azul' then 'gris'
      when 'morado' then 'gris'
      else color
    end
    where color in ('verde', 'amarillo', 'azul', 'morado');
  end if;
end $$;
alter table journal_entries drop constraint if exists journal_entries_color_check;
alter table journal_entries
  add constraint journal_entries_color_check
  check (color in ('rojo', 'naranja', 'naranja_tenue', 'gris', 'verde_claro', 'verde_fuerte'));

-- Síntesis semanal (viernes) de los informes diarios de mentoría — generada
-- por el agente IA (api/trading-alert-email.ts?action=mentor-synthesize) a
-- partir de los journal_entries de kind='mentoria' de esa semana.
create table if not exists mentor_weekly_syntheses (
  id text primary key,
  week_start date not null unique,
  content text not null,
  created_at timestamptz not null default now()
);

alter table journal_entries enable row level security;
alter table mentor_weekly_syntheses enable row level security;

drop policy if exists "public read/write journal_entries" on journal_entries;
create policy "public read/write journal_entries"
  on journal_entries for all
  using (true)
  with check (true);

drop policy if exists "public read/write mentor_weekly_syntheses" on mentor_weekly_syntheses;
create policy "public read/write mentor_weekly_syntheses"
  on mentor_weekly_syntheses for all
  using (true)
  with check (true);

-- Las imágenes del cuaderno reusan el bucket "documents" ya creado arriba,
-- path prefijado "journal/".

-- --- Agenda Semanal: eventos económicos + recordatorio por correo (4-oct-2026) ---
-- Carga manual (como un to-do list), a diferencia de journal_entries NO es
-- "una fila por día" — puede haber varios eventos el mismo día. `event_at`
-- guarda fecha+hora exacta en UTC (el cliente la manda ya convertida desde
-- un <input type="datetime-local">, que JS interpreta en la zona horaria
-- del navegador, así que no hace falta guardar ninguna zona horaria acá).
-- `notified_at` evita mandar el recordatorio más de una vez por evento —
-- lo pone api/trading-alert-email.ts?action=calendar-reminder (ver
-- .github/workflows/sync-calendar-reminders.yml) apenas lo manda.
create table if not exists calendar_events (
  id text primary key,
  title text not null,
  currency text check (currency in ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'CHF', 'CNY')),
  event_at timestamptz not null,
  impact text not null default 'medio' check (impact in ('alto', 'medio', 'bajo')),
  alarm_enabled boolean not null default false,
  remind_minutes_before integer not null default 60,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendar_events_event_at_idx on calendar_events (event_at);

alter table calendar_events enable row level security;

drop policy if exists "public read/write calendar_events" on calendar_events;
create policy "public read/write calendar_events"
  on calendar_events for all
  using (true)
  with check (true);
