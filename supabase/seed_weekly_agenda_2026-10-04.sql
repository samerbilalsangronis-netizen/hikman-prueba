-- Carga inicial de la Agenda Semanal (4-oct-2026) — eventos de la semana del
-- 4 al 9 de octubre de 2026, transcriptos de las notas a mano del usuario.
--
-- CÓMO USAR: correr DESPUÉS de haber corrido schema.sql completo (necesita
-- que exista la tabla calendar_events). Se puede correr una sola vez; si se
-- corre dos veces, duplica las filas (no tiene upsert) — si eso pasa, borrar
-- con `delete from calendar_events where id like 'agenda-2026-10-%';` y
-- volver a correr.
--
-- HORARIOS: todos calculados a partir del horario ESTÁNDAR de cada
-- publicación (fijo, no cambia semana a semana — ej. ISM Servicios siempre
-- 10:00am hora de Nueva York, FOMC Minutes siempre 2:00pm) y convertidos a
-- UTC. No se pudo confirmar en vivo contra investing.com (el sitio bloquea
-- lectura automática), así que estos son horarios estándar confiables, EXCEPTO
-- los discursos de banqueros centrales, que no tienen horario fijo —
-- esos quedan marcados "(confirmar hora)" en el título, con una hora
-- placeholder y la alarma apagada, para no generar una falsa confianza.
--
-- alarm_enabled = false en TODOS por defecto — para no generar un alud de
-- correos de entrada. Prendé la alarma (🔔 en la tarjeta) de los que
-- realmente querés que te avisen por correo.

insert into calendar_events (id, title, currency, event_at, impact, alarm_enabled, remind_minutes_before) values
-- --- Domingo 4-oct (en realidad madrugada del lunes en Asia/Oceanía, por
-- eso cae "domingo" en hora de Venezuela) ---------------------------------
('agenda-2026-10-04-aud-pmi', 'PMI Compuesto Final (Judo Bank, sep)', 'AUD', '2026-10-04T21:00:00Z', 'bajo', false, 60),
('agenda-2026-10-04-aud-inflacion', 'Medidor de Inflación Mensual (Melbourne Institute)', 'AUD', '2026-10-05T00:00:00Z', 'bajo', false, 60),
('agenda-2026-10-04-jpy-pmi', 'PMI Compuesto Final (au Jibun Bank, sep)', 'JPY', '2026-10-05T00:30:00Z', 'bajo', false, 60),

-- --- Lunes 5-oct -----------------------------------------------------------
('agenda-2026-10-05-jpy-confianza', 'Confianza del Consumidor', 'JPY', '2026-10-05T05:00:00Z', 'bajo', false, 60),
('agenda-2026-10-05-fra-pmi', 'PMI Compuesto Final (sep)', 'EUR', '2026-10-05T05:50:00Z', 'bajo', false, 60),
('agenda-2026-10-05-deu-pmi', 'PMI Compuesto Final Alemania (sep)', 'EUR', '2026-10-05T05:55:00Z', 'bajo', false, 60),
('agenda-2026-10-05-eur-sentix', 'Sentix - Confianza Inversora', 'EUR', '2026-10-05T07:30:00Z', 'bajo', false, 60),
('agenda-2026-10-05-eur-pmi', 'PMI Compuesto Final Eurozona (sep)', 'EUR', '2026-10-05T08:00:00Z', 'bajo', false, 60),
('agenda-2026-10-05-eur-lane-1', 'Lane (BCE) habla (confirmar hora)', 'EUR', '2026-10-05T12:00:00Z', 'medio', false, 60),
('agenda-2026-10-05-eur-schnabel-1', 'Schnabel (BCE) habla (confirmar hora)', 'EUR', '2026-10-05T14:00:00Z', 'medio', false, 60),
('agenda-2026-10-05-gbp-pmi', 'PMI Servicios Final (sep)', 'GBP', '2026-10-05T08:30:00Z', 'bajo', false, 60),
('agenda-2026-10-05-usd-pmi', 'PMI Compuesto Final S&P Global (sep)', 'USD', '2026-10-05T13:45:00Z', 'bajo', false, 60),
('agenda-2026-10-05-usd-ism', 'ISM Servicios (sep)', 'USD', '2026-10-05T14:00:00Z', 'alto', false, 60),
('agenda-2026-10-05-aud-confianza', 'Confianza del Consumidor (Westpac)', 'AUD', '2026-10-05T23:30:00Z', 'medio', false, 60),

-- --- Martes 6-oct ------------------------------------------------------
('agenda-2026-10-06-jpy-ueda', 'Ueda (BOJ) habla (confirmar hora)', 'JPY', '2026-10-06T12:00:00Z', 'medio', false, 60),
('agenda-2026-10-06-jpy-salarios', 'Ingresos Laborales / Salarios (confirmar hora)', 'JPY', '2026-10-06T23:30:00Z', 'bajo', false, 60),
('agenda-2026-10-06-chf-desempleo', 'Tasa de Desempleo', 'CHF', '2026-10-06T04:45:00Z', 'bajo', false, 60),
('agenda-2026-10-06-gbp-mann', 'Mann (BoE) habla (confirmar hora)', 'GBP', '2026-10-06T13:00:00Z', 'medio', false, 60),
('agenda-2026-10-06-usd-adp', 'ADP Empleo (sep)', 'USD', '2026-10-06T12:15:00Z', 'medio', false, 60),
('agenda-2026-10-06-usd-balanza', 'Balanza Comercial (ago)', 'USD', '2026-10-06T12:30:00Z', 'medio', false, 60),
('agenda-2026-10-06-usd-bowman', 'Bowman (Fed) habla (confirmar hora)', 'USD', '2026-10-06T15:00:00Z', 'medio', false, 60),
('agenda-2026-10-06-usd-logan', 'Logan (Fed) habla (confirmar hora)', 'USD', '2026-10-06T17:00:00Z', 'medio', false, 60),
('agenda-2026-10-06-usd-williams', 'Williams (Fed) habla (confirmar hora)', 'USD', '2026-10-06T19:00:00Z', 'medio', false, 60),
('agenda-2026-10-06-cad-balanza', 'Balanza Comercial (ago)', 'CAD', '2026-10-06T12:30:00Z', 'medio', false, 60),
('agenda-2026-10-06-cad-ivey', 'PMI Ivey (sep)', 'CAD', '2026-10-06T14:00:00Z', 'bajo', false, 60),

-- --- Miércoles 7-oct ---------------------------------------------------
('agenda-2026-10-07-usd-fomc', 'Actas del FOMC', 'USD', '2026-10-07T18:00:00Z', 'alto', false, 60),
('agenda-2026-10-07-aud-expectativas', 'Expectativas de Inflación del Consumidor (confirmar hora)', 'AUD', '2026-10-07T12:00:00Z', 'bajo', false, 60),

-- --- Jueves 8-oct --------------------------------------------------------
('agenda-2026-10-08-usd-waller', 'Waller (Fed, gobernador) habla (confirmar hora)', 'USD', '2026-10-08T15:00:00Z', 'medio', false, 60),
('agenda-2026-10-08-eur-lane-2', 'Lane (BCE) habla (confirmar hora)', 'EUR', '2026-10-08T13:00:00Z', 'medio', false, 60),
('agenda-2026-10-08-gbp-pill', 'Pill (BoE) habla (confirmar nombre y hora)', 'GBP', '2026-10-08T14:00:00Z', 'medio', false, 60),
('agenda-2026-10-08-eur-actas-bce', 'Actas de la Reunión de Política Monetaria del BCE', 'EUR', '2026-10-08T10:30:00Z', 'alto', false, 60),
('agenda-2026-10-08-gbp-bailey', 'Bailey (BoE, gobernador) habla (confirmar hora)', 'GBP', '2026-10-08T16:00:00Z', 'medio', false, 60),
('agenda-2026-10-08-usd-jobless', 'Solicitudes Iniciales de Desempleo', 'USD', '2026-10-08T12:30:00Z', 'medio', false, 60),
('agenda-2026-10-08-jpy-gasto', 'Gasto en los Hogares (ago, confirmar hora)', 'JPY', '2026-10-08T23:30:00Z', 'bajo', false, 60),

-- --- Viernes 9-oct -------------------------------------------------------
('agenda-2026-10-09-cad-empleo', 'Cambio en el Empleo + Salarios (sep)', 'CAD', '2026-10-09T12:30:00Z', 'alto', false, 60),
('agenda-2026-10-09-eur-schnabel-2', 'Schnabel (BCE) habla (confirmar hora)', 'EUR', '2026-10-09T13:00:00Z', 'medio', false, 60),
('agenda-2026-10-09-usd-michigan', 'Confianza del Consumidor de Michigan, preliminar (oct)', 'USD', '2026-10-09T14:00:00Z', 'medio', false, 60);
