-- Actualiza "Confianza del Consumidor (Conference Board)" (indicador 'cb',
-- USD) — a pedido del usuario (25-ago-2026), que pidió actualizar el dato,
-- reconstruir el histórico reciente y volver a verificar si ya hay API.
--
-- Verificado de nuevo: el Conference Board CCI sigue sin API pública/FRED
-- (FRED solo trae un proxy de la OCDE, "Composite Consumer Confidence"
-- CSCICP03USM665S, que NO es esta serie) — sigue de carga manual, mismo
-- motivo que ya documentaba indicators.ts. Antes de esta carga la tabla
-- solo tenía UN punto (julio-2026 = 90.8, cargado 5-ago-2026); se agrega el
-- dato de agosto-2026 (recién publicado hoy, 25-ago-2026: 89.4, coincide
-- con el comunicado oficial "down from 90.2 in July" — la diferencia con el
-- 90.8 de julio es la revisión habitual del Conference Board al dato del
-- mes anterior) y se reconstruye el histórico de los 9 meses previos desde
-- investing.com (mismo criterio que el resto de los indicadores de
-- confianza sin API — UoM, Westpac-MI AUD, etc.: valor tal como se reportó
-- originalmente en cada release, no revisiones posteriores).
--
-- Pegar entero en Supabase > SQL Editor > New query > Run.

insert into indicator_overrides (indicator_id, date, value) values
  ('cb', '2025-11-01', 88.7),
  ('cb', '2025-12-01', 89.1),
  ('cb', '2026-01-01', 84.5),
  ('cb', '2026-02-01', 91.2),
  ('cb', '2026-03-01', 91.8),
  ('cb', '2026-04-01', 92.8),
  ('cb', '2026-05-01', 93.1),
  ('cb', '2026-06-01', 91.2),
  ('cb', '2026-07-01', 90.8),
  ('cb', '2026-08-01', 89.4)
on conflict (indicator_id, date) do update set value = excluded.value;
