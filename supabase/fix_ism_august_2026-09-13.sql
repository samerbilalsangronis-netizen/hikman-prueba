-- Corrección + carga de agosto-2026 para ISM Manufactura/Servicios.
--
-- Hallazgo: 5 filas de ism_manuf_* quedaron cargadas con la FECHA DE
-- PUBLICACIÓN (2026-08-03/04) en vez del período que en realidad miden
-- (julio-2026) — confirmado comparando los valores contra el comunicado
-- oficial de ISM: 58.5/52.8/58.9/51.2/71.1 son exactamente los números de
-- JULIO, no de agosto. Dos de ellas (employment, supplier_deliveries) ya
-- tenían además una fila correcta en 2026-07-01 con el mismo valor —
-- duplicadas. Producción/precios/inventarios no tenían fila de julio
-- separada — se les corrige la fecha en vez de borrarlas.
--
-- Con eso corregido, faltaba cargar agosto-2026 entero (publicado el
-- 2-sep-2026 para Manufactura y el 4-sep-2026 para Servicios) — nunca se
-- había cargado. Fuente: comunicados oficiales de ISM vía PR Newswire,
-- verificado 13-sep-2026.

-- 1) Duplicados exactos de julio con fecha de agosto mal puesta: borrar.
delete from indicator_overrides where indicator_id = 'ism_manuf_employment' and date = '2026-08-04';
delete from indicator_overrides where indicator_id = 'ism_manuf_supplier_deliveries' and date = '2026-08-04';

-- 2) Sin fila de julio separada: corregir la fecha de 2026-08-03 a 2026-07-01.
update indicator_overrides set date = '2026-07-01' where indicator_id = 'ism_manuf_production' and date = '2026-08-03';
update indicator_overrides set date = '2026-07-01' where indicator_id = 'ism_manuf_prices' and date = '2026-08-03';
update indicator_overrides set date = '2026-07-01' where indicator_id = 'ism_manuf_inventories' and date = '2026-08-03';

-- 3) Cargar agosto-2026 (real, antes ausente) — ISM Manufactura.
insert into indicator_overrides (indicator_id, date, value) values
  ('ism_manuf', '2026-08-01', 54.6),
  ('ism_manuf_new_orders', '2026-08-01', 53.7),
  ('ism_manuf_production', '2026-08-01', 58.3),
  ('ism_manuf_employment', '2026-08-01', 51.2),
  ('ism_manuf_supplier_deliveries', '2026-08-01', 59.3),
  ('ism_manuf_inventories', '2026-08-01', 50.6),
  ('ism_manuf_prices', '2026-08-01', 71.1)
on conflict (indicator_id, date) do update set value = excluded.value;

-- 4) Cargar agosto-2026 (real, antes ausente) — ISM Servicios.
insert into indicator_overrides (indicator_id, date, value) values
  ('ism_serv', '2026-08-01', 55.4),
  ('ism_serv_business_activity', '2026-08-01', 61.7),
  ('ism_serv_new_orders', '2026-08-01', 60.9),
  ('ism_serv_employment', '2026-08-01', 47.8),
  ('ism_serv_prices', '2026-08-01', 72.6)
on conflict (indicator_id, date) do update set value = excluded.value;
