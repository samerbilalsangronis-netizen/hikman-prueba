-- Auditoría completa de indicadores manuales de CAD y CHF (pedida por el
-- usuario, 13/14-sep-2026) — verificados contra S&P Global, Banco de
-- Canadá (Business Outlook Survey), LSEG/Ipsos, procure.ch, BAZG/Swiss-
-- Impex, SECO/amstat.ch y BFS.
--
-- Cambios de fuente/formato (ver también indicatorsCad.ts/indicatorsChf.ts):
-- - cad_business_confidence: nunca tuvo dato cargado (Conference Board of
--   Canada no publica una serie equivalente) — se reemplaza por el
--   indicador de actividad del Business Outlook Survey del Banco de
--   Canadá (trimestral, no mensual).
-- - cad_consumer_confidence: nunca tuvo dato cargado (Conference Board of
--   Canada descontinuó/privatizó su encuesta a inicios de 2026) — se
--   reemplaza por LSEG/Ipsos PCSI.
-- - chf_employment_change: formato corregido de "thousands" (conteo
--   absoluto) a "pct1" (BFS solo publica variación %, no un conteo).
-- - chf_pmi_serv: estaba parado en diciembre-2025 (9+ meses) — se carga
--   la serie completa ene-ago 2026.
insert into indicator_overrides (indicator_id, date, value) values
  ('cad_pmi_serv', '2026-07-01', 49.1),
  ('cad_pmi_serv', '2026-08-01', 46.8),
  ('cad_pmi_manuf', '2026-08-01', 53.0),
  ('cad_business_confidence', '2026-01-01', -0.35),
  ('cad_business_confidence', '2026-04-01', -0.39),
  ('cad_consumer_confidence', '2026-08-01', 48.19),
  ('cad_consumer_confidence', '2026-09-01', 47.35),
  ('chf_pmi_serv', '2026-01-01', 53.8),
  ('chf_pmi_serv', '2026-02-01', 54.2),
  ('chf_pmi_serv', '2026-03-01', 57.2),
  ('chf_pmi_serv', '2026-04-01', 54.8),
  ('chf_pmi_serv', '2026-05-01', 56.0),
  ('chf_pmi_serv', '2026-06-01', 59.8),
  ('chf_pmi_serv', '2026-07-01', 63.9),
  ('chf_pmi_serv', '2026-08-01', 58.3),
  ('chf_trade_balance', '2026-06-01', 3800.0),
  ('chf_trade_balance', '2026-07-01', 8100.0),
  ('chf_unemployment', '2026-07-01', 0.031),
  ('chf_unemployment', '2026-08-01', 0.031),
  ('chf_retail_sales_yoy', '2026-07-01', 0.023),
  ('chf_pmi_manuf', '2026-08-01', 57.1),
  ('chf_employment_change', '2026-01-01', 0.004),
  ('chf_employment_change', '2026-04-01', 0.005),
  ('chf_retail_sales', '2026-06-01', 0.003),
  ('chf_retail_sales', '2026-07-01', 0.001)
on conflict (indicator_id, date) do update set value = excluded.value;
