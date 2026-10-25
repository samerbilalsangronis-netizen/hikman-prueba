-- Cuaderno de Economía: hoja semanal (25-oct-2026).
-- Agrega la columna donde se guardan las imágenes ubicadas libremente sobre
-- la hoja de cada semana. Solo toca la tabla propia del cuaderno
-- (hikman_journal_entries), nunca la de la otra app. Se puede correr más de
-- una vez sin problema.
alter table hikman_journal_entries add column if not exists week_board jsonb;

notify pgrst, 'reload schema';
