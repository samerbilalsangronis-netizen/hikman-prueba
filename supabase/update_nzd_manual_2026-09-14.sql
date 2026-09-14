-- Auditoría completa de indicadores manuales de NZD (pedida por el usuario,
-- 13/14-sep-2026) — verificados contra Stats NZ, BusinessNZ/BNZ, RBNZ y
-- Westpac McDermott Miller. nzd_ocr_rate y nzd_consumer_confidence nunca
-- habían tenido ningún dato cargado.
--
-- Notas de mapeo:
-- - Los trimestres de Stats NZ se nombran por su mes de CIERRE (ej.
--   "trimestre de junio" = abr-jun) — se guardan con el PRIMER mes del
--   período (abr-jun 2026 → 2026-04-01), igual convención que el resto
--   de la app.
-- - nzd_retail_sales_yoy / nzd_retail_sales_core_yoy: Stats NZ no publica
--   un a/a oficial para la serie desestacionalizada en volumen que sigue
--   este dashboard (solo para la serie sin desestacionalizar) — se
--   calculó a partir de los niveles oficiales publicados.
-- - nzd_ocr_rate: se cargan solo los últimos 3 meses (jul/ago/sep-2026,
--   con las dos subidas de 2.25%→2.50%→2.75%) ya que el indicador nunca
--   tuvo historial — se puede pedir un backfill más largo si hace falta.
insert into indicator_overrides (indicator_id, date, value) values
  ('nzd_ppi_output', '2026-04-01', 0.016),
  ('nzd_ppi_output_yoy', '2026-04-01', 0.032),
  ('nzd_ppi_input', '2026-04-01', 0.029),
  ('nzd_ppi_input_yoy', '2026-04-01', 0.041),
  ('nzd_unemployment', '2026-04-01', 0.056),
  ('nzd_employment_change', '2026-04-01', 0.005),
  ('nzd_participation_rate', '2026-04-01', 0.707),
  ('nzd_labour_cost_index', '2026-04-01', 0.006),
  ('nzd_labour_cost_index_yoy', '2026-04-01', 0.02),
  ('nzd_pmi_serv', '2026-07-01', 50.6),
  ('nzd_pmi_serv', '2026-08-01', 51.2),
  ('nzd_retail_sales', '2026-04-01', -0.005),
  ('nzd_retail_sales_yoy', '2026-04-01', 0.032),
  ('nzd_retail_sales_core', '2026-04-01', 0.007),
  ('nzd_retail_sales_core_yoy', '2026-04-01', 0.044),
  ('nzd_trade_balance', '2026-07-01', -1948.55),
  ('nzd_pmi_manuf', '2026-08-01', 53.1),
  ('nzd_ocr_rate', '2026-07-01', 0.025),
  ('nzd_ocr_rate', '2026-08-01', 0.025),
  ('nzd_ocr_rate', '2026-09-01', 0.0275),
  ('nzd_consumer_confidence', '2026-01-01', 94.7),
  ('nzd_consumer_confidence', '2026-04-01', 80.4)
on conflict (indicator_id, date) do update set value = excluded.value;
