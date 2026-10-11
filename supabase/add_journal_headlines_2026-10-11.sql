-- Titulares del Cuaderno de Economía (11-oct-2026).
-- Agrega la columna donde se guardan los titulares de cada día (título +
-- color de impacto + contexto con imágenes ubicadas libremente). Se puede
-- correr más de una vez sin problema. También quedó incluida en schema.sql.
alter table journal_entries add column if not exists headlines jsonb not null default '[]'::jsonb;
