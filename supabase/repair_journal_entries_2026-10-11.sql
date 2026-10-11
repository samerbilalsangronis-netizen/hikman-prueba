-- Reparación de journal_entries (Cuaderno de Economía + Informe Diario de
-- Mentoría) — 11-oct-2026.
--
-- Por qué: en Supabase la tabla quedó creada a medias (de un intento
-- anterior) y le faltan columnas, ej. "Could not find the 'color' column of
-- 'journal_entries' in the schema cache". schema.sql usa
-- `create table if not exists`, que NO agrega columnas a una tabla que ya
-- existe, así que re-correrlo no lo arregla.
--
-- Este script agrega cada columna que falte (sin borrar nada), restaura las
-- reglas de la tabla y le avisa a la API de Supabase que relea el esquema.
-- Se puede correr más de una vez sin problema.

create table if not exists journal_entries (id text primary key);

alter table journal_entries add column if not exists kind text not null default 'economia';
alter table journal_entries add column if not exists entry_date date not null default current_date;
alter table journal_entries add column if not exists color text not null default 'gris';
alter table journal_entries add column if not exists text text not null default '';
alter table journal_entries add column if not exists image_urls text[] not null default '{}';
alter table journal_entries add column if not exists ai_analysis jsonb;
alter table journal_entries add column if not exists headlines jsonb not null default '[]'::jsonb;
alter table journal_entries add column if not exists created_at timestamptz not null default now();
alter table journal_entries add column if not exists updated_at timestamptz not null default now();

-- Colores fuera de la escala de 6 pasos → gris, antes de aplicar la regla.
update journal_entries
set color = 'gris'
where color not in ('rojo', 'naranja', 'naranja_tenue', 'gris', 'verde_claro', 'verde_fuerte');
alter table journal_entries drop constraint if exists journal_entries_color_check;
alter table journal_entries
  add constraint journal_entries_color_check
  check (color in ('rojo', 'naranja', 'naranja_tenue', 'gris', 'verde_claro', 'verde_fuerte'));

alter table journal_entries drop constraint if exists journal_entries_kind_check;
alter table journal_entries
  add constraint journal_entries_kind_check
  check (kind in ('economia', 'mentoria'));

-- Una sola fila por día y tipo — la app guarda con upsert sobre (kind, entry_date).
create unique index if not exists journal_entries_kind_entry_date_key on journal_entries (kind, entry_date);
create index if not exists journal_entries_kind_date_idx on journal_entries (kind, entry_date desc);

alter table journal_entries enable row level security;
drop policy if exists "public read/write journal_entries" on journal_entries;
create policy "public read/write journal_entries"
  on journal_entries for all
  using (true)
  with check (true);

-- Que la API de Supabase relea las columnas nuevas ya mismo.
notify pgrst, 'reload schema';
