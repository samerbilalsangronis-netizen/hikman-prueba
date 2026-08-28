-- Borra el indicador "Core CPI de Tokio — ex Alim. Frescos" (jpy_tokyo_core_cpi_yoy),
-- discontinuado a pedido del usuario (28-ago-2026): se reemplaza por
-- jpy_tokyo_core_core_cpi_mom/_yoy (ex alimentos frescos Y energía). El
-- Core CPI nacional (jpy_core_cpi/jpy_core_cpi_yoy) NO se toca — sigue
-- siendo la medida que target-ea el BOJ.
--
-- Pegar entero en Supabase > SQL Editor > New query > Run.

delete from indicator_overrides where indicator_id = 'jpy_tokyo_core_cpi_yoy';
delete from indicator_forecasts where indicator_id = 'jpy_tokyo_core_cpi_yoy';
