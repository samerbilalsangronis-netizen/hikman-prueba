-- Correcciones y datos nuevos a pedido del usuario, sobre lo ya importado en
-- import_excel_2026-07-31.sql. Correr DESPUÉS de ese archivo.
-- Pegar entero en Supabase > SQL Editor > New query > Run.

-- ============================================================
-- 1) Corregir los 2 niveles de sesgo mal interpretados: "NEUTRAL DOVISH" y
--    "NEUTRAL (HAWKISH)" no son lo mismo que "DOVISH"/"HAWKISH" — son los
--    matices intermedios (neutral_bajista / neutral_alcista).
-- ============================================================
update currency_bias_history set level = 'neutral_bajista' where id = 'SES-260711225900-199'; -- EUR, semana 2026-07-12
update currency_bias_history set level = 'neutral_alcista' where id = 'SES-260711230155-721'; -- JPY, semana 2026-07-12

-- ============================================================
-- 2) Dos indicadores de la Eurozona que se habían pasado por alto en la
--    primera importación (estaban archivados bajo la categoría "ALEMANIA"
--    del sheet, pero el texto decía "ZONA EUR" / eran agregados, no datos
--    solo de Alemania).
-- ============================================================
insert into indicator_overrides (indicator_id, date, value) values ('eur_wage_yoy', '2026-06-16', 0.034) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_labor_cost_yoy', '2026-06-16', 0.032) on conflict (indicator_id, date) do update set value = excluded.value;

-- ============================================================
-- 3) "Confianza Empresarial" del EUR estaba cargada con el IFO alemán, que
--    es un dato específicamente de Alemania, no de la Eurozona en conjunto
--    — se saca de ahí (queda sin dato hasta que aparezca una fuente
--    eurozone-wide real) y se recarga correctamente en los indicadores
--    nuevos de Alemania de abajo.
-- ============================================================
delete from indicator_overrides where indicator_id = 'eur_business_confidence' and date = '2026-06-24';

-- ============================================================
-- 4) Indicadores nuevos de Alemania y Francia (economías internas de la
--    Eurozona), a pedido del usuario.
-- ============================================================
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_cpi_mom', '2026-07-30', 0.008) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_cpi_yoy', '2026-07-30', 0.028) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_hicp_mom', '2026-07-30', 0.009) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_hicp_yoy', '2026-07-30', 0.028) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_retail_sales', '2026-06-01', -0.003) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_retail_sales_yoy', '2026-06-01', -0.003) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_pmi_manuf', '2026-07-01', 50.3) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_zew_sentiment', '2026-07-21', 26.3) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_gfk_consumer_climate', '2026-04-27', -33.3) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_industrial_production', '2026-07-07', 0.009) on conflict (indicator_id, date) do update set value = excluded.value;
-- IFO Clima Empresarial: los 2 puntos que antes estaban mal cargados en eur_business_confidence.
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_ifo_business_climate', '2026-06-24', 85.6) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_ifo_business_climate', '2026-07-27', 86.6) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_ifo_expectations', '2026-06-24', 84.1) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_de_ifo_expectations', '2026-07-27', 86.7) on conflict (indicator_id, date) do update set value = excluded.value;

-- Francia. Nota: "FRENCH CPI Y/Y JUN" y "FRENCH HICP Y/Y" venían cargados en
-- el sheet como "0.03" (sin signo %) — se interpretó como 3% directo
-- (0.03 ya es la fracción), no como 0.03%. Si en realidad el dato real era
-- otro, corregir a mano desde "Actualizar Datos" en el sitio.
insert into indicator_overrides (indicator_id, date, value) values ('eur_fr_cpi_yoy', '2026-07-16', 0.03) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_fr_hicp_yoy', '2026-07-16', 0.03) on conflict (indicator_id, date) do update set value = excluded.value;
insert into indicator_overrides (indicator_id, date, value) values ('eur_fr_pmi_manuf', '2026-07-01', 51.2) on conflict (indicator_id, date) do update set value = excluded.value;
