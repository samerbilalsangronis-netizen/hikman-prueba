-- Agrega la columna "published_at" a indicator_overrides — la fecha en la
-- que se PUBLICÓ un dato, distinta de "date" (el período al que
-- corresponde, ej. un CPI de julio publicado en agosto). Se llena a mano
-- desde Actualizar.tsx (nuevo selector "Publicado", separado del selector
-- de período que ya existía); para indicadores automatizados queda NULL y
-- el frontend usa "updated_at" (la fecha en que ese punto se escribió por
-- primera vez) como aproximación. Ejecutar una sola vez en Supabase > SQL
-- Editor sobre una base que ya tiene indicator_overrides creada (schema.sql
-- ya incluye esta columna para instalaciones nuevas).
alter table indicator_overrides
  add column if not exists published_at date;
