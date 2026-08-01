-- Los subcomponentes de ISM (Nuevas Órdenes, Producción, Empleo, Precios)
-- están cargados con la fecha de PUBLICACIÓN del reporte de junio
-- (2026-07-01 para Manufactura, 2026-07-06 para Servicios) en vez de la
-- fecha real que cubren (2026-06-01). Mismo bug que ism_manuf/ism_serv,
-- ver HANDOFF.md. Verificado: los valores coinciden exacto con el
-- comunicado de junio-2026 de ISM (prnewswire.com) — son datos reales de
-- junio, no inventados, solo mal fechados. Se corrige la fecha en vez de
-- borrar la fila, porque no hay ningún otro dato base para reemplazarla.
-- Pegar entero en Supabase > SQL Editor > New query > Run.

update indicator_overrides set date = '2026-06-01' where indicator_id = 'ism_manuf_new_orders' and date = '2026-07-01';
update indicator_overrides set date = '2026-06-01' where indicator_id = 'ism_manuf_production' and date = '2026-07-01';
update indicator_overrides set date = '2026-06-01' where indicator_id = 'ism_manuf_employment' and date = '2026-07-01';
update indicator_overrides set date = '2026-06-01' where indicator_id = 'ism_manuf_prices' and date = '2026-07-01';

update indicator_overrides set date = '2026-06-01' where indicator_id = 'ism_serv_new_orders' and date = '2026-07-06';
update indicator_overrides set date = '2026-06-01' where indicator_id = 'ism_serv_employment' and date = '2026-07-06';
update indicator_overrides set date = '2026-06-01' where indicator_id = 'ism_serv_prices' and date = '2026-07-06';
