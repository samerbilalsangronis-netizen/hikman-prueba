-- Corrige jpy_cpi/jpy_cpi_yoy/jpy_core_cpi/jpy_core_cpi_yoy de julio y
-- agosto-2026 con los valores oficiales exactos (usuario notó, 19-sep-2026,
-- que el a/a general mostraba ~2.1% contra el 1.9% real del comunicado
-- nacional del 18-sep-2026).
--
-- Causa raíz: api/jpy-sync.ts calculaba estos 4 indicadores desde los
-- códigos de indicador del e-Stat Dashboard en base 2020=100
-- (0703010501010090000/...010), que dejaron de reconciliar con las tasas
-- oficiales en cuanto Japón cambió la base del IPC a 2025=100 (aplicado
-- desde julio-2026) — el mismo problema que ya se había visto y corregido
-- como stopgap para el CPI de Tokio (lección 15 en indicatorsJpy.ts), pero
-- que en su momento no se tocó para el CPI nacional. Ya corregido de raíz
-- en el código (migrado a los códigos nuevos de base 2025,
-- 0703010601010090000/...010 — ver lección 17), así que el próximo sync
-- automático (corre cada 30 min) ya va a calcular bien estos 4 indicadores
-- solo. Este script es para no esperar ese ciclo: carga ahora mismo los
-- valores exactos del PDF oficial
-- (stat.go.jp/data/cpi/sokuhou/tsuki/pdf/zenkoku.pdf, comunicado del
-- 18-sep-2026, base 2025=100):
--   General a/a:   jul 1.9%  ago 1.9% (sin cambio)
--   General m/m (desestacionalizado): jul 0.4%  ago 0.0%
--   Core (ex alim. frescos) a/a:      jul 1.8%  ago 1.7%
--   Core (ex alim. frescos) m/m (desestacionalizado): jul 0.3%  ago 0.1%
insert into indicator_overrides (indicator_id, date, value) values
  ('jpy_cpi', '2026-07-01', 0.004),
  ('jpy_cpi', '2026-08-01', 0.0),
  ('jpy_cpi_yoy', '2026-07-01', 0.019),
  ('jpy_cpi_yoy', '2026-08-01', 0.019),
  ('jpy_core_cpi', '2026-07-01', 0.003),
  ('jpy_core_cpi', '2026-08-01', 0.001),
  ('jpy_core_cpi_yoy', '2026-07-01', 0.018),
  ('jpy_core_cpi_yoy', '2026-08-01', 0.017)
on conflict (indicator_id, date) do update set value = excluded.value;
