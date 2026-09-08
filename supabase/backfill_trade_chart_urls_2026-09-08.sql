-- Backfill de chart_url para los trades migrados del sistema anterior
-- (import_bitacora_trading_2026-09-08.sql) — ese import ya guardaba el link
-- de TradingView (LINK_TV) como texto dentro de "notes"; esto lo copia
-- también al campo dedicado chart_url nuevo (no toca "notes", el texto
-- queda igual, solo se agrega el link como campo separado y clickeable).
-- Correr DESPUÉS de la versión actualizada de schema.sql (necesita la
-- columna trades.chart_url) y después de haber corrido el import de la
-- Bitácora. Es seguro correrlo aunque el import todavía no se haya hecho
-- (los UPDATE simplemente no afectan ninguna fila).

update trades set chart_url = 'https://www.tradingview.com/x/KMvc9yVP/' where id = 'TRD-260707093613-837';
update trades set chart_url = 'https://www.tradingview.com/x/dnERvb4A/' where id = 'TRD-260711090337-489';
update trades set chart_url = 'https://www.tradingview.com/x/83LVqn7T/' where id = 'TRD-260711091444-946';
update trades set chart_url = 'https://www.tradingview.com/x/YsXLy91a/' where id = 'TRD-260715134346-328';
update trades set chart_url = 'https://www.tradingview.com/x/A8KnCsAR/' where id = 'TRD-260723102719-523';
update trades set chart_url = 'https://www.tradingview.com/x/eOfPUn38/' where id = 'TRD-260723111003-312';
update trades set chart_url = 'https://www.tradingview.com/x/86PBJadw/' where id = 'TRD-260729214213-464';
update trades set chart_url = 'https://www.tradingview.com/x/DvOz3gmj/' where id = 'TRD-260805211117-383';
update trades set chart_url = 'https://www.tradingview.com/x/8xf1nTc9/' where id = 'TRD-260806095423-405';
