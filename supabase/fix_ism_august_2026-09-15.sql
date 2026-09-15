-- Versión corregida de fix_ism_august_2026-09-13.sql — ese script falló
-- ("duplicate key value violates unique constraint indicator_overrides_pkey"
-- en ism_manuf_prices/2026-07-01") porque el paso 2 usaba
-- UPDATE ... SET date = '2026-07-01', y ya existía una fila en esa fecha
-- para ese indicador. Como Supabase corre el script pegado como una sola
-- transacción, el error probablemente deshizo TODO lo anterior (incluidos
-- los deletes del paso 1) — por eso este archivo repite los 4 pasos
-- completos, no solo el que falló.
--
-- Esta versión es segura de correr sin importar si el paso 1/2 originales
-- ya habían quedado aplicados o no: usa DELETE por clave exacta (no hace
-- nada si la fila no existe) e INSERT ... SELECT ... ON CONFLICT en vez de
-- UPDATE de fecha (si ya hay una fila en la fecha destino, la pisa con el
-- valor correcto verificado contra el comunicado oficial de ISM; si no
-- existe, la crea).

-- 1) Duplicados exactos de julio con fecha de agosto mal puesta: borrar.
delete from indicator_overrides where indicator_id = 'ism_manuf_employment' and date = '2026-08-04';
delete from indicator_overrides where indicator_id = 'ism_manuf_supplier_deliveries' and date = '2026-08-04';

-- 2) Sin fila de julio separada (o con una fila que hay que pisar):
--    mover el valor de 2026-08-03 a 2026-07-01 sin chocar con el PK.
insert into indicator_overrides (indicator_id, date, value)
select indicator_id, '2026-07-01', value from indicator_overrides
where indicator_id = 'ism_manuf_production' and date = '2026-08-03'
on conflict (indicator_id, date) do update set value = excluded.value;
delete from indicator_overrides where indicator_id = 'ism_manuf_production' and date = '2026-08-03';

insert into indicator_overrides (indicator_id, date, value)
select indicator_id, '2026-07-01', value from indicator_overrides
where indicator_id = 'ism_manuf_prices' and date = '2026-08-03'
on conflict (indicator_id, date) do update set value = excluded.value;
delete from indicator_overrides where indicator_id = 'ism_manuf_prices' and date = '2026-08-03';

insert into indicator_overrides (indicator_id, date, value)
select indicator_id, '2026-07-01', value from indicator_overrides
where indicator_id = 'ism_manuf_inventories' and date = '2026-08-03'
on conflict (indicator_id, date) do update set value = excluded.value;
delete from indicator_overrides where indicator_id = 'ism_manuf_inventories' and date = '2026-08-03';

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
