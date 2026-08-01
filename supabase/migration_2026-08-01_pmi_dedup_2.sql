-- Segunda tanda de limpieza de PMI headline — encontrada al revisar la tabla
-- REAL de Supabase (la primera tanda, migration_2026-08-01_pmi_dedup.sql,
-- solo se basó en los archivos SQL de importación viejos, que no reflejaban
-- todo lo que ya estaba cargado). Detalle completo en HANDOFF.md.
-- Pegar entero en Supabase > SQL Editor > New query > Run.

-- EUR/GBP PMI Flash de julio: alguien ya los había cargado con la fecha
-- real del flash (2026-07-24) — mismo valor que el backfill en el código
-- (2026-07-01), duplicado puro.
delete from indicator_overrides where indicator_id = 'eur_pmi_manuf_flash' and date = '2026-07-24';
delete from indicator_overrides where indicator_id = 'eur_pmi_serv_flash' and date = '2026-07-24';
delete from indicator_overrides where indicator_id = 'gbp_pmi_manuf_flash' and date = '2026-07-24';
delete from indicator_overrides where indicator_id = 'gbp_pmi_serv_flash' and date = '2026-07-24';

-- ISM (USD) — CRÍTICO. Investigado a fondo: la base del código
-- (historical-series.json) tenía TODO el ISM de nov-2025 a jun-2026
-- corrido un mes (el valor de cada mes estaba etiquetado con el mes
-- SIGUIENTE) y el punto más reciente de cada serie encima tenía el
-- manuf/serv cruzado entre sí. Ya se corrigió en el código con los
-- valores reales verificados contra prnewswire.com (ISM). Estas dos
-- filas de acá eran un intento de carga manual (probablemente tuyo, vía
-- Actualizar Datos) del dato de junio, pero fechado con la fecha de
-- PUBLICACIÓN en vez del 1° del mes — ahora quedan redundantes.
delete from indicator_overrides where indicator_id = 'ism_manuf' and date = '2026-07-01';
delete from indicator_overrides where indicator_id = 'ism_serv' and date = '2026-07-06';

-- NZD: las 2 filas que habías confirmado ver como "dos datos de junio al
-- final" — no coinciden con ningún valor real verificado de mayo, junio
-- ni julio (se descartó específicamente que sean el PMI o el PSI real de
-- junio: 59.7 y 50.6 respectivamente, ya confirmados por BusinessNZ). Se
-- borran como duplicado/dato no identificado.
delete from indicator_overrides where indicator_id = 'nzd_pmi_manuf' and date = '2026-06-29';
delete from indicator_overrides where indicator_id = 'nzd_pmi_serv' and date = '2026-06-29';
