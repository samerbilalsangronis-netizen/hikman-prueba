-- Auditoría de CPI/RPI/PPI e ventas minoristas de GBP (el usuario mandó una
-- captura del calendario económico de agosto-2026 mostrando datos que no
-- coincidían con la app, 20-sep-2026) — verificado contra el comunicado
-- oficial de la ONS (Consumer price inflation, UK: August 2026, publicado
-- 16-sep-2026, y Retail sales, Great Britain: August 2026, publicado
-- 18-sep-2026).
--
-- gbp_cpi/gbp_cpi_yoy/gbp_core_cpi/gbp_core_cpi_yoy son de carga MANUAL (no
-- hay sync automático de CPI para GBP en api/gbp-sync.ts) — el último
-- audit manual (14-sep-2026) llegó hasta julio; agosto se publicó 2 días
-- después y quedó sin cargar. Confirmado: CPI general a/a 3.1% (vs 2.9%
-- julio), CPI general m/m 0.5%, Core CPI a/a 2.6% (sin cambio), Core CPI
-- m/m 0.3% — coincide exacto con la captura del usuario.
--
-- gbp_retail_sales* SÍ son automáticos (API del ONS, dataset DRSI,
-- corren cada 30 min) — la API ya tiene agosto cargado (0.5% m/m, 2.4% a/a
-- total; 0.6% m/m, 2.7% a/a ex combustible) y el sync debería haberlo
-- levantado solo, pero se incluye acá también como red de seguridad
-- (upsert idempotente) por si el usuario lo vio desactualizado antes del
-- último ciclo de sync. De paso se actualiza julio con la revisión más
-- reciente de la ONS: la YoY total bajó de 1.6% (dato preliminar visto el
-- 14-sep) a 1.2%, y la YoY ex combustible de 2.3% a 1.8% — revisión normal
-- de la ONS, no un error de carga.
--
-- RPI y PPI (que sí aparecen en la captura del usuario) NO están cargados
-- como indicadores en esta app todavía — no hay id gbp_rpi/gbp_ppi en
-- indicatorsGbp.ts. Si se quieren agregar, es una tarea aparte (agregar los
-- IndicatorMeta + mapear el sync); este script solo corrige lo que ya
-- existe.
insert into indicator_overrides (indicator_id, date, value) values
  ('gbp_cpi', '2026-08-01', 0.005),
  ('gbp_cpi_yoy', '2026-08-01', 0.031),
  ('gbp_core_cpi', '2026-08-01', 0.003),
  ('gbp_core_cpi_yoy', '2026-08-01', 0.026),
  ('gbp_retail_sales', '2026-08-01', 0.005),
  ('gbp_retail_sales_yoy', '2026-07-01', 0.012),
  ('gbp_retail_sales_yoy', '2026-08-01', 0.024),
  ('gbp_core_retail_sales', '2026-08-01', 0.006),
  ('gbp_core_retail_sales_yoy', '2026-07-01', 0.018),
  ('gbp_core_retail_sales_yoy', '2026-08-01', 0.027)
on conflict (indicator_id, date) do update set value = excluded.value;
