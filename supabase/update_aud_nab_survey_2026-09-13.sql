-- NAB Business Survey (AUD) — julio y agosto 2026, nunca cargados.
-- aud_business_confidence estaba en junio (-5); el propio comentario del
-- indicador ya decía "verificado: -6 para julio-2026" pero nunca se había
-- escrito el dato. aud_business_conditions no tenía NINGÚN dato cargado.
-- Fuente: comunicados oficiales de NAB, verificado 13-sep-2026.

insert into indicator_overrides (indicator_id, date, value) values
  ('aud_business_confidence', '2026-07-01', -6),
  ('aud_business_confidence', '2026-08-01', -8),
  ('aud_business_conditions', '2026-07-01', 4),
  ('aud_business_conditions', '2026-08-01', -1)
on conflict (indicator_id, date) do update set value = excluded.value;
