-- Auditoría completa de indicadores manuales de JPY y CNY (pedida por el
-- usuario, 13/14-sep-2026) — verificados contra el Gabinete de Japón
-- (Consumer Confidence Survey) y Caixin/S&P Global (RatingDog). El resto
-- de los indicadores manuales de estas dos divisas (Tankan, PMI final de
-- Japón) ya estaban al día — sus próximos releases caen después del
-- 14-sep-2026 y todavía no existen.
insert into indicator_overrides (indicator_id, date, value) values
  ('jpy_consumer_confidence', '2026-07-01', 34.9),
  ('jpy_consumer_confidence', '2026-08-01', 35.5),
  ('cny_caixin_pmi_manuf', '2026-08-01', 51.5),
  ('cny_caixin_pmi_services', '2026-08-01', 51.4),
  ('cny_caixin_pmi_composite', '2026-08-01', 52.1)
on conflict (indicator_id, date) do update set value = excluded.value;
