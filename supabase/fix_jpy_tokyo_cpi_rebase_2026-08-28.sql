-- Japón cambió la base del IPC de 2020=100 a 2025=100 justo en el
-- comunicado de HOY (28-ago-2026, ver calendario oficial: "２０２５年基準
-- 指数へ切替え" a partir del dato de julio). Nuestra automatización sigue
-- apuntando a los códigos viejos (base 2020) del e-Stat Dashboard, que ya
-- no coinciden con las tasas interanuales oficiales recalculadas bajo la
-- base nueva — julio quedó cargado con un valor levemente distinto al
-- oficial, y agosto todavía no tiene ningún punto (el Dashboard solo trae
-- un punto en los códigos de base 2025, no alcanza para derivar el a/a).
--
-- Verificado contra el PDF oficial del Ministerio de Comunicaciones
-- (stat.go.jp/data/cpi/sokuhou/tsuki/pdf/kubu.pdf, publicado hoy):
--   Total (総合):                         jul 1.8% -> ago 1.9%
--   Ex alim. frescos y energía (生鮮食品及びエネルギーを除く総合):
--                                          jul 1.8% (a/a) -> ago 2.0% (a/a)
--                                          jul 0.3% (m/m, SA) -> ago 0.3% (m/m, SA)
--
-- Este parche corrige julio (estaba levemente mal por el cambio de base)
-- y carga agosto. Se auto-corrige solo en cuanto el e-Stat Dashboard
-- acumule suficiente histórico en los códigos de base 2025 para que el
-- sync automático vuelva a traer estos mismos puntos.
--
-- Pegar entero en Supabase > SQL Editor > New query > Run.

insert into indicator_overrides (indicator_id, date, value) values
  ('jpy_tokyo_cpi_yoy', '2026-07-01', 0.018),
  ('jpy_tokyo_cpi_yoy', '2026-08-01', 0.019),
  ('jpy_tokyo_core_core_cpi_yoy', '2026-07-01', 0.018),
  ('jpy_tokyo_core_core_cpi_yoy', '2026-08-01', 0.020),
  ('jpy_tokyo_core_core_cpi_mom', '2026-07-01', 0.003),
  ('jpy_tokyo_core_core_cpi_mom', '2026-08-01', 0.003)
on conflict (indicator_id, date) do update set value = excluded.value;
