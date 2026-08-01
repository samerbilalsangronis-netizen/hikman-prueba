-- Agrega la columna "stage" a indicator_overrides para que el badge
-- Preliminar/Final pueda reflejar el último punto realmente cargado en vez
-- de un valor fijo por indicador. Ejecutar una sola vez en Supabase > SQL
-- Editor sobre una base que ya tiene indicator_overrides creada (schema.sql
-- ya incluye esta columna para instalaciones nuevas).
alter table indicator_overrides
  add column if not exists stage text check (stage in ('preliminar', 'final'));
