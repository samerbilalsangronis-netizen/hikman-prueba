-- Limpieza de duplicados de PMI headline generados por el choque entre la
-- fecha de PUBLICACIÓN (como se cargó en la importación del Excel,
-- import_excel_2026-07-31.sql) y la fecha de PERÍODO "1° del mes" (como se
-- cargó el backfill Ene-Jul 2026 de esta sesión, en historical-series.json).
-- Detalle completo de cada fila y su verificación en HANDOFF.md, sección
-- "Duplicados de PMI headline (Excel vs backfill)".
--
-- Todas las filas de abajo son, confirmado contra la fuente original de
-- S&P Global / BusinessNZ, el MISMO dato de un mes que ya quedó cargado
-- correctamente en el código con la fecha "1° del mes" — quedaban
-- pisando o duplicando visualmente ese mismo mes en el gráfico.
-- Pegar entero en Supabase > SQL Editor > New query > Run.

-- aud_pmi_manuf/serv julio: cargados con la fecha real del flash
-- (2026-07-24) en vez del 1° del mes — mismo valor que ya está en el
-- código (51.7 / 53.0), duplicado puro.
delete from indicator_overrides where indicator_id = 'aud_pmi_manuf' and date = '2026-07-24';
delete from indicator_overrides where indicator_id = 'aud_pmi_serv' and date = '2026-07-24';

-- nzd_pmi_manuf junio: cargado con fecha 2026-06-12 en vez de 2026-06-01
-- — mismo valor (59.7), duplicado puro.
delete from indicator_overrides where indicator_id = 'nzd_pmi_manuf' and date = '2026-06-12';

-- jpy_pmi_manuf junio: cargado con fecha 2026-06-30 en vez de 2026-06-01
-- — mismo valor (54.8), duplicado puro.
delete from indicator_overrides where indicator_id = 'jpy_pmi_manuf' and date = '2026-06-30';

-- jpy_pmi_serv: cargado con fecha 2026-07-03 (fecha de publicación del
-- dato de JUNIO, no julio) — mismo valor que junio (52.2). Si no se borra,
-- ocupa el casillero de julio con el dato de junio repetido.
delete from indicator_overrides where indicator_id = 'jpy_pmi_serv' and date = '2026-07-03';

-- chf_pmi_manuf: mismo problema que JPY servicios — cargado con fecha
-- 2026-07-01 (que en este dashboard SÍ es la convención real de julio)
-- pero es el dato de JUNIO (54.3) republicado. Sin este delete, julio se
-- ve con un dato que en realidad todavía no salió.
delete from indicator_overrides where indicator_id = 'chf_pmi_manuf' and date = '2026-07-01';

-- cad_pmi_manuf: CRÍTICO — esta fila está en la fecha EXACTA 2026-06-01,
-- la misma que usa el backfill para junio (53.0) — como los overrides
-- pisan a la base en la misma fecha, esta fila estaba OCULTANDO el dato
-- correcto de junio y mostrando 52.9 (que en realidad es MAYO, verificado
-- contra S&P Global/TradingEconomics: mayo=52.9, junio=53.0).
delete from indicator_overrides where indicator_id = 'cad_pmi_manuf' and date = '2026-06-01';

-- cad_pmi_serv: cargado con fecha 2026-05-05 (fecha de publicación del
-- dato de ABRIL, no mayo) — mismo valor que abril (49.2, ya está en el
-- código con fecha 2026-04-01). Duplicado que se ve pegado a mayo.
delete from indicator_overrides where indicator_id = 'cad_pmi_serv' and date = '2026-05-05';

-- sp_pmi_manuf/serv: cargados con fecha 2026-06-23 — es el FLASH de
-- junio (55.7 / 51.3), ya superado por el FINAL de junio que quedó
-- cargado en el código con fecha 2026-06-01 (53.9 / 51.2). Verificado
-- contra investingLive/TradingView: "US S&P Global manufacturing PMI
-- final for June 53.9 vs 55.7 prior". Se borra el flash viejo para que
-- junio muestre un solo punto (el final).
delete from indicator_overrides where indicator_id = 'sp_pmi_manuf' and date = '2026-06-23';
delete from indicator_overrides where indicator_id = 'sp_pmi_serv' and date = '2026-06-23';

-- NO TOCAR (sin resolver, ver HANDOFF.md): quedan 2 filas de
-- nzd_pmi_manuf/nzd_pmi_serv fechadas 2026-06-29 (50.3 y 50.2) que NO
-- coinciden con ningún valor verificado de mayo, junio ni julio para esas
-- series — no se borran ni se tocan hasta confirmar qué representan.
