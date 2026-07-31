-- Opcional: si llegaste a correr "Sincronizar" antes de este cambio, puede
-- que hayan quedado titulares del calendario económico de Forex Factory
-- cargados en la tabla headlines (fuente "Forex Factory (calendario
-- económico)") — Titulares ahora es solo para noticias (Finnhub), el
-- calendario económico no se vuelve a traer más. Corré esto para
-- limpiarlos si los ves en la sección.
delete from headlines where source = 'Forex Factory (calendario económico)';
