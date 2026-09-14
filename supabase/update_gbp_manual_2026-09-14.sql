-- Auditoría completa de indicadores manuales de GBP (pedida por el usuario,
-- 13/14-sep-2026) — verificados contra ONS y GfK/NielsenIQ. gdp_mom de
-- mayo-2026 usa la cifra ya REVISADA (0.0%, publicada junto con el dato de
-- junio) en vez del +0.1% preliminar original. Lo que todavía no salía al
-- 14-sep-2026 (CPI/labour market de agosto-septiembre, PMI flash de
-- septiembre, ventas minoristas de agosto) queda sin tocar — no existe
-- todavía.
insert into indicator_overrides (indicator_id, date, value) values
  ('gbp_productivity', '2026-04-01', -0.008),
  ('gbp_gdp_mom', '2026-04-01', -0.001),
  ('gbp_gdp_mom', '2026-05-01', 0.0),
  ('gbp_gdp_mom', '2026-06-01', 0.003),
  ('gbp_gdp_mom', '2026-07-01', 0.004),
  ('gbp_cpi', '2026-06-01', 0.001),
  ('gbp_cpi', '2026-07-01', 0.003),
  ('gbp_cpi_yoy', '2026-06-01', 0.026),
  ('gbp_cpi_yoy', '2026-07-01', 0.029),
  ('gbp_core_cpi', '2026-06-01', 0.003),
  ('gbp_core_cpi', '2026-07-01', 0.002),
  ('gbp_core_cpi_yoy', '2026-06-01', 0.026),
  ('gbp_core_cpi_yoy', '2026-07-01', 0.026),
  ('gbp_unemployment', '2026-05-01', 0.049),
  ('gbp_unemployment', '2026-06-01', 0.049),
  ('gbp_employment_change', '2026-05-01', 148000),
  ('gbp_employment_change', '2026-06-01', 84000),
  ('gbp_ccc', '2026-06-01', 31300),
  ('gbp_ccc', '2026-07-01', -11000),
  ('gbp_wage_incl_bonus_yoy', '2026-05-01', 0.043),
  ('gbp_wage_incl_bonus_yoy', '2026-06-01', 0.041),
  ('gbp_wage_excl_bonus_yoy', '2026-05-01', 0.034),
  ('gbp_wage_excl_bonus_yoy', '2026-06-01', 0.035),
  ('gbp_consumer_confidence', '2026-07-01', -17),
  ('gbp_consumer_confidence', '2026-08-01', -14),
  ('gbp_retail_sales', '2026-07-01', -0.005),
  ('gbp_retail_sales_yoy', '2026-07-01', 0.016),
  ('gbp_core_retail_sales', '2026-07-01', -0.009),
  ('gbp_core_retail_sales_yoy', '2026-07-01', 0.023)
on conflict (indicator_id, date) do update set value = excluded.value;
