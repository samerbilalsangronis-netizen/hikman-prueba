-- Migración de la Bitácora de Trading del sistema anterior (Google Apps
-- Script "HIKMAN CAPITAL SISTEMA 2.0") — hojas CUENTAS y TRADES del Sheets
-- que el usuario subió el 8-sep-2026 (mismo archivo Excel de la migración
-- del 31-jul-2026, pero esas hojas no se habían usado hasta ahora).
--
-- Correr DESPUÉS de la versión actualizada de schema.sql (necesita
-- trading_accounts / trading_account_rules / trades ya creadas, y
-- entry_price nullable).
--
-- Decisiones de mapeo:
-- - Se filtraron los trades con ACTIVO=false (2 de 12): TRD-260706181550-138
--   (confluencias="prueba ", era un trade de prueba) y TRD-260724084527-532
--   (anulado por el usuario en el sistema viejo).
-- - TIPO 'Real'→'real', 'Fondeo'→'fondeo'. ESTADO 'Activa'/'Aprobada'→
--   'activa' (el esquema nuevo no distingue esos dos matices; ninguna de
--   las 3 cuentas estaba 'Quemada'/'Retirada').
-- - OBJETIVO_USD y RED_MAXIMA_USD (montos en USD) se convirtieron a % del
--   tamaño de cuenta para encajar en las reglas 'profit_target_pct' /
--   'max_drawdown_pct' del nuevo motor de alertas. RED_DIARIA_USD estaba en
--   0 en las 3 cuentas, no se creó regla 'max_daily_loss_pct'.
-- - El campo NOTAS de la cuenta ("CUIDADO CON TRAILING DRAW DOWN") se
--   migró como regla 'custom' (texto libre, sin verificación automática).
-- - El sistema viejo NUNCA registraba precio de entrada/salida (solo
--   resultado en USD + R:R) — entry_price/exit_price quedan sin dato en
--   los trades migrados (por eso se hizo entry_price nullable en el
--   esquema). R:R y el link de TradingView (LINK_TV) se agregaron como
--   texto al inicio de "notes", ya que el esquema nuevo no tiene columnas
--   propias para eso.
-- - H_APERTURA/H_CIERRE eran solo hora (sin fecha propia, comparten la
--   columna FECHA) — se combinaron con FECHA para armar entry_time/
--   exit_time; cuando H_CIERRE es menor que H_APERTURA se asumió que cruzó
--   la medianoche (+1 día). Sin hora registrada, se usó 00:00 como
--   aproximación (limitación heredada del sistema viejo, no del nuevo).
-- - Los IDs originales (CTA-*/TRD-*) se reusaron tal cual como primary key
--   — son únicos y sirven para trazabilidad con el sistema anterior.

-- === CUENTAS ===
insert into trading_accounts (id, name, type, status, initial_balance, created_at) values ('CTA-260706181255-321', '50$ Interes compuesto', 'real', 'activa', 50.0, '2026-07-06T18:12:55') on conflict (id) do nothing;
insert into trading_accounts (id, name, type, status, initial_balance, created_at) values ('CTA-260706213738-132', 'A: 50K FOR TRADERS FASE FONDEO', 'fondeo', 'activa', 50000.0, '2026-07-06T21:37:38') on conflict (id) do nothing;
insert into trading_accounts (id, name, type, status, initial_balance, created_at) values ('CTA-260711092249-447', 'A: 50 FOR TRADERS REAL', 'fondeo', 'activa', 50000.0, '2026-07-11T09:22:49') on conflict (id) do nothing;

-- === REGLAS ===
insert into trading_account_rules (id, account_id, type, value, description, enabled) values ('CTA-260706213738-132-rule-target', 'CTA-260706213738-132', 'profit_target_pct', 2.0, 'Migrado del sistema anterior: objetivo $1,000', true) on conflict (id) do nothing;
insert into trading_account_rules (id, account_id, type, value, description, enabled) values ('CTA-260706213738-132-rule-dd', 'CTA-260706213738-132', 'max_drawdown_pct', 6.0, 'Migrado del sistema anterior: reduccion maxima $3,000', true) on conflict (id) do nothing;
insert into trading_account_rules (id, account_id, type, value, description, enabled) values ('CTA-260706213738-132-rule-custom', 'CTA-260706213738-132', 'custom', null, 'CUIDADO CON TRAILING DRAW DOWN', true) on conflict (id) do nothing;
insert into trading_account_rules (id, account_id, type, value, description, enabled) values ('CTA-260711092249-447-rule-dd', 'CTA-260711092249-447', 'max_drawdown_pct', 6.0, 'Migrado del sistema anterior: reduccion maxima $3,000', true) on conflict (id) do nothing;

-- === TRADES ===
insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260706213932-224', 'CTA-260706213738-132', 'AUDUSD', 'compra', 0.5, 0,
  '2026-07-06T21:38:00', '2026-07-06T21:38:00', 'cerrado', 267.0,
  'R:R obtenido: 2.0', '2026-07-06T21:39:32', '2026-07-06T21:39:32'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260707093613-837', 'CTA-260706213738-132', 'NZDCAD', 'compra', 2.84, 0,
  '2026-07-07T09:00:00', '2026-07-07T09:15:00', 'cerrado', -113.87,
  'R:R obtenido: -0.22

Gráfico: https://www.tradingview.com/x/KMvc9yVP/', '2026-07-07T09:36:13', '2026-07-07T09:36:13'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260711090337-489', 'CTA-260706213738-132', 'NZDCHF', 'compra', 2.02, 0,
  '2026-07-07T20:00:00', '2026-07-08T07:00:00', 'cerrado', 857.69,
  'R:R obtenido: 1.8

Gráfico: https://www.tradingview.com/x/dnERvb4A/

NZD (Divisa de Compra) – Fortaleza Macroeconómica y RBNZ Hawkish
Resiliencia Geopolítica: Sólido desempeño macroeconómico frente a los choques de oferta globales derivados del conflicto en Oriente Medio.

Actividad Económica y Consumo: Tracción positiva en indicadores de crecimiento (PIB y PMIs). Las Ventas Minoristas registran una notable expansión del +3.3%, validando la estabilidad del consumo interno.

Presiones Inflacionarias: El IPC trimestral repuntó al 0.9% (vs. 0.6% previo), impulsado por costos de oferta, alejando el riesgo de deflación y presionando al banco central.

Mercado Laboral: Ajuste positivo con una caída en la tasa de desempleo al 5.3% (vs. 5.4% previo), confirmando robustez estructural.

Política Monetaria (RBNZ): Decisión de tipos en línea con lo esperado, incrementando la tasa oficial (OCR) en +25 pb hasta el 2.50%. El comunicado oficial mantiene un marcado sesgo hawkish, anticipando la necesidad de mayores alzas para anclar la inflación en el objetivo del 2%.

CHF (Divisa de Venta) – Sesgo Dovish y Presión Desinflacionaria
Política Monetaria (SNB): Postura ambigua en la última reunión. El sesgo principal radica en las declaraciones de Schlegel sobre la disposición del banco para intervenir activamente en el mercado cambiario, buscando debilitar o frenar la apreciación especulativa del franco como activo refugio.

Dinámica de Precios (IPC): Inflación bajo control absoluto y con tendencia a la baja; el IPC interanual retrocede al 0.5% (vs. 0.6% previo), sin reflejar contagio por los choques en Oriente Medio.

Deflación Mayorista (IPP): El Índice de Precios al Productor se contrae severamente hasta el -1.8% interanual (vs. 0.2% previo), lo que asegura que no habrá presiones inflacionarias desde la cadena de producción a mediano plazo.', '2026-07-11T09:03:37', '2026-07-11T09:03:37'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260711091444-946', 'CTA-260706181255-321', 'CHFJPY', 'venta', 0.05, 0,
  '2026-07-10T00:00:00', '2026-07-10T15:48:00', 'cerrado', 28.49,
  'R:R obtenido: 1.5

Gráfico: https://www.tradingview.com/x/83LVqn7T/', '2026-07-11T09:14:44', '2026-07-11T09:14:44'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260715134346-328', 'CTA-260706181255-321', 'CHFJPY', 'venta', 0.06, 0,
  '2026-07-15T08:00:00', '2026-07-15T11:15:00', 'cerrado', -26.49,
  'R:R obtenido: -1.0

Gráfico: https://www.tradingview.com/x/YsXLy91a/', '2026-07-15T13:43:46', '2026-07-15T13:43:46'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260723102719-523', 'CTA-260711092249-447', 'CHFJPY', 'venta', 1.41, 0,
  '2026-07-23T00:00:00', '2026-07-23T00:00:00', 'cerrado', 0,
  'Gráfico: https://www.tradingview.com/x/A8KnCsAR/

CHFJPY
CONFLUENCIA PARA LA TOMA DE DESICIONES

JPY (Divisa de Compra) – Normalización Estructural e Impulso InternoGiro Histórico en Política Monetaria (BoJ): El Banco de Japón incrementó sus tipos de interés al 1%, marcando su nivel más alto en 31 años (no visto desde 1995). El BoJ consolida una fase de normalización monetaria activa y mantiene un tono firme a favor de nuevas subidas de tipos si los datos acompañan.  Tracción Salarial y Demanda: El crecimiento de los salarios se consolida en torno al 3.2%, lo que impulsa directamente el gasto de los hogares. Esto valida una demanda interna sólida capaz de sostener la economía.Actividad Empresarial (PMIs y Tankan): Los PMIs muestran una expansión global y generalizada de la actividad económica. Paralelamente, la encuesta Tankan confirma un repunte en la confianza de las grandes corporaciones y un robusto gasto de capital.Dinámica de Precios: La inflación, aunque moderada, muestra signos estables de mejora, alejando definitivamente los fantasmas deflacionarios del pasado.Flujos de Capital de Estado: El gobierno está incentivando activamente al GPIF (Fondo de Pensiones del Gobierno de Japón, el más grande del mundo) a repatriar capitales y aumentar sus inversiones en activos nacionales, actuando como un catalizador estructural de largo plazo para el Yen.


CHF (Divisa de Venta) – Sesgo Dovish y Amenaza de Intervención
Política Monetaria (SNB): Postura ambigua en su última reunión. La directiva del banco, liderada por Schlegel, mantiene activa la advertencia de intervenir directamente en el mercado de divisas para frenar cualquier apreciación especulativa del franco como refugio.

Dinámica de Precios (IPC): Inflación bajo control absoluto y con sesgo a la baja, situando el IPC interanual en el 0.5% (vs. 0.6% previo).

Deflación Mayorista (IPP): El Índice de Precios al Productor se contrajo de forma severa hasta el -1.8% interanual (vs. 0.2% previo), cortando de raíz las presiones inflacionarias desde la cadena de suministros.', '2026-07-23T10:27:19', '2026-07-23T10:27:19'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260723111003-312', 'CTA-260706181255-321', 'NZDCHF', 'compra', 0.14, 0,
  '2026-07-23T00:00:00', '2026-07-23T00:00:00', 'cerrado', -17.87,
  'R:R obtenido: -1.0

Gráfico: https://www.tradingview.com/x/eOfPUn38/

NZD: Inflación fuerte + confianza de consumidores sólida = presión RBNZ para más alzas
CHF: Economía débil + política intervencionista de SNB = moneda estructuralmente sobrevalorada
Sin embargo, un evento macro externo (conflicto Medio Oriente) disparó aversión al riesgo global, que automáticamente fortalece los refugios seguros (CHF, JPY) e irradia debilidad en las cíclicas (NZD)


TECNICAMENTE:

La zona gris de soporte no fue reconfirmada fuerte
Un cierre por debajo habría señalado debilidad de compradores', '2026-07-23T11:10:03', '2026-07-23T11:10:03'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260729214213-464', 'CTA-260711092249-447', 'NZDCHF', 'compra', 1.23, 0,
  '2026-07-28T09:30:00', '2026-07-28T09:30:00', 'cerrado', 4.0,
  'Gráfico: https://www.tradingview.com/x/86PBJadw/

NZD: SESGO ALCISTA 
ULTIMA DESICION DE TIPOS CON UN COMUNICADO CLARAMENTE ALCISTA Y QUE DEJA LA PUERTA ABIERTA A MAS SUBIDAS ESTE ANO, LOS ULTIMOS DATOS DE INFLACION REAFIRMA EL DISCURSO DEL RBNZD, A NIVEL DE CRECIMIENTO LOS ULTIMOS DATOS HAN SIDO ALENTADORES, EL EMPLEO EN GENERAL SOLIDO, LAS PRESIONES SOBRE LOS SALARIOS AUMENTARON LIGERAMENTE, EFECTOS DE TRANSMISION DE  SEGUNDA RONDA TRAS LOS ATAQUES EEUU-IRAN

CHF: SESGO BAJISTA 

LO MAS RELEVANTE, SEGUN INFORMES, EL SNB MANTENDRA SUS TIPOS DE INTERESES EN 0% HASTA FINALES DEL 2027', '2026-07-29T21:42:13', '2026-07-29T21:42:13'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260805211117-383', 'CTA-260711092249-447', 'NZDCAD', 'compra', 1.68, 0,
  '2026-08-04T00:00:00', '2026-08-04T00:00:00', 'cerrado', 602.7,
  'R:R obtenido: 2.0

Gráfico: https://www.tradingview.com/x/DvOz3gmj/', '2026-08-05T21:11:17', '2026-08-05T21:11:17'
) on conflict (id) do nothing;

insert into trades (id, account_id, instrument, direction, size, commission, entry_time, exit_time, status, pnl, notes, created_at, updated_at) values (
  'TRD-260806095423-405', 'CTA-260706181255-321', 'NZDCAD', 'compra', 0.09, 0,
  '2026-08-05T00:00:00', '2026-08-05T00:00:00', 'cerrado', -16.05,
  'R:R obtenido: -1.0

Gráfico: https://www.tradingview.com/x/8xf1nTc9/', '2026-08-06T09:54:23', '2026-08-06T09:54:23'
) on conflict (id) do nothing;
