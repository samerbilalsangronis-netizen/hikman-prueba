-- Cuaderno de Economía + Informe Diario de Mentoría: tabla propia
-- (11-oct-2026). Se puede correr más de una vez sin problema.
--
-- Por qué: este proyecto de Supabase lo comparte otra app (TraderMind /
-- Bitácora Personal), que tiene su PROPIA tabla "journal_entries" (con
-- user_id). Esta app usaba el mismo nombre y las dos se pisaban. Desde ahora
-- el cuaderno usa "hikman_journal_entries" y no toca más "journal_entries".

-- 1) Tabla propia del cuaderno -------------------------------------------
create table if not exists hikman_journal_entries (
  id text primary key,
  kind text not null check (kind in ('economia', 'mentoria')),
  entry_date date not null,
  color text not null default 'gris' check (color in ('rojo', 'naranja', 'naranja_tenue', 'gris', 'verde_claro', 'verde_fuerte')),
  text text not null default '',
  image_urls text[] not null default '{}',
  ai_analysis jsonb,
  headlines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, entry_date)
);
create index if not exists hikman_journal_entries_kind_date_idx on hikman_journal_entries (kind, entry_date desc);

alter table hikman_journal_entries enable row level security;
drop policy if exists "public read/write hikman_journal_entries" on hikman_journal_entries;
create policy "public read/write hikman_journal_entries"
  on hikman_journal_entries for all
  using (true)
  with check (true);

-- 2) Deshacer lo que el script de reparación anterior le agregó a la tabla
-- de la OTRA app (solo si es la de ella, o sea, si tiene user_id):
--   - un índice único (kind, entry_date) que le impediría guardar más de
--     una entrada por día,
--   - reglas de color/kind que no son suyas,
--   - una política de lectura/escritura pública que dejaría sus entradas
--     visibles para cualquiera.
-- Las columnas que se le agregaron (kind, color, image_urls, ai_analysis,
-- headlines…) tienen valor por defecto y no le molestan, así que no se
-- borran (borrar columnas no se puede deshacer).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_entries' and column_name = 'user_id'
  ) then
    drop index if exists public.journal_entries_kind_entry_date_key;
    alter table public.journal_entries drop constraint if exists journal_entries_color_check;
    alter table public.journal_entries drop constraint if exists journal_entries_kind_check;
    drop policy if exists "public read/write journal_entries" on public.journal_entries;
  end if;
end $$;

-- 3) Que la API de Supabase vea la tabla nueva ya mismo.
notify pgrst, 'reload schema';
