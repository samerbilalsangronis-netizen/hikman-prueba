-- Auditoría completa de indicadores manuales de EUR (pedida por el usuario,
-- 13/14-sep-2026) — se verificaron todos los indicadores de carga manual
-- contra sus fuentes oficiales (Eurostat, Destatis, INSEE, ZEW, ifo, GfK,
-- S&P Global/HCOB, sentix). Trae al día todo lo publicado hasta el
-- 14-sep-2026; lo que todavía no salía a esa fecha (ej. IPI de la Eurozona
-- de julio, coste laboral Q2, PMI flash de septiembre) queda como estaba,
-- ya que de verdad no existe todavía.
--
-- Nota: eur_de_retail_sales de junio-2026 se corrige de -0.7% (preliminar)
-- a 0.0% (revisión final publicada junto con el dato de julio).
insert into indicator_overrides (indicator_id, date, value) values
  ('eur_de_gfk_consumer_climate', '2026-06-01', -29.8),
  ('eur_de_gfk_consumer_climate', '2026-07-01', -29.2),
  ('eur_de_gfk_consumer_climate', '2026-08-01', -29.6),
  ('eur_de_gfk_consumer_climate', '2026-09-01', -26.6),
  ('eur_business_confidence', '2026-07-01', -6.1),
  ('eur_business_confidence', '2026-08-01', -5.3),
  ('eur_retail_sales', '2026-07-01', -0.006),
  ('eur_retail_sales_yoy', '2026-07-01', 0.006),
  ('eur_de_retail_sales', '2026-06-01', 0.0),
  ('eur_de_retail_sales', '2026-07-01', -0.034),
  ('eur_de_retail_sales_yoy', '2026-07-01', -0.025),
  ('eur_consumer_confidence', '2026-08-01', -15.5),
  ('eur_de_pmi_manuf', '2026-07-01', 52.2),
  ('eur_de_pmi_manuf', '2026-08-01', 54.3),
  ('eur_fr_pmi_manuf', '2026-07-01', 49.8),
  ('eur_fr_pmi_manuf', '2026-08-01', 51.1),
  ('eur_de_industrial_production', '2026-06-01', 0.002),
  ('eur_de_industrial_production', '2026-07-01', -0.011),
  ('eur_fr_cpi_yoy', '2026-07-01', 0.021),
  ('eur_fr_cpi_yoy', '2026-08-01', 0.024),
  ('eur_de_zew_sentiment', '2026-08-01', 34.2),
  ('eur_de_ifo_business_climate', '2026-08-01', 88.8),
  ('eur_de_ifo_expectations', '2026-08-01', 89.1),
  ('eur_de_cpi_yoy', '2026-08-01', 0.029),
  ('eur_de_cpi_mom', '2026-08-01', 0.002),
  ('eur_sentix', '2026-09-01', 5.1),
  ('eur_trade_balance', '2026-05-01', -7800.0),
  ('eur_trade_balance', '2026-06-01', 8600.0),
  ('eur_de_factory_orders', '2026-06-01', 0.031),
  ('eur_de_factory_orders', '2026-07-01', 0.025),
  ('eur_fr_cpi_mom', '2026-07-01', 0.006),
  ('eur_fr_cpi_mom', '2026-08-01', 0.007)
on conflict (indicator_id, date) do update set value = excluded.value;
