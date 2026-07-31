# Handoff — HIKMAN ENDÓGENO (dashboard macro multi-divisa) — para continuar en otro chat

Fecha de este resumen: 30-jul-2026 (actualizado en la misma sesión que
agregó CHF y CNY, y que corrigió datos desactualizados de CNY). Pega este
archivo completo (o pedile a Claude que lo lea desde el repo) al abrir el
chat nuevo — está pensado para ser autocontenido, no debería hacer falta
buscar contexto adicional en la conversación anterior.

## Qué es esto

Reemplazo de Excels de análisis macro (uno por divisa) por un dashboard web
multi-divisa. La idea central del proyecto es que **nunca vuelva a pasar
inadvertido** que un dato está viejo o mal calculado — de ahí las insignias
de frescura en cada tarjeta y la obsesión por verificar cada serie contra la
fuente oficial (con el número real, no solo "la API respondió 200") antes
de automatizarla.

**Estado actual: las NUEVE divisas (USD, EUR, GBP, CAD, AUD, NZD, JPY, CHF,
CNY) están completas y en producción**, ambas ramas de producción
sincronizadas al mismo commit al escribir esto. Resumen rápido por divisa
(detalle completo de cada una en "Indicadores actuales por divisa" más
abajo):

- **USD** (~43 indicadores): la divisa original, sin cambios recientes.
- **EUR** (21): sin cambios recientes esta sesión.
- **GBP** (16): mayormente manual — la API de la ONS quedó congelada, ver detalle abajo.
- **CAD** (17, 11 automáticos): StatCan WDS + Bank of Canada Valet.
- **AUD** (20, 16 automáticos): ABS Data API + CSV del RBA. Tiene Weighted
  Median y PPI además de lo estándar; el bloque de inflación usa la base
  TRIMESTRAL "pre-October 2025" a pedido del usuario (lección AUD #21/#22
  — no es un dato viejo, es un release oficial paralelo que sigue la
  fuente de referencia del usuario).
- **NZD** (14, 6 automáticos — la divisa con MENOS automatización):
  Stats NZ CSV por release; RBNZ bloqueado por Cloudflare.
- **JPY** (16, 12 automáticos): e-Stat Dashboard API + CSV del BOJ + CSV de
  Aduanas de Japón.
- **CHF** (16, 9 automáticos — agregada el 29-jul-2026): SNB Data Portal +
  feed CSV de SECO + KOF Economic Barometer API v2. Deployada en Vercel
  con permiso explícito del usuario el mismo día, `/api/chf-sync` corrido
  contra Supabase real, 9/9 sin errores.
- **CNY** (13, **13/13 automáticos = 100%, único caso**, agregada el
  29-jul-2026): divisa **distinta a las demás** — el usuario la pidió
  como referencia/"proxi de riesgo", con el pedido explícito de **NO**
  incluir Bancos Centrales ni Confianza; tampoco tiene Tasas, Empleo, ni
  Score compuesto (solo Inflación + Crecimiento). Fuente: `chinadata.live`
  (agregador NO oficial de datos de la NBS/GACC — la API oficial de la
  NBS bloquea con un WAF cualquier IP no china). Deployada el 30-jul-2026
  con permiso explícito del usuario. **El 30-jul-2026 el usuario avisó que
  Inflación estaba desactualizada (mayo en vez de junio)** — se investigó
  y se encontró que 10 de los 13 indicadores (todo Crecimiento salvo PMI)
  estaban igual de atrasados en `chinadata.live`, pese a que la NBS ya
  había publicado junio/Q2 el 10-17-jul-2026. Se corrigió a mano pusheando
  los valores oficiales verificados directo a Supabase producción +
  `historical-series.json` (ver "Lecciones CNY" #9 para el detalle
  completo y los números). **Este agregador puede volver a atrasarse —
  si el usuario reporta un dato viejo en CNY, chequear los 13 indicadores
  de una, no asumir que es uno solo.**

Reordenado en toda la app (todas las divisas): las tarjetas de Inflación
van m/m junto a su a/a, no agrupadas por separado.

## Dónde vive todo

- **Repo**: `samerbilalsangronis-netizen/hikman-prueba` (GitHub)
- **Rama de producción real** (la que deployea Vercel, confirmado
  comparando el bundle JS servido con el hash de cada rama): `claude/macro-usd-web-dashboard-xm5ypk`
  — es también la rama HEAD por defecto del repo (`git remote show
  origin`). **Esta sesión trabajó en `claude/handoff-documentation-review-9z8wtp`**
  (asignada por el entorno, arrancaba sincronizada al mismo commit que
  producción), pusheó el commit de CHF ahí primero, y el usuario dio
  permiso explícito para pushearlo también a
  `claude/macro-usd-web-dashboard-xm5ypk` — al momento de escribir esto
  ambas ramas están sincronizadas al mismo commit. También pueden existir
  otras ramas `claude/handoff-*` de sesiones previas, desactualizadas — no
  asumir su estado sin verificar.
  **Cualquier sesión nueva DEBE confirmar con `git fetch origin --prune` +
  `git log origin/<rama> -1` en todas las ramas conocidas + comparar con
  el bundle JS servido en producción antes de asumir cuál está realmente
  desplegada** — un `git log` sin fetch previo puede mostrar un ref local
  desactualizado (pasó en esta sesión: parecía que la rama de producción
  no tenía el último commit, y sí lo tenía — solo faltaba el fetch).
- **Deploy**: Vercel, auto-deploy en cada push a la rama de producción
- **URL en producción**: https://hikman-prueba.vercel.app
- **Pestaña del navegador**: "HIKMAN ENDÓGENO"
- **Base de datos**: Supabase, proyecto `HIKMAN ENDÓGENO`
  - URL: `https://ukwtmsvobrljebomuoxp.supabase.co`
  - anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrd3Rtc3ZvYnJsamVib211b3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDc0NzUsImV4cCI6MjA5OTUyMzQ3NX0.GPCCMKD7voaGi78eJf_S6NoVsWz4J6cu75KwBorhw3U`
  - (clave pública por diseño, va embebida en el sitio; no es secreta)
- **FRED API key**: `bb898209fe9db86c7bb0af38789a4d91` (gratis, del usuario, en fredaccount.stlouisfed.org)
- Variables de entorno en Vercel (Project Settings → Environment Variables):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FRED_API_KEY`

El usuario es **principiante en infra pero muy exigente con la exactitud de
los datos** — activamente compara los valores mostrados contra su propia
fuente de referencia (parece un calendario económico / terminal, no el
Excel) y avisa cuando algo no coincide. Cada vez que lo hizo esta sesión
(con CAD) resultó en un bug real encontrado y arreglado — ver "Decisiones
técnicas". Sigue sin poder correr el proyecto localmente; todo el ciclo es:
Claude edita → build/typecheck local → push a las dos ramas → Vercel
autodeploy → verificar con curl/Playwright contra producción (o contra
`npm run preview` local cuando Playwright no puede llegar a producción, ver
nota de proxy al final).

## Stack técnico

React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Recharts 3 + React Router
(HashRouter) + Supabase (Postgres) + funciones serverless de Vercel.

### Estructura de carpetas relevante

```
src/
  types.ts                 — Section, Format, Currency ('USD'|'EUR'|'GBP'|'CAD'|'AUD'|'NZD'|'JPY'|'CHF'|'CNY'),
                              IndicatorMeta, ScoreRow, CentralBanker, BankerNote,
                              Statement, BankerVoteStatus, Stance
  data/
    indicators.ts           — INDICATORS[] = [...USD, ...EUR, ...GBP, ...CAD, ...AUD, ...NZD, ...JPY, ...CHF, ...CNY],
                              SECTION_LABELS (por Currency), indicatorsBySection(section, currency)
    indicatorsEur.ts / indicatorsGbp.ts / indicatorsCad.ts / indicatorsAud.ts / indicatorsNzd.ts / indicatorsJpy.ts / indicatorsChf.ts / indicatorsCny.ts
                              — ids con prefijo eur_/gbp_/cad_/aud_/nzd_/jpy_/chf_/cny_
    historical-series.json  — histórico sembrado, TODAS las divisas mezcladas en un solo objeto
    fredMappings.ts          — FRED_MAPPINGS (USD) + EUR_FRED_MAPPINGS + EUR_EUROSTAT_INDICATOR_ID
                              + GBP_BOE_INDICATOR_ID + CAD_AUTO_INDICATOR_IDS + AUD_AUTO_INDICATOR_IDS
                              + NZD_AUTO_INDICATOR_IDS + JPY_AUTO_INDICATOR_IDS + CHF_AUTO_INDICATOR_IDS
                              + CNY_AUTO_INDICATOR_IDS (listas simples, ninguna de CAD en adelante usa FRED)
                              — copia usada SOLO por el frontend para la insignia de fuente en Actualizar.tsx
    fomcMeetings.ts          — calendario oficial FOMC 2026 (hardcodeado, solo USD)
    scoreSeed.ts / scoreSeedEur.ts / scoreSeedGbp.ts / scoreSeedCad.ts / scoreSeedAud.ts / scoreSeedNzd.ts / scoreSeedJpy.ts / scoreSeedChf.ts
                              — NO existe scoreSeedCny.ts: CNY no tiene Score (ver más abajo)
    centralBankers.ts        — FED_BANKERS[] / ECB_BANKERS[] / BOE_BANKERS[] / BOC_BANKERS[] / RBA_BANKERS[] / RBNZ_BANKERS[] / BOJ_BANKERS[] / SNB_BANKERS[],
                              bankersForCurrency(currency) — devuelve [] para CNY (a propósito, sin PBOC). Ver sección Banqueros más abajo.
    CurrencyContext.tsx      — selector de moneda global, CURRENCIES=['USD','EUR','GBP','CAD','AUD','NZD','JPY','CHF','CNY'], localStorage
    MacroDataContext.tsx     — contexto React: overrides, forecasts, score, fomcWatch, bankerNotes.
                              Supabase si está configurado, si no localStorage. fetchAllRows() pagina
                              indicator_overrides (ver bug de 1000 filas en decisiones técnicas).
  lib/
    format.ts, freshness.ts
  components/
    ChartCard.tsx, SectionGrid.tsx, FomcWatchPanel.tsx (solo currency==='USD'),
    ScorePanel.tsx (select de valoración: SOLO 5 opciones enteras -2..2 — ver bug importante abajo),
    FreshnessBadge.tsx, Layout.tsx (nav + selector de moneda — ahora oculta Tasas/Empleo/Confianza/Banqueros
    de forma GENÉRICA cuando `indicatorsBySection(...)`/`bankersForCurrency(...)` devuelven vacío, no hardcodeado a CNY)
  pages/
    Dashboard.tsx (genérico — ahora también oculta ScorePanel y secciones vacías por currency, ver arriba),
    Tasas.tsx, Inflacion.tsx, Empleo.tsx, Crecimiento.tsx (acordeón PMI),
    Sentimiento.tsx (ruta /confianza), Banqueros.tsx, Actualizar.tsx
    — TODAS (salvo Dashboard.tsx) tienen ternarios por currency para textos/labels; al agregar
      una divisa nueva hay que tocar las 6 páginas + Layout.tsx + Actualizar.tsx (grep "'CAD'"
      en src/ para encontrarlas todas) — SALVO que la divisa nueva no tenga esa sección (como
      CNY con Tasas/Empleo/Confianza/Banqueros), en cuyo caso ni hace falta tocar esa página,
      el nav ya la oculta solo.
api/
  fred-sync.ts   — USD, vía FRED
  eur-sync.ts    — EUR, vía FRED + Eurostat directo (desempleo)
  gbp-sync.ts    — GBP, SOLO la Bank Rate + Balanza Comercial vía FRED/BoE IADB (resto manual, ver por qué abajo)
  cad-sync.ts    — CAD, vía StatCan WDS + Bank of Canada Valet (11 de 15 indicadores automatizados)
  aud-sync.ts    — AUD, vía ABS Data API (SDMX) + CSV público del RBA (12 de 16 indicadores automatizados)
  nzd-sync.ts    — NZD, vía CSV públicos de Stats NZ por release (6 de 14 indicadores automatizados)
  jpy-sync.ts    — JPY, vía e-Stat Dashboard API + CSV del BOJ + CSV de Aduanas de Japón (12 de 16 automatizados)
  chf-sync.ts    — CHF, vía SNB Data Portal + feed CSV de SECO (scheduler.swissdatas.ch) + KOF Barometer API v2 (9 de 16 automatizados)
  cny-sync.ts    — CNY, vía chinadata.live (agregador no oficial de NBS/GACC — la API oficial de la NBS
                    bloquea IPs no chinas con un WAF). 13 de 13 automatizados (100%, único caso) — pero
                    OJO, ver "Lecciones CNY" #9: este agregador se atrasó ~2 meses en 10/13 series el
                    30-jul-2026, corregido a mano esa vez, puede repetirse.
public/
  bankers/*.jpg  — fotos de banqueros AUTOHOSPEDADAS (no hotlink) — ver por qué abajo.
                    Incluye snb-martin.jpg / snb-tschudin.jpg (Martin Schlegel usa Wikimedia Commons en su lugar)
supabase/
  schema.sql     — DDL completo, incluye banker_statements
```

### Por qué `api/*-sync.ts` duplican los mapeos de `src/data/`

Vercel empaqueta cada función de `/api` por separado y **no logra rastrear
imports que cruzan a `/src`** — falla en runtime con `ERR_MODULE_NOT_FOUND`.
Cada función serverless tiene que ser 100% autocontenida. Si cambias un
mapeo, **hay que tocar los dos archivos** (el de `/src` es solo para la
insignia en la UI, el de `/api` es el que realmente sincroniza).

## Arquitectura multi-divisa (patrón fijo, repetir para cada divisa nueva)

- **Selector global de moneda** en el header (`CurrencyContext`), no rutas
  separadas por divisa. Las mismas pestañas de navegación cambian de
  contenido según la moneda activa.
- **Mismo `INDICATORS[]`**, namespaced por prefijo de id (`eur_cpi`,
  `gbp_cpi`, `cad_cpi`...) + campo `currency` en `IndicatorMeta` (opcional,
  ausente = `'USD'`).
- `ScoreRow` mismo patrón: campo `currency` opcional, arrays
  `*_SCORE_SEED` concatenados en `MacroDataContext`.
- `SECTION_LABELS` es `Record<Currency, Record<string, string>>` — mismo
  `section` interno (`tasas`, `inflacion`, `empleo`, `crecimiento`,
  `confianza`, `score`), texto mostrado puede diferir por moneda.
- Tablas de Supabase son compartidas entre monedas (sin columna
  `currency`) — la separación es puramente por el prefijo del id. **Nunca
  reutilizar un id de otra divisa.**
- **PMI siempre va a `crecimiento`** (es actividad, no confianza pura);
  encuestas de confianza del consumidor/empresarial van a `confianza`.
- **Orden visual de las tarjetas dentro de cada sección: cada medida va
  su variante de corto plazo (m/m o t/t) seguida INMEDIATAMENTE de su
  a/a**, nunca todos los m/m agrupados primero y los a/a después — pedido
  explícito del usuario, aplicado a todas las divisas (USD/EUR/GBP/CAD/
  AUD/NZD/JPY/CHF/CNY). El orden de las tarjetas es simplemente el orden
  del array en `indicators{X}.ts` (no hay lógica de sorting en
  `SectionGrid`/`ChartCard`) — al agregar un indicador nuevo con su par
  m/m+a/a, colocarlos consecutivos en el archivo. (CNY es la excepción
  parcial: Ventas Minoristas/Producción Industrial/Inversión Fija solo
  tienen a/a, China no publica m/m para esas — no hay par que ordenar ahí.)
- **Una divisa nueva NO necesita tener las 6 secciones** (`tasas`,
  `inflacion`, `empleo`, `confianza`, `crecimiento`, `score`) — CNY solo
  tiene `inflacion` y `crecimiento`, a pedido explícito del usuario.
  `Layout.tsx` (`navFor`) y `Dashboard.tsx` ya manejan esto de forma
  GENÉRICA: ocultan el link de nav / la sección / el `ScorePanel` cuando
  `indicatorsBySection(sección, currency).length === 0` (o
  `bankersForCurrency(currency).length === 0` para Banqueros) — no hace
  falta tocar ese código de nuevo, solo no crear los indicadores de esa
  sección ni el `scoreSeed{X}.ts` si la divisa no lo necesita.
- Patrón de sourcing por indicador (repetir para cada divisa nueva):
  1. Buscar si el dato está en FRED. **OJO**: FRED republica series de
     otros países pero a veces están discontinuadas o desactualizadas
     (pasó con GBP y CAD) — siempre revisar la fecha de la última
     observación, no asumir que "está en FRED" = "está viva".
  2. Si no, buscar la fuente oficial del país (ver tabla de APIs más abajo).
  3. **Verificar el número contra una fuente de referencia real** — el
     comunicado oficial del banco/oficina de estadísticas, O MEJOR, lo que
     el usuario ve en su propia herramienta de referencia (calendario
     económico / Trading Economics). **No alcanza con verificar contra el
     comunicado oficial si esa fuente tiene más de una convención posible**
     — ver la lección de CAD abajo, encontrada por el usuario, no en la
     verificación inicial.
  4. Si no hay API gratis confiable, o el número no coincide con la
     fuente real y no se puede explicar el porqué, **queda manual**.
- **Banqueros centrales de cada divisa** (ver sección dedicada abajo):
  investigar composición real con WebSearch + página oficial, nunca
  inventar nombres. Para las fotos: **intentar Wikimedia Commons primero**
  (funciona sin problemas en producción, no hace falta autohospedar), y
  si no existe, **autohospedar** descargando de la página oficial del
  banco a `public/bankers/*.jpg` — ver por qué en "Decisiones técnicas".
  **Excepción: CNY no tiene banqueros** (sin PBOC) — pedido explícito del
  usuario, `bankersForCurrency('CNY')` devuelve `[]` a propósito.

## Modelo de datos (Supabase)

5 tablas, todas con RLS `using(true) with check(true)` (lectura/escritura
pública — aceptable para dashboard personal). Sin cambios de esquema
desde que se creó el proyecto, ni siquiera al agregar CHF/CNY (las tablas
son compartidas entre monedas, ver "Arquitectura multi-divisa" arriba) —
ver `supabase/schema.sql` para el DDL completo:
`indicator_overrides`, `score_overrides`, `indicator_forecasts`,
`fomc_watch` (solo USD), `banker_statements` (vacía para CNY, sin PBOC).

## Indicadores actuales por divisa

**USD (~43)**: sin cambios recientes, ver historial de commits para el
desglose.

**EUR (21)**: `eur_trade_balance` agregada en la sesión anterior a esta —
**queda MANUAL** (el dataset `teiet210` de Eurostat no coincidió con el
comunicado oficial de may-2026 pese a varios intentos de ajustar
geografía/partner; mismo criterio que Ventas Minoristas/Producción
Industrial de EUR: no se automatiza lo que no se pudo verificar).

**GBP (16)**, `indicatorsGbp.ts`, ids `gbp_`:
- Tasas (1, auto vía **BoE IADB**, no FRED — FRED tiene la Bank Rate
  discontinuada desde 2016): `gbp_boe_rate`
- `gbp_trade_balance` (auto, agregada en la sesión anterior a esta — vía
  FRED `XTNTVA01GBM664S`, republicada desde ONS, verificada contra el
  comunicado de ONS de abril-2026 — solo bienes, no bienes+servicios).
- Resto (14) **todos manuales**: CPI/Core CPI m/m y a/a, Desempleo,
  Claimant Count Change, Salario ±Bonus a/a, Confianza GfK, PMI
  Manuf/Serv Flash, Ventas Minoristas (total y subyacente), Productividad,
  PIB Mensual. Por qué manuales: la API vieja de ONS (`api.ons.gov.uk`) fue
  dada de baja en nov-2024; la nueva (`api.beta.ons.gov.uk`) tiene datasets
  clave **congelados** — verificado con evidencia concreta: `cpih01` trae
  un alert explícito "no longer being updated... up to January 2026", y
  `retail-sales-index` sigue en su versión de feb-2026 pese a que el
  `next_release` anunciado ya pasó hace meses. Automatizar ahí arriesgaría
  mostrar un dato viejo sin avisar.

**CAD (17)**, `indicatorsCad.ts`, ids `cad_`:
- Tasas (1, auto): `cad_boc_rate` (Bank of Canada Valet, serie `V39079`)
- Inflación (6, todos auto — **CAD tiene la automatización más completa de
  las divisas no-USD**): `cad_cpi`, `cad_cpi_yoy`, `cad_core_cpi`,
  `cad_core_cpi_yoy`, `cad_cpi_median`, `cad_cpi_trim`
- Empleo (2, auto): `cad_unemployment`, `cad_employment_change`
- Confianza (2, manuales — sin API pública): `cad_business_confidence`,
  `cad_consumer_confidence`
- Crecimiento (6): `cad_pmi_manuf`, `cad_pmi_serv` (manuales) +
  `cad_retail_sales`, `cad_retail_sales_yoy`, `cad_gdp_mom`, `cad_gdp_yoy`,
  `cad_trade_balance` (todos auto)
- Score (`scoreSeedCad.ts`, 9 filas — de la hoja "DECISIONES" del Excel
  compartido CAD/JPY/AUD/CHF/NZD, ver Pendiente explícito): `cad_cpi`,
  `cad_unemployment`, `cad_employment_change`, `cad_pmi_manuf`,
  `cad_pmi_serv`, `cad_retail_sales`, `cad_business_confidence`,
  `cad_consumer_confidence`, `cad_gdp_yoy`.

**AUD (20, agregada en esta sesión)**, `indicatorsAud.ts`, ids `aud_`:
- Tasas (1, auto): `aud_rba_rate` (CSV público del RBA, tabla F1.1, serie
  `FIRMMCRT` — sin key, no vía API SDMX)
- Inflación (8, todos auto vía **ABS Data API**, TODOS trimestrales —
  base "pre-October 2025", ver lección #22): `aud_cpi`/`aud_cpi_yoy`
  (headline, dataflow `CPI`) + `aud_core_cpi`/`aud_core_cpi_yoy`
  (**Trimmed Mean**, dataflow `CPI_Q`, no "ex alimentos y energía" — ver
  Decisiones técnicas #4) + `aud_weighted_median`/`aud_weighted_median_yoy`
  (dataflow `CPI_Q` — **el RBA prioriza esta medida en pie de igualdad
  con el Trimmed Mean desde oct-2025** — agregada tras el pedido del
  usuario de revisar los datos de inflación) + `aud_ppi_qoq`/`aud_ppi_yoy`
  (dataflow `PPI_FD`, trimestral — indicador que faltaba por completo).
  105 trimestres de historia (desde 2000) para las 6 primeras — ver
  lección #21/#22 sobre por qué NO se usa la serie mensual nueva (aunque
  esa sí coincide con el comunicado oficial "CPI rose X%..." de la ABS):
  el usuario pidió específicamente la base que sigue su fuente de
  referencia. **Orden de las tarjetas: cada medida va m/m (o t/t) seguido
  de su a/a**, no todos los m/m agrupados y después todos los a/a — a
  pedido explícito del usuario,
  aplicado también a USD/EUR/GBP/CAD en la misma sesión.
- Empleo (2, auto, ABS dataflow `LF`): `aud_unemployment`,
  `aud_employment_change`
- Confianza (2, manuales — sin API pública, NAB / Westpac-Melbourne
  Institute): `aud_business_confidence`, `aud_consumer_confidence`
- Crecimiento (7): `aud_pmi_manuf`, `aud_pmi_serv` (manuales) +
  `aud_retail_sales`/`aud_retail_sales_yoy` (auto, dataflow `HSI_M` — ver
  #2 abajo) + `aud_gdp_qoq`/`aud_gdp_yoy` (auto, dataflow `ANA_AGG`) +
  `aud_trade_balance` (auto, dataflow `ITGS`, solo bienes)
- Score (`scoreSeedAud.ts`, 9 filas de la hoja DECISIONES): `aud_cpi`,
  `aud_unemployment`, `aud_employment_change`, `aud_pmi_manuf`,
  `aud_pmi_serv`, `aud_retail_sales`, `aud_business_confidence`,
  `aud_consumer_confidence`, `aud_gdp_yoy`. Confianza Empresarial (-0.5→-1)
  y PIB (1.5→2) redondeados a la escala ±2, mismo criterio que CAD/EUR.

**NZD (14, agregada el 21-jul-2026)**, `indicatorsNzd.ts`, ids `nzd_`: solo
6 automáticos (la divisa con menos automatización hasta ahora) — CPI m/m y
a/a + PIB t/t y a/a (Stats NZ CSV) + Ventas Minoristas m/m y a/a
(Electronic Card Transactions). El resto (OCR, desempleo/empleo, PMI,
confianza, balanza comercial) queda manual — ver "Lecciones NZD" más
abajo para el detalle de cada bloqueo (rbnz.govt.nz completamente
bloqueado por Cloudflare, HLFS en un ZIP de ~400MB, balanza comercial
solo en XLSX).

**JPY (16, agregada el 21-jul-2026)**, `indicatorsJpy.ts`, ids `jpy_`:
- Tasas (1, auto): `jpy_boj_rate` (CSV del BOJ, serie FM01, uncollateralized
  overnight call rate — a diferencia de RBNZ, boj.or.jp NO está bloqueado)
- Inflación (4, todos auto vía **e-Stat Dashboard API** — distinta de la
  API principal de e-Stat, que exige un `appId` registrado y se descarta):
  `jpy_cpi`/`jpy_cpi_yoy` (general) + `jpy_core_cpi`/`jpy_core_cpi_yoy`
  ("ex alimentos frescos", la medida que target-ea el BOJ — NO "ex
  alimentos y energía", esa es la "core-core CPI" japonesa, una serie
  aparte). Las 4 se derivan del índice de nivel desestacionalizado — el
  Dashboard no publica el % m/m como serie separada.
- Empleo (2, auto): `jpy_unemployment` (desestacionalizado) +
  `jpy_employment_change` (derivado del nivel de empleados en 万人, x10000
  para guardar personas crudas — Japón no publica esta variación como
  serie m/m separada, solo a/a en sus comunicados)
- Confianza (2, manuales): `jpy_business_confidence` (Tankan del propio
  BOJ — tiene descarga pública en stat-search.boj.or.jp, no se automatizó
  en esta primera pasada) + `jpy_consumer_confidence` (Gabinete de Japón,
  sin URL estable encontrada)
- Crecimiento (7): `jpy_pmi_manuf`, `jpy_pmi_serv` (manuales) +
  `jpy_retail_sales`/`jpy_retail_sales_yoy` (auto, derivados del nivel —
  **sin versión desestacionalizada** en el Dashboard, a diferencia de
  CPI/desempleo/PIB) + `jpy_gdp_qoq` (auto, directo del Dashboard, SIN
  anualizar) + `jpy_gdp_yoy` (auto, derivado del nivel) + `jpy_trade_balance`
  (auto, CSV de Aduanas de Japón — el Dashboard tiene una serie con ese
  nombre pero es la de balanza de pagos, no la aduanera que reportan los
  medios, ver "Lecciones JPY" más abajo)
- Score (`scoreSeedJpy.ts`, 9 filas de la hoja DECISIONES): todas las
  valoraciones ya caían en el rango ±2, no hizo falta reescalar ninguna
  (a diferencia de CAD/AUD/NZD).

**CHF (16, agregada el 29-jul-2026, en producción desde el mismo día)**,
`indicatorsChf.ts`, ids `chf_`:
- Tasas (1, auto): `chf_snb_rate` (SNB Data Portal, cubo `snboffzisa`)
- Inflación (4, todos auto vía **SNB Data Portal**): `chf_cpi`/`chf_cpi_yoy`
  (headline, m/m derivado del nivel en el cubo `plkopr`, a/a tasa oficial
  del SFSO ya calculada en `plkoprinfla`) + `chf_core_cpi`/`chf_core_cpi_yoy`
  (definición SFSO "Kernanflation 1" — la que reportan los agregadores
  como "Swiss Core CPI", NO es "ex alimentos y energía", m/m del nivel en
  `plkoprex`, a/a en `plkoprinfla`)
- Empleo (2, manuales — sin fuente automatizable confiable encontrada):
  `chf_unemployment`, `chf_employment_change`
- Confianza (2, ambos auto — **la única divisa no-USD con Confianza
  Empresarial Y del Consumidor automatizadas**): `chf_business_confidence`
  (KOF Economic Barometer, API v2 pública del KOF ETH Zúrich) +
  `chf_consumer_confidence` (índice trimestral de SECO, vía feed CSV de
  scheduler.swissdatas.ch)
- Crecimiento (7): `chf_pmi_manuf`, `chf_pmi_serv` (manuales, procure.ch) +
  `chf_retail_sales`/`chf_retail_sales_yoy` (manuales, BFS sin fuente
  automatizable encontrada) + `chf_gdp_qoq`/`chf_gdp_yoy` (auto, feed CSV
  de SECO vía scheduler.swissdatas.ch, serie "real cssa") +
  `chf_trade_balance` (manual — el feed de PIB de SECO trae una serie con
  ese nombre pero es la trimestral de cuentas nacionales, no la mensual de
  Aduanas que reportan los medios, ver "Lecciones CHF" más abajo)
- Score (`scoreSeedChf.ts`, 9 filas de la hoja DECISIONES): Confianza
  Empresarial (0.5→1) redondeada a la escala ±2, mismo criterio que
  AUD/NZD; el resto ya caía dentro del rango.

**CNY (13, agregada el 29-jul-2026)**, `indicatorsCny.ts`, ids `cny_`:
divisa **de referencia** ("proxi de riesgo", a pedido explícito del
usuario) — **SOLO tiene Inflación y Crecimiento, sin Tasas/PBOC, sin
Empleo, sin Confianza, sin Banqueros Centrales y sin Score compuesto** (no
hay `scoreSeedCny.ts`, no hay hoja DECISIONES para esta divisa). Es la
divisa con **mejor automatización de todo el dashboard: 13/13 (100%)** —
ninguna carga manual.
- Inflación (4, todos auto): `cny_cpi`/`cny_cpi_yoy` (m/m directo de la
  NBS, a/a **derivado** encadenando 12 meses de m/m — China no publica un
  a/a mensual directo de CPI headline, ver "Lecciones CNY" más abajo) +
  `cny_ppi`/`cny_ppi_yoy` (ambos directos de la NBS)
- Crecimiento (9, todos auto): `cny_retail_sales_yoy`, `cny_industrial_output_yoy`
  (solo a/a, con hueco real cada enero-febrero — ver lección 2) +
  `cny_fixed_asset_investment` (acumulado año-a-la-fecha, "el otro
  indicador que veo conveniente" sugerido en vez de agregar una sección de
  Empleo) + `cny_pmi_manuf`/`cny_pmi_non_manuf`/`cny_pmi_composite` (los 3
  oficiales de la NBS, NO el privado de Caixin/S&P Global — sin API
  gratuita encontrada) + `cny_gdp_qoq`/`cny_gdp_yoy` + `cny_trade_balance`
  (base aduanera GACC, solo bienes)
- **Sin Score, sin Banqueros, sin Tasas/Empleo/Confianza** — la nav
  (`Layout.tsx`) y el Dashboard (`Dashboard.tsx`) ahora ocultan
  automáticamente cualquier sección/Score/link de Banqueros sin datos para
  la divisa activa (chequeando `indicatorsBySection(...).length` y
  `bankersForCurrency(...).length`) — es un cambio genérico, no
  hardcodeado a CNY, así que cualquier divisa futura con secciones
  incompletas se comporta igual sin tocar código de nuevo.

## Sección de Banqueros Centrales (`/banqueros`)

**Fed (19)** y **BCE (10)**: sin cambios recientes (ver handoffs previos —
los 5 sin foto de Wikimedia del Fed se autohospedaron en una sesión
anterior, con esto los 32 banqueros de Fed+BCE tienen foto).

**BoE (9, `BOE_BANKERS`)**: Monetary Policy Committee — Governor (Bailey),
3 Vicegobernadores (Lombardelli=Política Monetaria, Breeden=Estabilidad
Financiera, Ramsden=Mercados y Banca), Chief Economist (Pill), 4 externos
(Dhingra, Greene, Mann, Taylor). **A diferencia de Fed/BCE no hay
rotación — los 9 votan siempre.** Verificado con
`bankofengland.co.uk/about/people/monetary-policy-committee`. Bailey,
Ramsden, Mann, Taylor tienen foto en Wikimedia; los otros 5 se
autohospedaron desde bankofengland.co.uk.

**BoC (6, `BOC_BANKERS`)**: Governing Council — Governor (Macklem), Senior
Deputy Governor (Rogers), 2 Deputy Governors (Gravelle, Gosselin), 2
External Deputy Governors (Alexopoulos, Vincent). **El BoC no vota
formalmente — decide por consenso**, se usa `vote: 'voting'` igual que el
resto (el tipo no tiene categoría "consenso" separada). Verificado con
`bankofcanada.ca/about/governing-council/`. **OJO Nicolas Vincent**: al
21-jul-2026 todavía es "External Deputy Governor" (rol part-time) — pasa a
"Deputy Governor" full-time el 3-ago-2026. Si se retoma después de esa
fecha, actualizar `centralBankers.ts`. Solo Macklem tiene foto en
Wikimedia; los otros 5 se autohospedaron desde bankofcanada.ca.

**RBA (9, `RBA_BANKERS`, agregado en esta sesión)**: Monetary Policy Board
— Governor=Chair (Bullock), Deputy Governor=Deputy Chair (Hauser),
Secretary to the Treasury=ex officio (Wilkinson), + 6 no-ejecutivos (Baker,
Fry-McKibbin, Harper, Hewson, Ross, Preston). **Board nuevo, creado
1-mar-2025** — reemplazó al "Reserve Bank Board" que hasta entonces
combinaba política monetaria y gobernanza institucional; ahora están
separados (hay un "Governance Board" aparte que no modelamos, no decide la
tasa). **Los 9 votan siempre, no hay rotación** (igual que BoE/BoC).
Verificado con `rba.gov.au/about-rba/boards/monetary-policy-board/`. **OJO
Ian Harper**: su mandato termina el **31-ago-2026** — si se retoma después
de esa fecha, verificar si sigue o hay reemplazo. Ninguno de los 9 estaba
en Wikimedia Commons — los 9 se autohospedaron directo desde las páginas
oficiales `rba.gov.au/assets/images/people/...` (sin siquiera probar el
hotlink primero, ver nota de abajo).

**SNB (3, `SNB_BANKERS`, agregado el 29-jul-2026)**: Governing Board —
Chairman (Schlegel), Vice Chairman (Martin), Member (Tschudin). **El
cuerpo que decide la política monetaria son SOLO estos 3** — verificado
con `snb.ch/en/the-snb/mandates-goals/monetary-policy` ("Monetary policy
is set by the SNB's three-member Governing Board"). El SNB tiene además 4
suplentes (Schlup, Zanetti, Kraenzlin, Moser) que junto a los 3 titulares
forman el "Enlarged Governing Board" — ese cuerpo ampliado define
lineamientos estratégicos/operativos, NO decide la tasa, así que no se
modela (mismo criterio que el "Governance Board" separado del RBA, ver
lección AUD #20). **Deciden por consenso, sin votación formal
publicada** — mismo tratamiento que BoC (`vote: 'voting'`). Solo Schlegel
tiene foto en Wikimedia Commons (con permiso VRT verificado); Martin y
Tschudin se autohospedaron desde
`snb.ch/en/the-snb/organisation/history/short-biographies` (tiene fotos
oficiales de todo el historial del Direktorium, con varias resoluciones
en el `srcset` — se usó la de 458px).

### Por qué autohospedar fotos en vez de hotlinkear (encontrado en una sesión anterior)

Para los banqueros de Fed/BoE/BoC que no estaban en Wikimedia Commons, el
primer intento fue hotlinkear directo al sitio oficial del banco (mismo
patrón que ya funcionaba con Wikimedia). **`curl` daba 200 en todos los
casos, pero el usuario mandó una captura mostrando íconos de imagen rotos
en el navegador real.** Investigado: Philadelphia Fed manda el header
`Cross-Origin-Resource-Policy: same-origin`, que Chrome respeta y bloquea
la carga cross-origin de un `<img>` (CORP se aplica del lado del
navegador, `curl` no lo evalúa — por eso el falso positivo). Los demás
bancos regionales/BoE/BoC tienen protección anti-hotlinking equivalente
(probablemente basada en fingerprinting TLS/`Sec-Fetch-*`, no visible con
`curl` tampoco). **Solución**: descargar la imagen y servirla desde
`public/bankers/*.jpg` (mismo dominio, sin depender de que el sitio externo
permita el embed) — mismo patrón que ya se usaba para `favicon.svg`.
**Si agregás un banquero nuevo sin foto en Wikimedia Commons, autohospedar
directo — no perder tiempo probando el hotlink primero.**

## Decisiones técnicas importantes (no volver a redescubrir esto)

**Del historial previo (USD/EUR, siguen vigentes)**: ver handoffs
anteriores o el historial de commits — resumen: `DFEDTARU` no `FEDFUNDS`
para la tasa Fed; a/a de CPI/PPI usa NSA pero a/a de Retail
Sales/Producción Industrial usa SA (no asumir que "a/a siempre es NSA");
`shiftMonths` compara por fecha no por posición; PostgREST trunca a 1000
filas sin error si no se pagina (`fetchAllRows()` en `MacroDataContext`);
`current_date` es palabra reservada de Postgres; Google Translate rompe el
editor SQL de Supabase; Wikipedia API necesita `User-Agent` explícito;
Playwright en este sandbox no carga imágenes externas (confiar en `curl`
para verificar, no en la captura de Playwright).

**GBP**:

1. **ONS API vieja decommissioned nov-2024, la nueva está congelada** —
   ver arriba en "Indicadores actuales". Verificar SIEMPRE el
   `next_release` de un dataset de `api.beta.ons.gov.uk` contra la fecha
   de hoy antes de confiar en que está vivo.
2. **BoE IADB funciona perfecto** — endpoint correcto:
   `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp`
   (con guion bajo antes de `iadb`, fácil de escribir mal). CSV diario,
   sin key. Se downsamplea a mensual (último valor de cada mes).

**Score compuesto — bug de rango del `<select>` (encontrado con CAD, aplica
a cualquier divisa nueva)**:

3. El Excel de origen puede traer límites de valoración distintos por fila
   (Máx 1, 2, 3 o 4), pero el `<select>` de `ScorePanel.tsx` **solo tiene 5
   opciones enteras: -2, -1, 0, 1, 2**. Un valor fuera de ese set (ej. -3,
   o 0.5) no matchea ninguna `<option>` — el dropdown se ve mal (muestra la
   primera opción, -2, aunque el TOTAL sí sume el número real guardado).
   **Redondear/reescalar proporcionalmente a la escala ±2 al armar
   `scoreSeed*.ts` para cualquier fila cuyo Excel use un rango distinto** —
   mismo criterio ya usado en EUR (`scoreSeedEur.ts` tiene el mismo
   comentario). El TOTAL de la app entonces ya no replica exacto el TOTAL
   del Excel — es un trade-off aceptado, no un bug.

**CAD** (la divisa con más lecciones nuevas de convención de datos —
StatCan/BoC publican varias series válidas del "mismo" concepto a la vez):

4. **StatCan Web Data Service (WDS)**: sin key,
   `https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods`
   (POST, body `[{productId, coordinate, latestN}]`). El `productId` es el
   PID de 10 dígitos que se ve en la URL de StatCan **sin los últimos 2
   dígitos** (ej. tabla `18-10-0006-01` → `productId: 18100006`). El
   `coordinate` son los `memberId` de cada dimensión separados por punto,
   completado con ceros hasta 10 posiciones — sacar los `memberId` de
   `getCubeMetadata` primero (mismo `productId`), nunca adivinar.
5. **Bank of Canada Valet**: sin key,
   `https://www.bankofcanada.ca/valet/observations/{SERIES}/json`. Tasa
   overnight = `V39079` ("Target for the overnight rate"), viva y diaria.
6. **CPI m/m: StatCan publica DOS series válidas y NO son intercambiables**
   — la desestacionalizada (SA, tabla `18-10-0006`, la que StatCan destaca
   en su propio comunicado "The Daily") y la cruda (NSA, tabla
   `18-10-0004`). El primer verificado de esta sesión usó SA (0.5% para
   mayo-2026, coincidía con el texto oficial) pero **el usuario notó que no
   coincidía con lo que muestran los agregadores de mercado** (Trading
   Economics y similares reportan NSA: 1.0%). Corregido a NSA. **Lección:
   verificar contra el comunicado oficial no alcanza si esa fuente tiene
   más de una convención publicada — hay que confirmar cuál es la que
   efectivamente usa la referencia real del usuario.**
7. **"Core CPI" es un término ambiguo — verificar SIEMPRE cuál definición
   usa la fuente de referencia antes de elegir una serie.** "CPI ex
   alimentos y energía" (lo que casi todos asumirían por default, y lo que
   se usó en el primer intento) da un número totalmente distinto al "Core
   CPI" que reportan los agregadores para Canadá. El que sí coincide es la
   definición propia del Banco de Canadá — "CPI ex 8 componentes más
   volátiles" (StatCan tabla `18-10-0256-01`, literalmente titulada
   "...Bank of Canada definitions"). Y dentro de esa misma tabla, **la
   convención NSA/SA es distinta por transform**: el m/m coincide con la
   serie NSA (miembro 5) pero el a/a coincide con la SA (miembro 8) — la
   combinación "inversa" no matchea ninguna de las dos. **No asumir que
   m/m y a/a de un mismo concepto comparten la misma serie base, ni
   siquiera dentro de la misma tabla.**
8. **El BoC en la práctica mira más de cerca sus dos medidas de inflación
   subyacente preferidas desde 2016** — CPI-trim y CPI-median (no el "core
   CPI" genérico de arriba) — publicadas directo como tasa a/a. **OJO
   fuente (corregido 20-jul-2026): NO usar el Valet del BoC para estas
   dos** (`CPI_TRIM`/`CPI_MEDIAN`) — el Valet actualiza sus tablas con
   REZAGO respecto a StatCan: el día del release de CPI de jun-2026, el
   resto de las series CAD actualizó y estas dos no (el Valet seguía en
   mayo), lo notó el usuario. StatCan publica el mismo número el mismo
   día en la tabla `18-10-0256-01` (miembros 2=CPI-median, 3=CPI-trim,
   ya como tasa a/a) — es la fuente actual de
   `cad_cpi_trim`/`cad_cpi_median`. El Valet queda solo para la tasa
   overnight (V39079), dato propio del BoC que siempre está al día.
9. **Empleo (Cambios en el Empleo)**: el nivel de empleo de StatCan (tabla
   `14-10-0287-01`) ya viene en miles de personas — se usa el mismo
   transform `diff_x1000` que USD usa para NFP (diferencia mes a mes,
   ×1000 para guardar en personas crudas, igual que el resto del dashboard
   usa el formato `'thousands'`).
10. **PIB mensual**: Canadá, como el Reino Unido, publica una estimación de
    PIB **mensual** (tabla `36-10-0434-01`, no solo trimestral como
    EE.UU./Eurozona) — se agregó `cad_gdp_mom` además de `cad_gdp_yoy`
    (que es el que está en el score, como "PIB").
11. **Balanza comercial CAD**: tabla `12-10-0011-01`, usar la base "Balance
    of payments" (no "Customs") y la serie desestacionalizada — es la
    convención que reportan los agregadores.
12. **El Excel de origen (compartido CAD/JPY/AUD/CHF/NZD) tenía datos
    corruptos en la fila "Interest Rate"** de al menos CAD y NZD (mostraba
    22.5%, un valor que nunca fue la tasa real de ninguno de los dos
    bancos) — confirma que conviene reconstruir las tasas desde la fuente
    oficial del banco central, nunca confiar en esa fila del Excel para
    ninguna divisa nueva.

**AUD** (agregada en esta sesión — la ABS tiene una API SDMX 2.1 moderna,
pero varios datasets clásicos fueron discontinuados/migrados sin que el
nombre del dataflow lo delate):

13. **ABS Data API**: `https://data.api.abs.gov.au/rest/data/{dataflow}/{key}?format=jsondata`,
    sin key (distinta de la "ABS Indicator API", esa sí pide key por
    email). El `key` son los códigos de cada dimensión separados por punto
    en el orden que define el DSD (`GET
    .../rest/datastructure/ABS/{dataflow}` para ver el orden y los
    codelists) — dejar una posición vacía = wildcard para esa dimensión.
    `GET .../rest/availableconstraint/{dataflow}` devuelve XML (ignora
    `format=json`) con los valores que **alguna vez** existieron por
    dimensión — no garantiza que una combinación específica tenga datos
    (hay que probar la key completa).
14. **ABS discontinuó "Retail Trade, Australia" tras jun-2025** (verificado:
    la key que antes daba datos en vivo corta en 2025-06 en vez de dar
    404 — no hay error, el dataflow simplemente no se actualiza más — mismo
    patrón silencioso que la API vieja de ONS con GBP). El reemplazo
    oficial es el **Monthly Household Spending Indicator** (dataflow
    `HSI_M`, Business Indicators, Australia) — se usa para
    `aud_retail_sales`/`aud_retail_sales_yoy`. **Lección repetida: que un
    dataflow/endpoint responda 200 con datos no prueba que siga vigente —
    siempre revisar la fecha del último punto contra la fecha de hoy.**
15. **"Core CPI" para Australia = Trimmed Mean (media recortada)**, no "ex
    alimentos y energía" (Australia ni siquiera publica esa definición como
    serie estándar) — es la medida que el propio RBA destaca en sus
    comunicados de política monetaria. Dataflow `CPI`, `INDEX=999902`.
16. **Quiebre real de metodología en el CPI, no solo una convención
    distinta**: Australia migró de CPI trimestral a CPI **mensual
    completo** recién en nov-2025. La serie mensual nueva coincide exacto
    con prensa/comunicados (4.6% a/a marzo-2026, 4.0% a/a mayo-2026,
    verificado) pero **encadenar el índice trimestral histórico da un a/a
    de ~4.1% para el mismo trimestre — 0.5pp de diferencia real, no
    redondeo**. Son dos series con metodología distinta (cobertura y
    momento de recolección de precios), no la misma serie a distinta
    frecuencia. **Se optó por NO empalmar la serie trimestral vieja con la
    mensual nueva** aunque eso deja el histórico de
    `aud_cpi`/`aud_core_cpi` corto (~14-25 meses en vez de 15-20 años) —
    fabricar una continuidad falsa habría sido peor que un gráfico corto
    pero honesto. Si el usuario prefiere más historia a costa de ese
    quiebre, se puede reconsiderar — quedó sin implementar a propósito.
17. **RBA cash rate**: sin API JSON, solo CSV público —
    `https://www.rba.gov.au/statistics/tables/csv/f1.1-data.csv` (tabla
    F1.1, columna/serie `FIRMMCRT` = "Cash Rate Target"). CSV con BOM
    UTF-8 y fechas en formato `DD/MM/YYYY` (no ISO) — hay que parsear a
    mano, no hay librería de CSV en las funciones serverless.
18. **PIB (Australia solo publica trimestral, no mensual como CAD/GBP)**:
    ABS National Accounts, dataflow `ANA_AGG`, `DATA_ITEM=GPM`. El a/a NO
    viene como medida directa (`MEASURE` solo tiene t/t) — se deriva del
    nivel encadenado en volumen comparando contra el mismo trimestre del
    año anterior (verificado: 2.5% para el Q1-2026, coincide con el
    comunicado oficial).
19. **Balanza comercial AUD**: dataflow `ITGS` (International Trade in
    Goods), `DATA_ITEM=170` ("Goods", ya es el balance neto — no hay que
    restar credits menos debits a mano), desestacionalizado. Solo bienes,
    no bienes+servicios (mismo alcance que GBP).
20. **RBA reformó su gobernanza el 1-mar-2025**: el viejo "Reserve Bank
    Board" (que combinaba política monetaria y gobernanza institucional)
    se dividió en un **Monetary Policy Board** (9 miembros, decide la
    tasa) y un "Governance Board" separado (no modelado — no decide
    política monetaria). Si se busca la composición del RBA sin saber
    esto, es fácil terminar con nombres del board viejo o incompleto.
21. **La ABS publica en PARALELO dos mediciones reales de CPI/Trimmed
    Mean/Weighted Median para el mismo trimestre — no es una vieja y una
    nueva, son dos releases oficiales vigentes que corren juntos.** Desde
    nov-2025 existe el CPI mensual completo (recolección de precios
    mensual para ~todos los ítems). Pero la ABS **sigue publicando
    también, cada trimestre, una tabla trimestral en base "pre-October
    2025"** (la metodología de recolección de antes de la transición —
    varios ítems solo se relevaban trimestralmente) **embebida dentro de
    la publicación mensual de marzo/junio/septiembre/diciembre** — ya no
    es un release separado, pero el número sigue siendo un dato real,
    vigente, que la ABS actualiza cada trimestre. El primer intento de
    esta sesión asumió que ese número trimestral estaba "deprecado" y lo
    descartó — **error**: el usuario preguntó por qué su fuente de
    referencia (un calendario tipo Investing.com) seguía mostrando esos
    valores, y la respuesta correcta es que Investing trackea ese release
    trimestral como su propio evento de calendario (distinto del "Monthly
    CPI Indicator"), y sigue siendo válido. **Lección: cuando una fuente
    de referencia da un número que no coincide con el comunicado que uno
    encontró, no asumir que la fuente está atrasada — investigar si hay
    dos mediciones oficiales corriendo en paralelo antes de descartar
    ninguna.**
22. **Decisión final (a pedido explícito del usuario, tras verificar
    contra su fuente de referencia): `aud_cpi`/`aud_cpi_yoy`/
    `aud_core_cpi`/`aud_core_cpi_yoy`/`aud_weighted_median`/
    `aud_weighted_median_yoy` usan la base TRIMESTRAL "pre-October 2025"**
    (frequency `'quarterly'`), no la mensual nueva — porque es la que
    sigue la referencia real del usuario (mismo principio que la lección
    CAD #6: "confirmar cuál es la que efectivamente usa la referencia
    real del usuario"). Fuentes: dataflow `CPI` (`TSEST=10`, `FREQ=Q`,
    `INDEX=10001`) para el headline — el a/a no viene como medida directa
    ahí (`MEASURE` solo tiene t/t para esta combinación), se deriva del
    índice de nivel (`MEASURE=1`) comparando 4 trimestres atrás — y
    dataflow `CPI_Q` (`TSEST=20`, `FREQ=Q`, `INDEX=999902`/`999903`) para
    Trimmed Mean/Weighted Median, que sí publican t/t y a/a directo.
    Ventaja no buscada: la serie trimestral tiene 105 trimestres de
    historia (desde 2000) contra los 14-25 meses de la serie mensual, así
    que el cambio también mejoró la profundidad histórica de los
    gráficos. La serie mensual nueva (la que se había usado primero, y
    que sí matchea el comunicado oficial "CPI rose X% in the year to..."
    de la ABS) quedó sin indicador propio — se puede agregar aparte si en
    algún momento se quiere trackear ambas en simultáneo.

## Lecciones NZD (la divisa con menos automatización hasta ahora)

Agregado en la sesión del 21-jul-2026, a pedido explícito del usuario
("SIGAMOS CON EL NZD"). 14 indicadores, solo 6 automáticos (vs. 16/20 de
AUD o 14/18 de CAD) — no por falta de esfuerzo sino por límites reales de
las fuentes disponibles para Nueva Zelanda:

1. **rbnz.govt.nz está completamente bloqueado para cualquier fetch
   automatizado** — no es un rate-limit ni un endpoint específico: TODO el
   dominio devuelve HTTP 403 (Cloudflare bot management), incluida la
   portada, probado con curl con headers de navegador reales Y con la
   herramienta WebFetch (que usa un fetcher distinto) — ambos bloqueados
   por igual. Se descartó también data.govt.nz (el catálogo CKAN de datos
   abiertos del gobierno) como mirror alternativo — también tiene bot
   protection (Imperva) y de todos modos no tiene un dataset de OCR
   proxied. Consecuencia: `nzd_ocr_rate` queda 100% manual — pero como el
   RBNZ solo decide la tasa 7-8 veces al año, el costo de mantenerlo a
   mano es bajo (mismo criterio que las encuestas privadas del resto de
   las divisas).

2. **Stats NZ tiene una API SDMX moderna ("Aotearoa Data Explorer",
   `api.data.stats.govt.nz`) que SÍ exige key** (`Ocp-Apim-Subscription-
   Key`, registro manual en portal.apis.stats.govt.nz) — se descartó, mismo
   motivo que la "ABS Indicator API" para AUD. La vieja `NZ.Stat` /
   `nzdotstat.stats.govt.nz` (equivalente al .Stat Suite de la OCDE, que en
   otros países SÍ es de acceso libre) fue absorbida por la API nueva y
   redirige ahí — no quedó ningún camino SDMX sin key.

3. **PERO los CSV de cada release individual (`/information-releases/.../
   Download-data/`) son públicos y sin key**, con URL predecible por fecha:
   `Consumers-price-index-{Mes}-{Año}-quarter/consumers-price-index-{mes}-
   {año}-quarter-index-numbers.csv` (mismo patrón para GDP con
   `-visualisation.csv`, mes con mayúscula en la carpeta y minúscula en el
   nombre de archivo). No hay un endpoint "dame el dato más reciente" — la
   función serverless prueba el trimestre/mes actual y retrocede hasta 5-6
   períodos si el release todavía no salió (`fetchLatestQuarterlyText` /
   `fetchLatestMonthlyZipCsv` en nzd-sync.ts). CPI tiene historia hasta
   1914 (!), GDP hasta 1987 — mucho más profundidad que lo sembrado (se
   sembró desde 2000 para no infartar el bundle).

4. **El desempleo/empleo (HLFS) tiene los series_reference correctos
   verificados** (`HLFQ.S1F3S` = tasa de desempleo, `HLFQ.S1A3S` =
   empleados, ambos confirmados contra el dato oficial: 5.3% y 2,889,000
   para el primer trimestre de 2026) **pero el ZIP que los contiene pesa
   ~18.5MB comprimido y expande a ~400MB de CSV sin comprimir** (todos los
   cruces por edad/sexo/región/industria/etc. en un solo archivo, para
   sacar 2 números). Se decidió NO automatizarlo — descomprimir 400MB
   dentro de una función serverless para un dato trimestral es un riesgo
   real de memoria/timeout por muy poco beneficio. Queda manual.

5. **La Balanza Comercial (Overseas Merchandise Trade) solo se publica en
   XLSX**, nunca en CSV plano — a diferencia de CPI/GDP/Ventas Minoristas.
   Se verificó que el archivo (~267KB) SÍ tiene los datos necesarios (hoja
   "Table 1.02", columna Balance) pero con encabezados multi-fila y celdas
   de continuación en blanco (el año solo aparece en la fila de enero, las
   demás filas del año quedan vacías) — un parser confiable requeriría
   agregar una dependencia (`xlsx`/`exceljs`) y una lógica de estado
   bastante más frágil que el resto. Se priorizó confiabilidad sobre
   cobertura — queda manual, se puede reconsiderar más adelante.

6. **"Ventas Minoristas" usa Electronic Card Transactions (ECT), no el
   Retail Trade Survey trimestral** — ECT es mensual, desestacionalizado, y
   es la cifra que efectivamente sigue el mercado como "NZ Retail Sales"
   (mismo criterio que la lección AUD sobre el Monthly Household Spending
   Indicator reemplazando a Retail Trade). El ZIP de ECT es chico (~140KB
   comprimido, ~4MB sin comprimir) así que sí se automatizó, a diferencia
   del HLFS — se escribió un parser de ZIP mínimo sin dependencias
   (`extractSingleCsvFromZip` en nzd-sync.ts, vía Central Directory +
   `node:zlib` `inflateRawSync`, ya que Node no tiene soporte nativo de ZIP)
   reutilizable para cualquier release futuro que solo venga zippeado.

7. El CPI a/a y el PIB a/a, igual que en AUD, se derivan de un índice de
   nivel (Stats NZ no publica el a/a como serie separada) — verificado:
   4.06% calculado vs. ~4.1% reportado por agregadores para el CPI del
   segundo trimestre de 2026, y +0.8% t/t de PIB coincide exacto con el
   comunicado oficial ("GDP rose 0.8 percent in the March 2026 quarter")
   del primer trimestre.

8. **Banqueros del RBNZ investigados solo por WebSearch** (no por WebFetch
   ni curl directo a rbnz.govt.nz, ambos bloqueados — ver lección #1):
   Monetary Policy Committee de 6 miembros (3 internos + 3 externos, todos
   votan siempre). Sin fotos en Wikimedia Commons para ninguno de los 6
   (nombramientos muy recientes, 2024-2025, poco documentados todavía) —
   el usuario pasó la foto de Anna Breman (del comunicado de prensa del
   Riksbank donde trabajaba antes, escondida en un `data-src` de imagen
   lazy-load — no aparece con un grep simple de `src=`, hay que revisar
   también `data-src`/`srcset`) y a partir de ese hallazgo se buscaron
   las otras 5 en coberturas de prensa del nombramiento de cada uno (RNZ,
   Insurance Business NZ, b2bnews.co.nz, Universidad de Auckland — vía el
   meta tag `og:image`, que muchas veces tiene la foto aunque el HTML
   visible no la muestre fácil). Lección: cuando Wikimedia Commons no
   tiene nada, buscar la cobertura de prensa del nombramiento/anuncio
   oficial — casi siempre trae una foto de perfil, y el `og:image`/`alt`
   de esa nota suele confirmar la identidad de la persona.

## Lecciones JPY (la divisa no-USD MÁS automatizada hasta ahora)

Agregada el 21-jul-2026, a pedido explícito del usuario ("SIGAMOS CON
JPY"). 16 indicadores, 12 automáticos (vs. 6/14 de NZD y 16/20 de AUD —
JPY tiene la mejor cobertura de todas las no-USD).

1. **La API principal de e-Stat (`api.e-stat.go.jp`) exige un `appId`
   registrado** — mismo bloqueo que la Aotearoa Data Explorer de Stats NZ
   y la "ABS Indicator API", se descarta. Pero existe una SEGUNDA API,
   distinta y sin key: el **"e-Stat Dashboard API"**
   (`dashboard.e-stat.go.jp/api/1.0/`), pensado para series estándar tipo
   tablero. Formato: `getData?IndicatorCode={code}&RegionCode=00000&TimeFrom={periodo}&IsSeasonalAdjustment={1|2}`
   — `RegionCode=00000` (nacional) e `IsSeasonalAdjustment` (1=original,
   2=desestacionalizada) SÍ filtran del lado del servidor (verificado
   pidiendo Tokio contra un indicador nacional-only → vacío, y pidiendo
   ambas variantes de SA por separado → resultados distintos). El período
   mensual usa `YYYYMM00`, el trimestral `YYYYnQ00` (ej. `20261Q00` = Q1
   2026) — el formato equivocado no da error, solo responde "sin datos".
   No hay endpoint de búsqueda de códigos documentado, pero
   `getIndicatorInfo?SearchIndicatorWord={término en japonés}` funciona
   igual (sin key) y devuelve todos los códigos que matchean por nombre —
   así se encontraron todos los códigos usados en `indicatorsJpy.ts`.

2. **A diferencia de RBNZ, boj.or.jp y stat-search.boj.or.jp NO están
   bloqueados** — devuelven 200 sin problema (probado con curl real desde
   el entorno de la sesión, no solo "debería funcionar"). La tasa de
   política (uncollateralized overnight call rate, la tasa operativa desde
   que Japón salió de tasas negativas en mar-2024) se sincroniza de un CSV
   público diario, serie FM01:
   `stat-search.boj.or.jp/ssi/mtshtml/csv/fm01_d_1.csv`. El CSV viene en
   Shift-JIS pero las filas de datos (fecha,valor) son ASCII puro —
   decodificar como UTF-8 y matchear con regex alcanza, las líneas de
   cabecera en japonés simplemente no matchean y se ignoran (mismo truco
   que serviría para cualquier CSV Shift-JIS cuyas filas de datos sean
   ASCII). La serie vieja `ir01_*` ("Basic Loan Rate", el antiguo tipo de
   descuento) NO es la tasa operativa actual — no usar. **Ojo**: al ser
   diaria (una fila por día hábil, se mueva o no la tasa), varias filas
   caen en el mismo `YYYY-MM-01` al colapsar a mensual — hay que dedupear
   con un `Map` antes de upsertear o Postgres rechaza el batch entero
   (`"ON CONFLICT DO UPDATE command cannot affect row a second time"`,
   encontrado corriendo el sync real contra producción — ver "Gaps
   conocidos" para el detalle completo, incluye por qué CAD/AUD no tienen
   este mismo problema).

3. **El "Core CPI" de Japón es "CPI ex alimentos frescos"**
   (生鮮食品を除く総合), NO "ex alimentos y energía" (esa es la
   "core-core CPI" japonesa, una serie aparte) — es la medida que el BOJ
   target-ea y la que reportan los agregadores como "Japan Core CPI". Ni
   el CPI general ni el Core CPI publican el % m/m o a/a como serie
   separada en el Dashboard — las 4 series (`jpy_cpi`, `jpy_cpi_yoy`,
   `jpy_core_cpi`, `jpy_core_cpi_yoy`) se derivan del índice de nivel
   desestacionalizado. Verificado: CPI general a/a 1.52% calculado
   (redondea a 1.5%, coincide exacto) y Core CPI a/a 1.44% calculado
   (redondea a 1.4%, coincide exacto) para mayo-2026.

4. **Balanza Comercial: el Dashboard de e-Stat tiene una serie con ese
   nombre pero es la incorrecta** (código de balanza de pagos, no la
   aduanera que reportan los medios) — probado en vivo: el Dashboard daba
   un superávit chico (+69 億円) cuando el dato real reportado era un
   déficit grande (-¥378.6B) — signo Y escala mal, no solo un desfasaje de
   timing. La fuente correcta es el CSV público de Aduanas de Japón
   (Ministry of Finance): `customs.go.jp/toukei/suii/html/data/d41ma.csv`
   ("World Monthly Data", en miles de yenes, columnas
   `Years/Months,Exp-Total,Imp-Total`) — se calcula Exportaciones menos
   Importaciones. Los meses todavía no publicados vienen con "0,0", hay
   que filtrarlos. Lección general: cuando una API tiene una serie con el
   nombre exacto que buscás, igual hay que verificar el valor contra un
   dato real antes de confiar en el código — el nombre puede coincidir por
   casualidad con una definición distinta (balanza de pagos vs. aduanera
   son conceptualmente parecidas pero numéricamente muy distintas).

5. **Ventas Minoristas NO tiene versión desestacionalizada en el
   Dashboard** (código `0601010201010010000`, solo `IsSeasonalAdjustment=1`
   tiene datos) — a diferencia de CPI/desempleo/PIB. El m/m derivado del
   nivel puede tener ruido estacional real y visible en el gráfico (ej.
   diciembre siempre sube fuerte por fin de año) — documentado como
   limitación conocida en la descripción del indicador, no se intentó
   corregir.

6. **Cambios en el Empleo** se deriva de "Empleados (ambos sexos)"
   desestacionalizado (código `0301010000010010010`), NO existe una
   serie "employment change" m/m separada como en AUD/CAD — Japón reporta
   más bien el cambio interanual en sus comunicados. Unidad nativa: 万人
   (decenas de miles de personas) — se multiplica x10000 para guardar
   personas crudas, mismo transform que usa AUD. Verificado: nivel de
   68.82 millones para mayo-2026, coincide con lo reportado ("employment
   rose to a record high of 68.82 million").

7. **PIB t/t viene directo pero a/a no** — código `0705020501000040000`
   (t/t, desestacionalizado, SIN anualizar — Japón también publica una
   versión anualizada, `0705020501000060000`, que no se usa acá para
   mantener la misma convención "sin anualizar" que el resto de las
   divisas no-USD) da el t/t directo. El a/a se deriva del nivel
   (`0705020501000010000`) comparando 4 trimestres atrás, mismo patrón que
   AUD/NZD — Japón no lo publica como serie separada. Verificado: t/t 0.5%
   coincide EXACTO con el dato oficial revisado de junio-2026 (la revisión
   bajó el t/t original de 0.51% a 0.45%≈0.5% y el anualizado de 2.1% a
   1.8% — el Dashboard ya refleja la revisión, no el dato preliminar). El
   a/a calculado (0.32%) queda algo por debajo del ~0.4% que citan algunos
   agregadores — diferencia normal entre vintages, mismo motivo que la
   lección NZD sobre PIB.

8. **Banqueros del BOJ investigados con la página oficial directa**
   (`boj.or.jp`, accesible — a diferencia de RBNZ). Policy Board de 9
   miembros (Gobernador + 2 Vicegobernadores + 6 miembros), todos votan
   siempre. Se sacó el mandato de cada uno de su página bio oficial
   ("Present Term of Office"), no de un resumen de búsqueda — un resumen
   de WebSearch listaba a "NAKAGAWA Junko" como miembro vigente, pero la
   página oficial no la lista (su mandato terminó jun-2026, reemplazada
   por Ayano Sato). Fotos: Wikimedia Commons tenía a Ueda y Himino, para
   el resto no se buscó en esta primera pasada (quedan con el placeholder
   de iniciales) — si el usuario pide insistir, usar la misma técnica que
   funcionó para RBNZ (buscar la cobertura de prensa del nombramiento y
   revisar el `og:image`).

## Lecciones CHF (mejor proporción de automatización de las no-USD: 9/16)

Agregada el 29-jul-2026, a pedido explícito del usuario ("continuemos con
el CHF"), y confirmada en producción el mismo día ("llevala a
producción") — `/api/chf-sync` corrió contra Supabase real, 9/9
automáticos sin errores.

1. **SNB Data Portal (`data.snb.ch`) tiene una API REST sin key, NO
   bloqueada** (a diferencia de rbnz.govt.nz) — pero no está documentada
   públicamente en ningún lado obvio (`data.snb.ch/en/help_api` es una SPA
   que no expone nada útil sin JS). Se encontró el patrón probando IDs de
   cubo conocidos vía WebSearch (ej. "SNB data portal cube policy rate") y
   confirmando el formato por prueba y error: `data.snb.ch/api/cube/{cubeId}/data/json/en`
   devuelve `{timeseries: [{header: [{dim, dimItem}], metadata, values: [{date, value}]}]}`
   — un mismo cubo puede traer VARIAS series bajo distintos `dimItem`
   (ej. `plkoprex` trae 19 series distintas: índices con y sin cada
   categoría, más las medidas núcleo) — hay que matchear por el texto
   exacto de `dimItem`, no por posición. Fechas vienen `"YYYY-MM"` (sin
   día). También existe un endpoint CSV
   (`data.snb.ch/api/cube/{cubeId}/data/csv/en`) con el mismo contenido en
   formato ancho (una columna por miembro de dimensión) — se prefirió JSON
   por ser más fácil de parsear.

2. **La tasa de política vive en el cubo `snboffzisa`**, dimItem
   "Switzerland - SNB policy rate" (miembro `LZ` internamente). Verificado:
   0.0% para jun-2026, coincide con el comunicado del 18-jun-2026 (el SNB
   la mantiene en 0% desde jun-2025, según Bloomberg espera mantenerla ahí
   hasta fines de 2027).

3. **El CPI general vive en el cubo `plkopr`** (dos series: nivel de
   índice "National index" para derivar m/m, y "Change from the
   corresponding month..." con el a/a ya calculado) — pero se prefirió
   usar el a/a de **`plkoprinfla`** en su lugar (dimItem "SFSO - Inflation
   according to the national consumer price index", miembro `TLK`) porque
   esa serie viene YA redondeada a 1 decimal por el propio SFSO (ej. 0.5,
   0.6, 0.1) mientras que la de `plkopr` es el cálculo crudo sin redondear
   (0.4512 en vez de 0.5) — coinciden en valor pero `plkoprinfla` matchea
   más limpio con lo que reportan los agregadores. Verificado: 0.5% a/a
   para jun-2026, coincide exacto.

4. **"Core CPI" para Suiza = "Kernanflation 1" del SFSO** (Core inflation
   1), NO "ex alimentos y energía" en el sentido usual — es una definición
   propia del SFSO (excluye ciertos bienes/servicios de precio volátil,
   metodología documentada en bfs.admin.ch) que los agregadores (Trading
   Economics, prensa) reportan directamente como "Swiss Core CPI".
   Verificado: 0.3% a/a para jun-2026 (dimItem "SFSO - Core inflation 1",
   miembro `K1` en `plkoprinfla`), coincide EXACTO con "Core CPI increased
   by 0.3% YoY in June" reportado — no hizo falta probar ninguna
   definición alternativa, esta matcheó a la primera. El nivel de índice
   para derivar el m/m vive en un cubo DISTINTO (`plkoprex`, dimItem "Core
   inflation 1") — el mismo concepto tiene nombres de cubo diferentes para
   el nivel vs. la tasa ya calculada, hay que usar los dos.

5. **PIB y Balanza Comercial: SECO expone un feed CSV plano en
   `scheduler.swissdatas.ch`**, encontrado NO por documentación sino
   raspando el HTML de las páginas públicas de `seco.admin.ch` (ej.
   `seco.admin.ch/en/gross-domestic-product` tiene un link directo a
   `scheduler.swissdatas.ch/scheduled/ch-seco-gdp.csv`, con formato
   `structure,type,seas_adj,date,value` y header). El PIB real (fila
   `gdp,real,cssa` — calendario+estacional+eventos deportivos ajustado, la
   convención que SECO destaca en sus comunicados, porque Suiza ajusta por
   eventos deportivos como los Juegos Olímpicos que distorsionan trimestres
   puntuales) se deriva del nivel para t/t y a/a. Verificado: +0.44% t/t
   calculado para Q1-2026 (coincide con "GDP grew by 0.4%" reportado).
   **OJO — misma trampa que la lección JPY #4**: ese mismo feed trae una
   fila `trade_balance` pero es la de cuentas nacionales (bienes+servicios,
   trimestral, ~CHF 15-30bn/trimestre) — NO es la balanza comercial mensual
   de Aduanas (BAZG/Swiss-Impex) que reportan los medios (~CHF 4-6bn/mes,
   solo bienes, ej. CHF 3.8bn en jun-2026). No se encontró un endpoint
   público estable para la cifra mensual de BAZG en esta primera pasada
   (el dominio `gate.bazg.admin.ch` no respondió, y el resto de rutas
   apuntan a I14Y, una plataforma SDMX que no se investigó a fondo por
   tiempo) — `chf_trade_balance` queda manual.

6. **Confianza Empresarial = KOF Economic Barometer** (KOF Swiss Economic
   Institute, ETH Zúrich) — el indicador líder que Trading Economics
   reporta como "Switzerland Business Confidence". El feed viejo
   (`datenservice.kof.ethz.ch/api/v1`, el que aparece en opendata.swiss)
   **está discontinuado** — devuelve un mensaje explícito pidiendo migrar a
   la v2. La v2 (`tsdb-api.kof.ethz.ch/v2/ts?keys=ch.kof.barometer&mime=csv&access_type=public`)
   sí funciona sin key con `access_type=public` (sin ese parámetro pide
   autenticación Keycloak). Verificado: 101.2 calculado para jun-2026,
   coincide exacto con "KOF Barometer... level of 101.2" reportado.
   **CHF es la única divisa no-USD con Confianza Empresarial automatizada**
   (CAD/AUD/NZD/JPY la tienen manual, sin API pública encontrada).

7. **Confianza del Consumidor = índice trimestral de SECO**
   (Konsumentenstimmungsindex), mismo patrón de feed swissdatas.ch
   (encontrado en `seco.admin.ch/en/consumer-sentiment`): serie
   `ks_i62_index_q` (adjustment `csa`), del archivo `ks-q.csv`. Es un
   índice (no una tasa), valores negativos normales (ronda -20 a -40 en
   2024-2026). Verificado: -41.1 calculado para Q2-2026, cerca del "-40"
   que reportó prensa especializada (diferencia normal de
   redondeo/revisión entre vintages, mismo patrón que la lección NZD #7
   sobre PIB). **CHF es también la única divisa no-USD con Confianza del
   Consumidor automatizada.**

8. **Sin fuente automatizable confiable para Desempleo, Cambios en el
   Empleo, Ventas Minoristas ni la Balanza Comercial mensual** — a
   diferencia del resto de los indicadores, donde alguna combinación de
   FRED/API oficial terminó funcionando:
   - **Desempleo**: SECO publica la tasa mensual (definición SECO,
     registrado en RAV) solo vía el dashboard `amstat.ch` (SPA sin API
     descubierta) y PDFs mensuales ("Die Lage auf dem Arbeitsmarkt"). No
     se encontró un dataset en opendata.swiss ni un feed swissdatas.ch
     análogo al de PIB/confianza.
   - El de FRED (`LMUNRRTTCHM156S`, "Registered Unemployment") está
     **discontinuado desde dic-2023** — mismo patrón de "existe pero
     está muerto" que motivó descartar FRED para GBP/CAD.
   - **Ventas Minoristas**: el de FRED (`CHESLRTTO02IXOBSAM`) está
     **discontinuado desde nov-2023**. BFS publica un
     "Detailhandelsumsatzindex" pero no se encontró un endpoint machine-
     readable estable en esta primera pasada (px-web de BFS está vivo —
     confirmado con `pxweb.bfs.admin.ch/api/v1/en` respondiendo 200 — pero
     ubicar la tabla exacta del índice de ventas minoristas dentro de su
     catálogo de cubos quedó pendiente por tiempo).
   - **Balanza Comercial mensual**: ver lección 5 arriba.
   - El de FRED para trade balance (`XTNTVA01CHM667S`) SÍ tiene datos
     recientes pero con **~3 meses de rezago real**: al momento de esta
     sesión (fin de jul-2026) su último dato era abr-2026, cuando ya
     existía en prensa el dato real de jun-2026 (CHF 3.8bn de superávit) —
     mismo patrón de "200 OK pero desactualizado" que la lección GBP/CAD
     sobre no confiar en que "está en FRED" signifique "está vivo".
   - **PMI** (procure.ch) es de una asociación privada sin API pública,
     igual que en el resto de las divisas (ISM/S&P Global para USD,
     S&P Global para el resto).
   Los 6 quedan manuales — no por falta de esfuerzo, sino por límites
   reales de las fuentes disponibles (mismo criterio que NZD).

9. **Banqueros del SNB investigados con la página oficial directa**
   (`snb.ch`, accesible sin bloqueos). El Governing Board decide por
   consenso — no hay comunicado de "voto" individual que trackear, a
   diferencia de la Fed. La página
   `snb.ch/en/the-snb/organisation/history/short-biographies` tiene fotos
   oficiales con `srcset` de múltiples resoluciones para TODO el
   historial del Direktorium (útil para futuras divisas o si algún
   miembro actual cambia) — se usó la variante de 458px de ancho, mismo
   criterio de tamaño que el resto de las fotos autohospedadas del
   proyecto.

## Lecciones CNY (única divisa 100% automática: 13/13, y única sin Tasas/Empleo/Confianza/Banqueros/Score)

Agregada el 29-jul-2026, a pedido explícito del usuario, que la definió
como una divisa **de referencia** ("me sirve de proxi de riesgo") y pidió
específicamente **NO** agregar Bancos Centrales ni Confianza — a
diferencia de toda otra divisa del dashboard. Tampoco se agregó Empleo ni
Score compuesto (no hay hoja DECISIONES para CNY): se interpretó que el
pedido era deliberadamente acotado a Inflación + Crecimiento + "algún otro
que veas conveniente", y no una limitación de tiempo/recursos como en el
resto de las divisas.

1. **La API oficial de la NBS (`data.stats.gov.cn/easyquery.htm`) bloquea
   con un WAF cualquier IP no china** — probado con curl real desde el
   entorno de la sesión: 403 con el body `reason:UrlACL`, con y sin
   headers de navegador. Mismo patrón que rbnz.govt.nz para NZD, pero acá
   es la fuente oficial ENTERA la que está bloqueada, no un endpoint
   puntual. FRED tampoco sirve: prácticamente todas sus series de China
   (CPI, PPI, ventas minoristas, producción industrial, desempleo) están
   **discontinuadas hace años** (ej. CPI mensual corta en abr-2025, PPI en
   dic-2022, ventas minoristas en oct-2023) — mismo patrón de "está pero
   está muerto" que motivó descartar FRED para GBP/CAD/CHF.

2. **Se usó `chinadata.live`, un agregador de terceros (NO oficial) que
   republica datos de la NBS/GACC vía una API JSON simple, sin key,
   estable desde fuera de China** — encontrado por WebSearch, con
   endpoints reverse-engineered documentados parcialmente en
   `chinadata.live/api/docs/` (`/api/v2/datasets` lista los ~337 datasets
   disponibles con su `slug`, frecuencia y rango de fechas; `/api/v2/data/{slug}`
   trae la serie completa). **Es la única divisa del dashboard cuya fuente
   de sync automático principal es un tercero no oficial** — si
   chinadata.live cambia su API o dejara de publicar, hay que revisar esto
   primero (a diferencia del resto de las divisas, no hay un "plan B"
   oficial ya identificado). Se verificaron **las 13 series contra el
   comunicado oficial de la NBS/GACC** (vía WebSearch) para al menos un mes
   reciente antes de confiar en la fuente — las 13 coincidieron exacto o
   con el margen de imprecisión esperado (ver punto 3).

3. **China NO publica un índice de nivel para CPI/PPI como el resto de los
   países — solo series de "% de cambio" ya calculadas.** El PPI trae
   ambas (m/m y a/a) como series directas. El CPI headline **solo trae el
   m/m** (`china-cpi-mom`) — no hay una serie a/a mensual directa en esta
   fuente (solo una anual, un punto por año, inútil para un gráfico
   mensual). `cny_cpi_yoy` se deriva encadenando los 12 valores de m/m más
   recientes en un índice sintético (nivel base arbitrario 100, se
   multiplica mes a mes por `1 + m/m%`) y comparando contra 12 meses
   atrás — la razón (ratio) no depende de la base elegida, solo de los 12
   pasos intermedios. Esto introduce un margen de imprecisión real de
   ~0.1-0.2pp frente a la cifra oficial ya redondeada por la NBS
   (verificado: 1.4% calculado vs. 1.2% oficial para mayo-2026, 1.3% vs.
   1.2% para abril-2026) — viene de encadenar 12 tasas que la NBS YA
   redondeó a 1 decimal antes de publicarlas, no es un error de signo ni
   de definición. Documentado explícitamente en la descripción del
   indicador para que quede visible en la UI, no solo acá.

4. **Ventas Minoristas y Producción Industrial tienen un hueco real cada
   enero-febrero, TODOS los años** — China solo publica un dato combinado
   "enero-febrero" (para no distorsionar por el Año Nuevo Chino, que se
   mueve de fecha en el calendario gregoriano) y `chinadata.live`
   directamente OMITE ese combinado de la serie mensual estándar: el
   primer punto de cada año es MARZO, y es el dato de **marzo standalone**
   (verificado: el valor de "2026-03" en `china-retail-sales-yoy` es 1.7%,
   que coincide con "retail sales rose 1.7% in March" reportado — NO con
   el 2.8% que Xinhua reportó para "Jan-Feb 2026" por separado, un dato
   que no está en absoluto en esta serie). Es un hueco real en el
   gráfico, no un error de mi parte ni algo para rellenar con
   interpolación falsa (mismo principio que la lección AUD #16 de no
   fabricar continuidad falsa).

5. **Inversión en Activos Fijos (FAI) es distinta: SÍ aparece en
   febrero**, porque China la reporta como acumulado año-a-la-fecha
   (YTD), nunca como variación de un solo mes — el valor de febrero YA ES
   el acumulado enero-febrero (verificado: 1.8% para 2026, coincide exacto
   con el comunicado oficial de la NBS), el de marzo es el acumulado
   enero-marzo, etc. Se eligió este indicador como "el otro que veas
   conveniente" porque es la tercera pata del mismo paquete mensual de
   datos que la NBS publica junto con Ventas Minoristas y Producción
   Industrial (los tres siempre salen el mismo día) — no una elección
   arbitraria.

6. **PMI**: se usaron los 3 índices OFICIALES de la NBS (Manufacturero, No
   Manufacturero —cubre servicios y construcción—, Compuesto), todos
   verificados exactos contra el comunicado de jun-2026 (50.3/50.2/50.6).
   El PMI de Caixin/S&P Global (la encuesta privada, seguida en paralelo
   por mercados FX porque a veces diverge de la oficial) no tiene API
   gratuita en `chinadata.live` ni se buscó en otro lado por tiempo —
   queda completamente fuera (ni siquiera como indicador manual, a
   diferencia del resto de las divisas, porque el usuario pidió no agregar
   de más).

7. **PIB**: `china-gdp-growth-qoq` da el t/t YA desestacionalizado directo
   — China SÍ publica esta serie (contra la creencia común de que solo
   reporta a/a), verificado +1.3% para Q1-2026. El a/a sale de
   `china-gdp-index` (base 100 = mismo trimestre del año anterior, ya
   calculado por la NBS, no hay que derivar de un nivel real como en
   AUD/JPY/NZD) — verificado +5.0% para Q1-2026.

8. **Balanza Comercial**: `china-trade-monthly` da el balance ya en USD
   millones (exportaciones menos importaciones, base aduanera GACC),
   coincide exacto con lo reportado (superávit de USD 105.43bn en
   mayo-2026). Esta serie de `chinadata.live` solo tiene historia desde
   2023 (a diferencia del resto de los indicadores CNY, que tienen
   décadas) — limitación real de la fuente, no del indicador.

9. **`chinadata.live` no actualiza todos sus datasets al mismo ritmo — y el
   lag puede ser bastante más largo de lo esperado.** Al momento de agregar
   CNY (29-jul-2026), su serie de PMI ya tenía el dato de jun-2026, pero
   CPI/PPI/Ventas Minoristas/Producción Industrial/Inversión en Activos
   Fijos/PIB/Balanza Comercial seguían solo hasta mayo-2026 (o Q1-2026
   para PIB). **El usuario avisó el 30-jul-2026 que Inflación seguía en
   mayo** — se volvió a chequear la fuente y **seguía exactamente igual**
   (ningún dataset salvo PMI había avanzado), pese a que la NBS ya había
   publicado los datos de junio/Q2 el 10 al 17-jul-2026 (confirmado
   leyendo directo los comunicados de `stats.gov.cn/english/PressRelease/`,
   que SÍ son accesibles aunque la API de consulta `data.stats.gov.cn` esté
   bloqueada). **Se corrigieron los 10 indicadores afectados a mano**,
   pusheando el punto de jun-2026/Q2-2026 directo a Supabase producción
   (vía REST, upsert) y a `historical-series.json`, con los valores
   verificados palabra por palabra contra los comunicados oficiales:
   CPI m/m -0.3%, CPI a/a +1.0%, PPI m/m -0.3%, PPI a/a +4.1%, Ventas
   Minoristas a/a +1.0%, Producción Industrial a/a +5.3%, Inversión en
   Activos Fijos (acum. ene-jun) -5.7%, PIB t/t (Q2) +0.9%, PIB a/a (Q2)
   +4.3%, Balanza Comercial jun-2026 USD 125.63bn de superávit (exportaciones
   USD 412.39bn, importaciones USD 286.76bn). **Lección para el futuro**:
   `chinadata.live` puede quedarse atrás por semanas en CASI TODOS sus
   datasets a la vez (no es solo una serie aislada) — cuando el usuario
   reporte un dato viejo, **no asumir que es solo ese indicador**: chequear
   los 13 de una sola vez contra la fuente (`/api/v2/data/{slug}`) y
   comparar contra `stats.gov.cn/english/PressRelease/` (que lista todos
   los comunicados recientes con sus URLs) antes de corregir uno por uno.
   Si esto se repite seguido, considerar buscar una fuente más confiable
   para CPI/PPI/Crecimiento (dejando `chinadata.live` solo para PMI, que sí
   se mantuvo al día) o agregar un scraper directo de los comunicados de
   `stats.gov.cn` (accesible, a diferencia de la API de consulta) como
   fallback.

10. **Cambios estructurales en el resto de la app para soportar una
    divisa sin todas las secciones** (no específico de CNY, reutilizable):
    `Layout.tsx` (`navFor`) ahora oculta el link de Tasas/Empleo/Confianza
    si `indicatorsBySection(sección, currency).length === 0`, y el de
    Banqueros si `bankersForCurrency(currency).length === 0`.
    `Dashboard.tsx` ahora filtra las secciones vacías antes de
    renderizarlas y NO muestra `ScorePanel` si no hay `scoreRows` para la
    divisa (antes mostraba un panel roto con "rango −0 a +0"). Estos
    cambios son genéricos — cualquier divisa futura con secciones
    incompletas se beneficia automáticamente, sin tocar código de nuevo.

## Pendiente explícito

**CHF ya está implementada y en producción** (ver "Indicadores actuales
por divisa" y "Lecciones CHF" arriba) — no queda pendiente ninguna divisa
del set original. El Excel compartido con hojas
`CAD | JPY | AUD | CHF | NZD | DECISIONES`
(formato snapshot estilo Trading Economics, **datos de 2025,
desactualizados**) se usó solo para identificar indicadores y pesos del
score — histórico y valor actual se reconstruyeron desde la fuente
oficial de cada país, verificando cada serie contra una referencia real
(comunicado oficial Y agregador de mercado, ver lección CAD #6-7 arriba)
antes de automatizar. Las columnas CAD/JPY/AUD/NZD/CHF de la tabla
DECISIONES de abajo ya se usaron todas (ver "Lecciones CHF" arriba para
el detalle de CHF) — se dejan en la tabla solo como referencia histórica
de dónde salió cada valoración.

**Datos crudos ya capturados (para no tener que pedir las imágenes de
nuevo)**:

Hoja DECISIONES (columna = divisa, fila = indicador, valoración manual del
usuario; pesos entre paréntesis):
| Indicador | CAD | JPY | AUD | CHF | NZD | Peso |
|---|---|---|---|---|---|---|
| Inflación | 2 | -2 | 2 | -2 | 4 | Máx(4)/Mín(-4) |
| Tasa de Desempleo | 1 | 1 | -1 | 1 | 0 | Máx(2)/Mín(-2) |
| Cambios en el Empleo | 2 | 2 | 1 | 0 | 0 | Máx(2)/Mín(-2) |
| PMI Manufactura | 2 | 2 | 1 | 2 | -2 | Máx(2)/Mín(-2) |
| PMI de Servicios | -1 | 0 | 0 | 2 | 0 | Máx(2)/Mín(-2) |
| Ventas Minoristas | 1 | 1 | 2 | 0 | 0 | Máx(2)/Mín(-2) |
| Confianza Empresarial | 0.5 | 1 | -0.5 | 0.5 | 0 | Máx(1)/Mín(-1) |
| Confianza del Consumidor | 0 | -1 | -2 | -1 | -2 | Máx(2)/Mín(-2) |
| PIB | -3 | 0 | 1.5 | 0 | 1.5 | Máx(3)/Mín(-3) |
| Tipos de Interés (fila NO usable — corrupta, ver lección #12) | 22.5 | 0.5 | 3.6 | 0 | 22.5 | — |
| **TOTAL Excel** (referencia solamente, no vamos a replicarlo exacto por el bug de rango del `<select>`) | 4.5 | 4 | 4 | 2.5 | 1.5 | — |

Recordar (lección #3): al armar `scoreSeedChf.ts`, redondear cualquier
valoración fuera de -2..2 antes de cargarla, siempre hacia afuera del cero
(ej. CAD PIB=-3 se redondeó a -2; AUD Confianza Empresarial -0.5→-1, PIB
1.5→2; NZD Inflación 4→2, PIB 1.5→2; JPY no necesitó reescalar nada, ver
scoreSeedNzd.ts/scoreSeedJpy.ts).

Cada hoja individual (JPY/CHF/NZD) tiene la misma estructura de columnas
que CAD (Reciente/Anterior/Más Alto/Más Bajo/Fecha) con estas filas: Stock
Market, GDP Growth Rate, GDP Annual Growth Rate, Inflation Rate MoM,
Inflation Rate, Unemployment Rate, Employment Change, Retail Sales MoM,
Manufacturing PMI, Services PMI, Business Confidence, Consumer Confidence,
Interest Rate, Government Budget, Balance of Trade, Current Account,
Current Account to GDP, Government Debt to GDP, Corporate Tax Rate,
Personal Income Tax Rate. **Mismo criterio que CAD/AUD/NZD/JPY**: solo se
implementan como indicadores los que están en el score + Balanza Comercial
+ PIB (pedido explícito del usuario) + la tasa del banco central — no
Stock Market/impuestos/deuda.

Investigación de fuentes por país (de una sesión previa a GBP, **repetir el
proceso de verificación con cada una, no asumir que sigue vigente** — GBP,
CAD, AUD y RBNZ ya mostraron que las APIs cambian, se discontinúan sin
aviso claro, o que la convención asumida estaba mal):
- **CAD** → hecho, ver arriba (StatCan WDS + BoC Valet).
- **AUD** → hecho en esta sesión, ver arriba (ABS Data API SDMX + CSV del
  RBA — la "ABS Indicator API" con key por email NO hizo falta, existe una
  alternativa sin key).
- **CHF** → hecho en la sesión del 29-jul-2026, ver "Lecciones CHF" arriba
  (SNB Data Portal + feed CSV de SECO vía scheduler.swissdatas.ch + KOF
  Barometer API v2, todo sin key — data.snb.ch NO está bloqueado, a
  diferencia de rbnz.govt.nz).
- **JPY** → hecho en la sesión del 21-jul-2026, ver "Lecciones JPY" arriba
  (e-Stat Dashboard API + CSV del BOJ + CSV de Aduanas de Japón, todo sin
  key — boj.or.jp NO está bloqueado, a diferencia de rbnz.govt.nz).
- **NZD** → hecho en la sesión del 21-jul-2026, ver "Lecciones NZD" arriba
  (Stats NZ CSV por release, sin key — RBNZ bloqueado por completo).

**Bancos centrales**: los 8 principales de este dashboard (Fed, BCE, BoE,
BoC, RBA, RBNZ, BOJ, SNB) ya están investigados y cargados — no queda
ninguno pendiente por ahora.

**Previsión de tasas estilo FedWatch** — sigue sin solución gratuita para
ninguna divisa no-USD (ver handoffs previos para el detalle de por qué se
descartó CME FedWatch/rateprobability.com) — se omite el panel para
GBP/CAD/AUD/NZD/JPY/CHF.

## Sección Titulares + identidad de marca (sesión 31-jul-2026)

**Titulares** (`/titulares`, global — no depende de la divisa seleccionada,
por eso está en `navFor` antes del `if` de secciones): tarjetas con badge
rojo/naranja/gris (alto/medio/bajo, ver `src/lib/impact.ts`), carga manual
con tags obligatorios (qué divisa/activo afecta — es el filtro de
relevancia), botón "Fijar" (`pinned`, pensado para una futura cinta
corrediza del Panel de Control, **todavía no construido**). Tabla nueva
`headlines` en Supabase (`supabase/schema.sql`), RLS igual al resto.
`api/headlines-sync.ts` trae el calendario económico de Forex Factory (JSON
público, sin key) + noticias de Finnhub categoría `forex` (necesita
`FINNHUB_API_KEY` en Vercel — **el usuario todavía no la cargó**; sin ella
el sync solo trae el calendario, no rompe nada). Ambas fuentes se filtran a
G10 (USD/EUR/GBP/JPY/CHF/CAD/AUD/NZD/SEK/NOK) + CNY + bonos/renta variable
antes de guardarse — Finnhub se clasifica por palabras clave (ver
`HIGH_IMPACT_KEYWORDS`/`CURRENCY_KEYWORDS` en el sync), no viene
preclasificado como Forex Factory.

**Logo/marca de marca (Hikman Capital)**: el usuario subió un PNG generado
por IA (mockup de papel, 6.6MB, con sombra/textura) directo por la UI web
de GitHub a `public/`. Se procesó en esta sesión y el archivo crudo **se
borró** (no vale la pena mantenerlo — ver git history si hace falta
reprocesar desde cero). Quedan 3 assets finales en `public/`:
- `logo-icon.png` — el monograma "HC" solo, fondo transparente, usado en
  el header (`Layout.tsx`, ~28px alto) y como base de la marca de agua.
- `logo-full.png` — el monograma + "HIKMAN CAPITAL" en texto, fondo
  transparente, sin uso todavía (candidato para una portada/login si se
  agrega en el futuro).
- `favicon.png` — el ícono centrado en un canvas cuadrado 512×512, reemplazó
  a `favicon.svg` (genérico, ya borrado) en `index.html`.

El PNG original no tenía transparencia real (era un mockup con fondo
"papel" casi blanco). La transparencia se logró con un umbral de
saturación HSV en Python/Pillow (fondo = baja saturación + alto brillo →
alpha 0), **no** con una herramienta de remoción de fondo — anotarlo por
si hace falta repetir el proceso con un logo nuevo: `s = (max-min)/max` en
HSV, `alpha = clip((s - 0.06) / (0.18 - 0.06), 0, 1)`. Funcionó limpio en
este logo (colores saturados navy/dorado/rojo/amarillo contra fondo casi
blanco) — no asumir que funciona igual de bien con un logo de paleta más
apagada.

**Gotcha de CSS encontrado al integrar la marca de agua** (`Layout.tsx`):
el `<div>` raíz tiene `background: var(--page)` inline y `position:
relative` pero sin `z-index` propio — eso NO crea un contexto de
apilamiento nuevo. Sin contexto propio, un hijo `fixed` con z-index
negativo (la marca de agua) se compara en el contexto RAÍZ del documento,
donde el propio `<div>` (positioned, z-index:auto) pinta **después** que
sus hijos con z-index negativo — el fondo del `<div>` tapaba la marca de
agua por completo. Se arregló agregando la clase `isolate` al `<div>` raíz
(fuerza un contexto de apilamiento propio sin tocar z-index). Si se agrega
otro elemento `fixed`/`absolute` con z-index en el futuro, tenerlo en
cuenta.

**Pendiente**: `FINNHUB_API_KEY` sin configurar en Vercel (ver sección de
Titulares arriba). El Panel de Control en sí ya se construyó, ver sección
siguiente.

## Panel de Control (sesión 31-jul-2026)

Nueva página global `/panel-control` (no depende de la divisa seleccionada,
por eso está primera en `navFor` en `Layout.tsx`). Cuatro piezas:

**Cinta corrediza** (`MarqueeTicker.tsx`): arranca con "HIKMAN CAPITAL" y
sigue con los titulares que tengan `pinned=true` (fijados desde Titulares).
Loop infinito con `@keyframes marquee-scroll` en `index.css` (duplica el
contenido una vez y anima `translateX(-50%)` para que no se note el reinicio;
respeta `prefers-reduced-motion`). La duración se escala con la cantidad de
titulares (`Math.max(24, items.length * 7)` segundos) para que la velocidad
no varíe mucho con pocos o muchos titulares.

**Panel de indicadores de mercado: se intentó y se sacó (misma sesión,
31-jul-2026)**. Historial completo por si algún día se retoma — **no
volver a probarlo con widgets de TradingView, ya se descartó**:

1. Widget "Single Ticker" de TradingView: el usuario vio "This symbol is
   only available on TradingView" para rendimientos de bonos y futuros.
2. Widget "Market Overview" con pestañas: mejoró (símbolos confirmados
   reales por afuera con `WebFetch`) pero ocultaba la columna de precio en
   anchos angostos (celular).
3. Widget "Symbol Overview" (uno por símbolo): el usuario seguía sin ver
   el precio, sin poder confirmar la causa exacta desde este sandbox.
4. Se abandonó TradingView del todo. Se armó `api/market-quotes.ts`
   (función serverless propia) combinando FRED (rendimientos 10Y — 7
   series de la OCDE, confirmadas reales una por una), Frankfurter.app
   (divisas spot, gratis sin key) y Finnhub `/quote` (acciones/ETF) — con
   `MarketIndicatorsPanel.tsx` renderizando tarjetas propias en vez de
   iframes. Recién desplegado, sin feedback todavía del usuario sobre si
   los números aparecían bien.
5. **El usuario decidió abortar la sección entera** ("no me gusta como
   está quedando") antes de llegar a validar el punto 4 — se borraron
   `MarketIndicatorsPanel.tsx`, `marketIndicators.ts` y
   `api/market-quotes.ts`, y se sacó la columna del layout de
   `PanelControl.tsx` (quedó en dos columnas: menú de informes a la
   izquierda + sesgo por divisa/mentor al centro, sin la columna derecha).

Si en el futuro se pide retomar esto: la parte de FRED (rendimientos 10Y)
y Frankfurter (divisas) quedó verificada y probablemente sea la más sólida
para arrancar de nuevo; evitar iframes de TradingView directamente, mejor
construir la UI propia desde el principio.

**Sesgo por Divisa** (`CurrencyBiasCard.tsx`, tipos `CurrencyBias`/
`BiasSnapshot`/`BiasReason` en `types.ts`, tabla `currency_bias` +
`currency_bias_reasons`): badge grande (Hawkish/Neutro Alcista/Neutro/Neutro
Bajista/Dovish) editable manualmente en cualquier momento vía
`updateBiasLevel` — **no** está atado al botón de actualizar semanal, el
usuario pidió explícitamente poder cambiarlo entre semana si un dato mueve
el sentimiento. El botón "⟳ Actualizar sesgo" (`rolloverBias`) es el
rollover semanal: congela los motivos de la semana en curso en
`currency_bias.previous_reasons` (jsonb, copia estática) junto con
nivel/resumen/fecha de inicio como "Anterior", y arranca
`current_started_at` de nuevo con motivos vacíos — el nivel del badge se
mantiene igual al momento del rollover (no se resetea a null), solo el
usuario lo cambia después si corresponde. Confirmación con `window.confirm`
antes de ejecutar (borra `currency_bias_reasons` de esa divisa en Supabase,
ya están congelados en `previous_reasons` así que no se pierde nada, pero es
irreversible desde la UI).

Motivos de la semana ("nombre del dato + color bueno/malo/neutral", no
anterior/previsión/actual): se cargan a mano desde la tarjeta
(`addBiasReason`/`removeBiasReason`) o se fijan desde un titular en Titulares
con el nuevo selector "Fijar a divisa…" en `HeadlineCard.tsx`
(`setHeadlineBiasCurrency` en `MacroDataContext.tsx`). Fijar un titular a una
divisa **siempre** fuerza `pinned=true` (aparece también en la cinta, pedido
explícito del usuario) y crea un motivo con `headlineId` vinculado
(color `neutral` por defecto — el titular no trae un color de resultado
propio, el usuario lo puede editar borrando y recargando, no hay edición
inline de color todavía). Desfijar de la divisa (volver el select a vacío)
borra ese motivo vinculado pero **no** desfija de la cinta — son dos cosas
independientes una vez fijado, tal como pidió el usuario. `Headline` ganó el
campo `biasCurrency?: Currency` (columna `bias_currency` en `headlines`,
migración `alter table ... add column if not exists` para proyectos que ya
tenían la tabla).

Datos base (banco central, tasa, próxima reunión): editable inline
(`updateBiasBase`) — no hay fuente automática de "próxima reunión" para
divisas no-USD (solo existe `fomcMeetings.ts` para la Fed), así que es 100%
manual para las 9 divisas. `CENTRAL_BANK_BY_CURRENCY` en `lib/bias.ts` da el
nombre del banco central por defecto al crear el registro.

**Informes económicos y resúmenes del mentor** (`DocumentUploadList.tsx`,
reutilizado dos veces en `PanelControl.tsx` con tablas separadas `reports` y
`mentor_notes` — mismo shape `DocumentEntry`): texto y/o archivo (PDF/imagen)
por entrada, el usuario pidió ambos. El archivo sube al bucket de Storage
`documents` (`uploadDocumentFile` en `MacroDataContext.tsx`, `public: true`
— mismo criterio de seguridad que el resto del proyecto). La carga de
archivo se deshabilita en modo local (`syncMode !== 'cloud'`) porque no hay
backend donde guardarlo — el texto sigue funcionando sin Supabase.

**Pendiente de correr en Supabase**: el `supabase/schema.sql` completo
(tablas nuevas `currency_bias`, `currency_bias_reasons`, `reports`,
`mentor_notes`, columna `bias_currency` en `headlines`, bucket `documents`)
todavía no se corrió contra la base real — avisar al usuario que tiene que
pegarlo en el SQL Editor de Supabase antes de que el Panel de Control
sincronice en la nube (mientras tanto cae a `localStorage`, que ya se probó
funciona end-to-end: fijar titular a divisa → aparece en la cinta y como
motivo con 📌).

**Lección real (post-merge, 31-jul-2026)**: el usuario corrió el schema
completo y le dio `ERROR: 42710: policy "public read/write
indicator_overrides" for table "indicator_overrides" already exists`.
`create policy` (a diferencia de `create table`) **no soporta** `if not
exists` en Postgres, así que un archivo que crece con cada sesión y se
vuelve a pegar entero rompe apenas tiene una sola política repetida. Se
arregló agregando `drop policy if exists "..." on tabla;` antes de cada
`create policy` (las 10 de tablas + las 3 de `storage.objects`) — dejarlo
así de acá en adelante para cualquier política nueva que se agregue.

No pude probar visualmente los widgets de TradingView ni el flujo de subida
de archivos a Storage en esta sesión (sandbox sin Supabase configurado y con
`s3.tradingview.com` bloqueado) — sí se probó con Playwright en modo local
que la cinta, las tarjetas de sesgo, el fijado de titulares y el resto de
las páginas existentes (Resumen, Titulares) no tienen regresiones.

### Bugs reales encontrados por el usuario tras el deploy (mismo día)

**"No me deja escribir ni agregar motivos en Sesgo"** — bug real, no de
percepción. Todas las funciones nuevas de `MacroDataContext.tsx`
(`updateBiasSummary`, `addBiasReason`, etc., y las de `reports`/
`mentor_notes`) hacían `await supabase...` **antes** de llamar a
`setBiases`/`setReports`/etc. Con un `<textarea>`/`<input>` controlado
atado directo a ese estado, cada tecla dispara un viaje de red completo
antes de que el valor se actualice — si Supabase tarda, se siente
"trabado"; si la llamada falla (política RLS, tabla sin migrar, lo que
sea), el estado local nunca se actualiza y **no se puede escribir nada,
nunca**, sin importar cuánto se reintente. Se arregló invirtiendo el orden
en las 11 funciones nuevas: primero `setState` (síncrono), después el
`await` a Supabase envuelto en `try/catch` (no bloquea ni rompe la UI si
falla, solo lo deja en consola). **Lección para el futuro**: cualquier
función nueva que alimente un campo de texto controlado (no un botón de
un solo click) tiene que actualizar el estado local primero — el patrón
viejo de "esperar a Supabase antes de tocar el estado" que ya existía en
`addPoint`/`toggleHeadlinePin`/etc. funciona para clicks pero es una
trampa para inputs de texto.

**Widgets de TradingView, y por qué la sección terminó borrada**: ver el
historial completo (4 vueltas: Single Ticker → Market Overview → Symbol
Overview → API propia con FRED/Frankfurter/Finnhub → el usuario pidió
abortar la sección entera) en "Panel de indicadores de mercado: se intentó
y se sacó" más arriba, en la sección `## Panel de Control`. Series de FRED
verificadas ahí por si se retoma: `IRLTLT01{NZ,DE,AU,GB,CA,JP}M156N` +
`WGS10YR` (US) para rendimientos 10Y; `api.frankfurter.dev/v1/latest` para
divisas spot, sin key.

**Nota sobre por qué `s3.tradingview.com` y
`symbol-search.tradingview.com` están bloqueados en este sandbox pero
`tradingview.com` (la página normal) no**: el proxy del entorno da
`ERR_CONNECTION_RESET` en el primero (probablemente bloqueo por dominio/CDN)
y `403 Forbidden` de nginx en el segundo (probablemente bloqueo por
user-agent o por ser una API, no una página). `WebFetch` sí llega porque
corre por la infraestructura de Anthropic, no por el proxy local de este
contenedor — usarlo como alternativa la próxima vez que haga falta
verificar algo de una fuente externa bloqueada acá.

**Pedido de UI**: los 5 botones de sesgo (Hawkish/Neutro Alcista/.../Dovish)
ocupaban mucho lugar mostrados todos juntos — se colapsaron a un solo badge
con el nivel actual que despliega la lista al tocarlo (`CurrencyBiasCard.tsx`,
`levelPickerOpen` + click-outside con `useRef`/`useEffect`).

## Migración del sistema anterior (Excel, sesión 31-jul-2026)

El usuario subió `HIKMAN CAPITAL SISTEMA 2.0.xlsx` — la planilla donde
llevaba manualmente todo esto antes del dashboard (hojas `SESGOS`,
`MOTIVOS`, `TITULARES`, `DATOS_ECO`, más `CUENTAS`/`NOTAS`/`REPORTES`/
`TRADES`/`BANCOS`/`ORADORES` que no se usaron acá). Pidió cargar el sesgo,
los titulares y los indicadores económicos manuales ya registrados.

**Antes de migrar, dos cambios de modelo** (la planilla real resultó más
rica de lo que se había construido, ver arriba "Ampliar modelo de Sesgo"):
1. `CurrencyBias.previous` (una sola semana atrás) → `history: BiasSnapshot[]`
   (lista completa, sin límite) — la hoja `SESGOS` tenía 5-6 semanas
   archivadas por divisa, no solo una. Tabla nueva `currency_bias_history`
   en `schema.sql` (con migración `alter table currency_bias drop column
   previous_*` para el proyecto que ya estaba en producción).
2. `BiasReason.color` pasó de `'good'|'bad'|'neutral'` a `BiasLevel` (los
   mismos 5 niveles que el sesgo grande) — la hoja `MOTIVOS` usa esa
   escala real (`TONO`: HAWKISH/DOVISH/NEUTRO/NEUTRO ALCISTA/NEUTRO
   BAJISTA), no bueno/malo/neutral. Migración de datos en `schema.sql`
   (`update currency_bias_reasons set color = case ... end`) por si ya
   había motivos cargados en producción con la escala vieja.

**El SQL de importación quedó en `supabase/import_excel_2026-07-31.sql`**
(180 inserts: 8 `currency_bias` + 32 `currency_bias_history` + 26
`currency_bias_reasons` + 55 `headlines` + 59 `indicator_overrides`) — se
generó con scripts de Python ad-hoc (ya borrados, no quedaron en el repo,
esto es la única documentación de las decisiones de mapeo). **Correr
DESPUÉS de `schema.sql`** (necesita `currency_bias_history` y el
constraint nuevo de `currency_bias_reasons.color`).

Decisiones de mapeo importantes (para no tener que re-derivarlas si hace
falta ajustar algo):

- **SESGOS**: se filtró `ACTIVO=True` (40 de 41 filas). Por divisa, la
  fila con `SEMANA` más reciente pasó a ser la semana actual
  (`currency_bias`); el resto quedó en `currency_bias_history`. Dos
  niveles de sesgo ambiguos en el texto original se interpretaron a mano:
  `'NEUTRAL DOVISH'` (EUR) → `dovish`, `'NEUTRAL (HAWKISH)'` (JPY) →
  `hawkish` — revisar si el usuario quiso decir otra cosa.
- **MOTIVOS**: se filtró `ACTIVO=True` (32 de 59 filas — el resto eran
  correcciones/duplicados que el usuario mismo desactivó). Se
  emparejaron con la semana de `SESGOS` de la misma divisa más cercana en
  fecha (tolerancia 3 días — `MOTIVOS.SEMANA` usa lunes y `SESGOS.SEMANA`
  a veces domingo para la misma semana real, no calzan exacto). Cuando una
  semana de `SESGOS` no tenía motivos estructurados en `MOTIVOS`, se
  usó como respaldo el texto libre de `SESGOS.MOTIVOS` partido por guiones,
  con el color = el nivel de sesgo de esa semana (no hay tono por ítem en
  el texto libre, es la mejor aproximación disponible).
- **TITULARES**: se filtró `ACTIVO=True` (55 de 154). La hoja no tiene
  columna de fuente/`source` — se usó el texto genérico "Hikman Capital
  (importado del sistema anterior)". 12 de las 55 no tenían `IMPACTO`
  cargado — se les puso `bajo` por defecto. `DIVISAS` (texto libre, ej.
  "MEDIO ORIENTE", "SP500") se cargó tal cual en `tags`, sin validarlo
  contra ninguna lista fija.
- **DATOS_ECO**: de 265 filas activas, solo se importaron **59** — las que
  matchean contra un indicador de carga manual real del catálogo
  (`src/data/indicators*.ts`, cruzado contra los ids que sí sincronizan
  por API en `api/*-sync.ts`). El resto (**206 filas**) se descartó a
  propósito, la mayoría porque:
  - Ya sincronizan solas por API (CPI/PPI/GDP/empleo/ventas minoristas de
    casi todas las divisas) — importarlas hubiera pisado datos correctos
    de FRED/ABS/StatCan/etc. con una transcripción manual.
  - No tienen ningún indicador equivalente en el dashboard (ej. componentes
    del PCE, balance fiscal, datos por país dentro de la Eurozona como
    Alemania/Francia/Italia — el catálogo de EUR es solo a nivel Eurozona).
  - Ambigüedad de unidades que no se quiso arriesgar a importar mal: el
    "Confianza del Consumidor Westpac" de AUD traía un % de variación en
    vez del nivel del índice; "Cambios en el Empleo" de NZD traía un % en
    vez de miles de personas — se dejaron sin cargar en vez de adivinar.
  - Series con nombre parecido pero que son otra cosa: BSI del BOJ ≠
    Tankan (`jpy_business_confidence` es específicamente Tankan grandes
    manufactureras); "EXPECTATIVAS DE NEGOCIO" de NAB (AUD) ≠ "Confianza
    Empresarial" NAB; dos filas de "BALANZA COMERCIAL" bajo NZD con
    magnitudes absurdamente distintas (800M vs 723.98B) — la segunda es
    casi seguro de China, mal etiquetada como NZD, se descartó.
  - `eur_business_confidence` se completó con el IFO alemán (`CONFIANZA
    EMPRESARIAL IFO`) a falta de algo mejor — el catálogo dice
    "confianza industrial de la Eurozona" (podría ser el ESI de la
    Comisión Europea, un dato distinto) — **revisar si esto es lo que el
    usuario quería** o si prefiere dejarlo vacío.
  - Parseo de valores: porcentajes con coma decimal (`"2,8%"` → `0.028`),
    sufijos K/M/B (`"98K"` → `98000`, `"3,098B"` → `3098` en millones para
    formato `trade`) — todos los 59 valores parsearon sin error, se
    imprimió cada `raw → stored` para revisar a ojo antes de generar el
    SQL final.

**Todavía no se corrió `import_excel_2026-07-31.sql` contra Supabase real**
— avisarle al usuario que lo pegue en el SQL Editor después de `schema.sql`,
y que revise sobre todo los dos niveles de sesgo ambiguos y el matcheo de
`eur_business_confidence` con IFO.

**Actualización — el usuario ya corrió el SQL y confirmó que todo quedó
bien, pero pidió 3 correcciones** (mismo día):

1. **Los dos niveles ambiguos estaban mal**: "NEUTRAL DOVISH" y "NEUTRAL
   (HAWKISH)" no son sinónimos de "DOVISH"/"HAWKISH" — son justo los
   matices intermedios que ya existen en la escala (`neutral_bajista` /
   `neutral_alcista`). Los había mapeado mal a los extremos.
2. **"Confianza Empresarial" del EUR SÍ importa** (confirmado por el
   usuario) — pero el dato que tenía cargado (IFO alemán) es
   específicamente de Alemania, no de la Eurozona agregada.
3. **Pidió las economías internas de Alemania y Francia** como
   indicadores propios, no solo el agregado de Eurozona.

Se agregaron **18 indicadores nuevos** a `indicatorsEur.ts` (todos
`currency: 'EUR'`, prefijo `eur_de_`/`eur_fr_`): CPI/HICP m/m y a/a,
ventas minoristas, producción industrial, pedidos de fábrica, PMI
manufactura, ZEW, IFO (clima empresarial + expectativas, como dos
indicadores separados) y GfK para Alemania; CPI/HICP m/m y a/a + PMI
manufactura para Francia.

`supabase/import_excel_fixup_2026-07-31.sql` (correr DESPUÉS del import
original) hace 4 cosas: corrige los 2 niveles de sesgo en
`currency_bias_history`; carga 2 indicadores eurozone-wide que se habían
pasado por alto en la primera pasada (`eur_wage_yoy`, `eur_labor_cost_yoy`
— estaban archivados bajo la categoría "ALEMANIA" del sheet pero el texto
decía "ZONA EUR", error mío no haberlos visto la primera vez); saca el
dato de IFO de `eur_business_confidence` (queda sin dato hasta que
aparezca una fuente eurozone-wide real — no forzar el IFO alemán ahí de
nuevo); carga los 15 puntos de dato de Alemania/Francia disponibles en el
sheet en los indicadores nuevos.

**Nota de parseo**: `FRENCH CPI Y/Y JUN` y `FRENCH HICP Y/Y` en el sheet
tenían el valor `"0.03"` sin signo `%` (a diferencia del resto de la
planilla, que siempre usa `%`) — se interpretó como 3% directo (0.03 ya
es la fracción a guardar), no como 0.03%. Si el usuario confirma que el
dato real era otro, corregirlo a mano desde "Actualizar Datos".

No pude probar el fixup contra Supabase real (mismo motivo de siempre,
sandbox sin las keys) — sí verifiqué que las tarjetas nuevas renderizan
bien en `/inflacion` de EUR en modo local (título, fuente, estado "sin
datos" antes de cargar el SQL).

**Actualización — pestañas propias por país**: el usuario pidió que
Alemania/Francia queden separados en sus propias secciones de nav, "así
como Empleo/Crecimiento/Inflación", en vez de mezclados dentro de esas
páginas agregadas. Se agregó `IndicatorMeta.country?: 'DE' | 'FR'`
(`types.ts`), marcado en los 18 indicadores nuevos de `indicatorsEur.ts`.
`indicatorsBySection()` (`indicators.ts`) ahora excluye todo lo que tenga
`country` seteado — así `/inflacion`, `/crecimiento`, `/confianza` de EUR
quedan de nuevo puramente a nivel Eurozona. Función nueva
`indicatorsByCountry(country, currency)` + página genérica
`CountryPage.tsx` (agrupa por sección igual que `Dashboard.tsx`, reusa
`ChartCard`) con dos wrappers finitos `Alemania.tsx`/`Francia.tsx` — mismo
patrón que agregar una divisa nueva, pero a nivel país dentro de EUR. Nav
condicional en `Layout.tsx` (`🇩🇪 Alemania` / `🇫🇷 Francia`, con banderas
emoji) solo aparece si `indicatorsByCountry(...).length > 0` — mismo
patrón data-driven que el resto de las pestañas opcionales. Si en el
futuro se agrega otro país (Italia, España), el patrón es: marcar
`country` en sus indicadores, agregar el código al union type, una página
wrapper de una línea y una ruta en `App.tsx` — no hace falta tocar
`CountryPage.tsx` ni `Layout.tsx` más que la condición del nav.

Probado en local con Playwright: la pestaña aparece, agrupa por
Crecimiento/Inflación/Confianza correctamente, y `/inflacion` de EUR
volvió a mostrar solo las 4 tarjetas agregadas (sin Alemania/Francia
mezcladas).

## Bug real en producción: Forex Factory rompió el feed (31-jul-2026)

El usuario cargó `FINNHUB_API_KEY` en Vercel (con guía paso a paso — es
poco técnico, hubo que explicarle desde "cómo entrar a Environment
Variables" hasta "qué es Redeploy") y al sincronizar Titulares apareció
`Forex Factory: fetch failed`. Confirmado por afuera con `WebFetch`
(`getaddrinfo ENOTFOUND cdn-nfs.faireconomy.media` — DNS no resuelve más,
no es un problema de Vercel ni de red) que Forex Factory sacó el prefijo
`cdn-` de su CDN: la URL nueva es `https://nfs.faireconomy.media/ff_calendar_thisweek.json`
(mismo JSON, mismos campos `title/country/date/impact/forecast/previous`,
no hizo falta tocar el resto de `api/headlines-sync.ts`). Corregido en
`FF_CALENDAR_URL`. **Lección**: exactamente lo que ya advertía este
HANDOFF sobre GBP/CAD/AUD/RBNZ — las APIs/CDNs de terceros cambian de URL
sin aviso, hay que volver a verificar en vez de asumir que sigue vigente
si algo empieza a fallar en producción.

**Seguido inmediato — el usuario probó el fix y pidió sacar Forex Factory
del todo**: "no quiero que me cargue datos económicos, solo titulares". El
calendario económico de Forex Factory arma titulares tipo "CPI Y/Y (prev.
X, previsión Y)" a partir de releases programados — eso es un dato
económico, no una noticia, y el usuario no lo quiere mezclado en
Titulares (los datos económicos van aparte, en Actualizar Datos/
`indicator_overrides`). Se sacó `fetchForexFactoryHeadlines` y todo lo que
solo usaba esa función (`FF_CALENDAR_URL`, `FfEvent`, `ffImpactToLevel`,
`G10_CNY_CURRENCIES`) de `api/headlines-sync.ts` — Titulares ahora
sincroniza **solo Finnhub**. Botón de la UI actualizado a "⟳ Sincronizar
(Finnhub)". El código de Forex Factory queda en el historial de git de
este archivo por si algún día se quiere retomar (con la URL ya corregida).

`supabase/cleanup_forex_factory_headlines.sql` — por si el usuario llegó a
correr el sync viejo antes de este cambio y quedaron titulares con
`source = 'Forex Factory (calendario económico)'` en la tabla, para
borrarlos a mano.

**Traducción automática de titulares (mismo día)**: el usuario pidió que
los titulares de Finnhub (vienen en inglés) se vean traducidos, o con la
traducción debajo. Se eligió lo segundo — mantener el original + traducción
abajo en cursiva — para no perder matices en un contexto de trading.
Columna nueva `headlines.title_es` (`schema.sql`, con migración `alter
table ... add column if not exists` para lo que ya estaba en producción).
Traducción vía **MyMemory** (`api.mymemory.translated.net`, gratis, sin
API key) — confirmado con una prueba manual con `WebFetch` antes de
integrarlo (mismo criterio que con Frankfurter/Forex Factory: no asumir
que una API de terceros gratuita funciona sin probarla primero). Se
traduce en `fetchFinnhubHeadlines` (`api/headlines-sync.ts`), una llamada
por titular relevante — si falla una traducción puntual, esa fila queda
con `title_es: null` sin romper el resto del sync (`translateToSpanish`
atrapa cualquier error y devuelve `null`). Las cargas manuales (ya en
español) no se tocan, `title_es` queda `null` para esas.

Frontend: `Headline.titleEs` nuevo (`types.ts`), seleccionado y mapeado en
`MacroDataContext.tsx`. `HeadlineCard.tsx` muestra la traducción en
cursiva debajo del título original cuando existe. `MarqueeTicker.tsx`
usa `titleEs || title` (prioriza la traducción en la cinta, ya que ahí no
hay espacio para mostrar las dos versiones). Probado en local con
Playwright inyectando un titular de prueba en localStorage (no hay forma
de generar una traducción real sin pegarle a la API desde un sync
verdadero) — se ve título en inglés + traducción en cursiva debajo, tal
como se pidió.

Nota para cuando se corra en Supabase real: como el `upsert` de
`headlines-sync.ts` usa `ignoreDuplicates: true`, un titular que ya existía
**nunca se actualiza** en syncs siguientes (ni `title_es` ni nada más) —
si una traducción falló la primera vez (quedó `null`), no se va a
reintentar sola; habría que borrar esa fila para que se vuelva a traer y
traducir en el próximo sync.

**Seguido inmediato — backfill para lo ya cargado**: exactamente el caso
de arriba, pero a escala — el usuario ya tenía titulares cargados de antes
de esta funcionalidad (los 55 migrados del Excel más los que ya había
sincronizado de Finnhub) y no tenía forma de traducirlos sin perderlos.
Se agregó **`api/translate-headlines.ts`**, función aparte de
`headlines-sync.ts`: busca `headlines` con `is_manual = false and
title_es is null` (tope de 200 por corrida, para no pasarse del timeout
de una función serverless), traduce cada uno con la misma
`translateToSpanish` (duplicada acá — mismo motivo de siempre, cada
función de `/api` es autocontenida) y hace `update` fila por fila (no
upsert, así que sí pisa lo que haga falta). Excluye `is_manual = true`
a propósito — esos son las cargas manuales/importadas del Excel, ya están
en español, traducirlas de nuevo no tiene sentido y podría arruinar el
texto original si MyMemory malinterpreta español como si fuera inglés.

Botón nuevo en `Titulares.tsx`, "🌐 Traducir pendientes", al lado de
"Sincronizar" — dispara `/api/translate-headlines` y refresca. Si hay más
de 200 pendientes, el mensaje avisa que hay que volver a tocar el botón
(no pagina automático, para mantenerlo simple). Bug real encontrado y
arreglado en esta misma sesión antes de subir: al principio el mensaje
"No había titulares pendientes de traducir" aparecía **junto con** el
error de "no se pudo contactar la función" en vez de en su lugar — la
condición original solo miraba `found === 0`, sin considerar que
`found` también es `0` cuando el fetch falló antes de llegar a contar
nada. Se corrigió agregando `&& errors.length === 0` a esa condición.

## Gaps conocidos (no ocultar, mencionar si el usuario pregunta)

- BCE: faltan ~16 gobernadores nacionales del Grupo 2 en Banqueros.
- Atlanta Fed sin presidente confirmado (vacante desde renuncia de Bostic).
- Ninguna divisa no-USD tiene panel de previsión de tasas tipo FOMC Watch.
- Histórico de `eur_cpi_yoy`/`eur_core_cpi_yoy` en `historical-series.json`
  tiene un sesgo de ~0.1pp en los meses viejos (ver handoff previo) — solo
  el último punto está corregido.
- BoC: Nicolas Vincent pasa de "External Deputy Governor" a "Deputy
  Governor" full-time el 3-ago-2026 — actualizar título en
  `centralBankers.ts` cuando se retome después de esa fecha.
- RBA: Ian Harper (Monetary Policy Board) termina mandato el 31-ago-2026 —
  verificar si sigue o hay reemplazo cuando se retome después de esa fecha.
- `aud_cpi`/`aud_cpi_yoy`/`aud_core_cpi`/`aud_core_cpi_yoy` tienen historia
  corta (~14-25 meses) a propósito — ver lección AUD #16, no se empalmó
  con la serie trimestral vieja por el quiebre de metodología real.
- `aud_pmi_manuf`/`aud_pmi_serv`/`aud_business_confidence`/`aud_consumer_confidence`
  no tienen ningún dato cargado todavía (sin API pública, igual que el
  resto de las divisas — quedan a la espera de carga manual).
- **NZD ya está en producción** (mergeado a `claude/macro-usd-web-dashboard-xm5ypk`
  con permiso explícito del usuario y desplegado en Vercel el 21-jul-2026;
  `/api/nzd-sync` ya corrió una vez contra Supabase real sin errores —
  pobló `nzd_cpi` (1.49% t/t), `nzd_cpi_yoy` (4.06%), `nzd_gdp_qoq` (0.80%),
  `nzd_gdp_yoy` (1.47%), `nzd_retail_sales` (-1.50%) y
  `nzd_retail_sales_yoy` (0.59%), 40 puntos de histórico cada uno).
- `nzd_ocr_rate`, `nzd_unemployment`, `nzd_employment_change`,
  `nzd_trade_balance`, `nzd_business_confidence`, `nzd_consumer_confidence`,
  `nzd_pmi_manuf`, `nzd_pmi_serv` no tienen ningún dato cargado todavía —
  son manuales por límites reales de fuente (ver "Lecciones NZD" arriba),
  no por falta de API pública nada más.
- **JPY ya está en producción** (mergeado a
  `claude/macro-usd-web-dashboard-xm5ypk` con permiso explícito del
  usuario y desplegado en Vercel el 21/22-jul-2026; `/api/jpy-sync` corrió
  contra Supabase real, 12/12 automáticos sin errores en el segundo
  intento — poblados con 40 puntos de histórico cada uno). **Bug real
  encontrado y arreglado en el primer intento**: `jpy_boj_rate` fallaba
  con `"ON CONFLICT DO UPDATE command cannot affect row a second time"`
  porque el CSV del BOJ es diario y varias filas caían en la misma fecha
  `YYYY-MM-01` — Postgres rechaza un upsert con la misma clave
  `(indicator_id, date)` repetida dentro del mismo batch. Se arregló
  dedupeando con un `Map` antes de upsertear (se queda con el último valor
  del mes). **Se revisó si CAD/AUD tienen el mismo bug latente en sus
  series de tasa diaria** (`cad_boc_rate` vía Valet, `aud_rba_rate` vía
  CSV del RBA) — probado en vivo contra producción, NINGUNA de las dos lo
  tiene: esas tablas solo agregan una fila cuando la tasa efectivamente
  cambia (no una fila por día hábil como el call rate del BOJ, que es una
  tasa de mercado promediada y se publica todos los días aunque no se
  mueva) — no hizo falta tocar `aud-sync.ts`/`cad-sync.ts`. Lección
  general: cualquier serie diaria que se colapse a un punto mensual
  (`YYYY-MM-01`) puede pisar esta misma trampa — no asumir que el patrón
  de `aud-sync.ts` es automáticamente seguro para una fuente nueva, probar
  el sync real contra producción antes de darlo por bueno.
- `jpy_pmi_manuf`, `jpy_pmi_serv`, `jpy_business_confidence`,
  `jpy_consumer_confidence` no tienen ningún dato cargado todavía —
  manuales, ver "Lecciones JPY" arriba.
- Banqueros del BOJ: solo Kazuo Ueda y Ryozo Himino tienen foto (Wikimedia
  Commons) — los otros 7 quedan con el placeholder de iniciales, no se
  buscó en prensa en esta primera pasada (ver "Lecciones JPY" #8).
- ~~Los 6 miembros del Monetary Policy Committee del RBNZ no tienen
  foto~~ — resuelto: ninguno estaba en Wikimedia Commons (nombramientos
  recientes), pero el usuario pasó la foto de Anna Breman (sacada del
  comunicado de prensa del Riksbank, su empleador anterior — estaba
  oculta en un `data-src` de carga diferida, no en el HTML visible a
  primera vista) y a partir de ahí se encontraron las otras 5 en
  coberturas de prensa de cada nombramiento (RNZ, Insurance Business NZ,
  b2bnews.co.nz, Universidad de Auckland — esta última cruzada contra
  INET Economics para confirmar identidad). Las de RNZ se recortaron
  para sacar el logo superpuesto. Las 6 quedaron en `public/bankers/`.
- No se guarda la fecha real de publicación de cada dato, solo el período
  de referencia (`YYYY-MM-01`) — el usuario preguntó por esto, se le
  explicó que es la misma convención que usan FRED/StatCan/ONS/Eurostat en
  sus propias APIs, y que las insignias de frescura ya tienen el rezago de
  publicación incorporado en los umbrales (`FREQUENCY_STALE_DAYS`). Quedó
  la puerta abierta a agregar un segundo campo de fecha de publicación si
  el usuario lo pide — sería un cambio de arquitectura que toca las 4
  divisas (tipo `SeriesPoint`, Supabase, todos los `*-sync.ts`), no algo
  puntual de una sola.
- **CHF ya está en producción** (pusheada con permiso explícito del
  usuario a `claude/macro-usd-web-dashboard-xm5ypk` el 29-jul-2026,
  fast-forward directo desde `claude/handoff-documentation-review-9z8wtp`
  — ambas ramas sincronizadas al mismo commit; desplegado en Vercel y con
  `/api/chf-sync` corrido contra Supabase real, 9/9 automáticos sin
  errores, verificado también contra `indicator_overrides` vía REST — 40
  filas por serie).
- `chf_unemployment`, `chf_employment_change`, `chf_retail_sales`,
  `chf_retail_sales_yoy`, `chf_trade_balance`, `chf_pmi_manuf`,
  `chf_pmi_serv` no tienen ningún dato cargado todavía — son manuales por
  límites reales de fuente (ver "Lecciones CHF" arriba), no por falta de
  API pública nada más.
- Banqueros del SNB: solo Martin Schlegel tiene foto en Wikimedia
  Commons — Antoine Martin y Petra Tschudin se autohospedaron desde
  snb.ch (ver "Lecciones CHF" #9).
- **CNY ya está en producción** (pusheada con permiso explícito del
  usuario a `claude/macro-usd-web-dashboard-xm5ypk` el 30-jul-2026,
  fast-forward directo desde `claude/handoff-documentation-review-9z8wtp`
  — ambas ramas sincronizadas al mismo commit; desplegado en Vercel y con
  `/api/cny-sync` corrido contra Supabase real, 13/13 automáticos sin
  errores, verificado también contra `indicator_overrides` vía REST — 40
  filas por serie). `cny_cpi_yoy` tiene un margen de imprecisión de
  ~0.1-0.2pp por ser derivada (ver "Lecciones CNY" #3) — si el usuario
  nota que no coincide exacto con su fuente de referencia, esto ya está
  documentado y es esperado, no investigar de nuevo desde cero.
  `chinadata.live` (fuente de CNY) es un agregador de terceros, no
  oficial — si en algún momento cambia su API o deja de responder,
  revisar `api/cny-sync.ts` primero.
- **`chinadata.live` se atrasó ~2 meses en 10 de los 13 indicadores de CNY
  ya el 30-jul-2026** (un día después de poner CNY en producción) — el
  usuario lo notó primero con Inflación, pero afectaba también a
  Crecimiento completo (solo PMI seguía al día). Se corrigió a mano el
  30-jul-2026 con los valores oficiales de jun-2026/Q2-2026 pusheados
  directo a Supabase + `historical-series.json` (ver "Lecciones CNY" #9
  para el detalle exacto y los números). **Si vuelve a pasar, revisar los
  13 datasets de una — no es normal que un agregador se atrase tanto, y
  si se repite seguido conviene reconsiderar la fuente** (dejar
  `chinadata.live` solo para PMI, agregar un scraper de
  `stats.gov.cn/english/PressRelease/` como fallback para el resto).

## Cómo verificar cosas (comandos que funcionaron esta sesión)

```bash
# Build + typecheck del frontend
npm run build

# Typecheck de las funciones serverless (Vercel las compila aparte)
cat > tsconfig.api-check.json << 'EOF'
{ "compilerOptions": { "strict": true, "esModuleInterop": true, "skipLibCheck": true,
  "module": "esnext", "moduleResolution": "bundler", "target": "es2022",
  "types": ["node"], "noEmit": true, "resolveJsonModule": true },
  "include": ["api/**/*.ts"] }
EOF
npx tsc -p tsconfig.api-check.json
rm tsconfig.api-check.json

# Probar los sync en producción directo
curl -s "https://hikman-prueba.vercel.app/api/fred-sync" -X POST --max-time 30
curl -s "https://hikman-prueba.vercel.app/api/eur-sync" -X POST --max-time 30
curl -s "https://hikman-prueba.vercel.app/api/gbp-sync" -X POST --max-time 30
curl -s "https://hikman-prueba.vercel.app/api/cad-sync" -X POST --max-time 45
curl -s "https://hikman-prueba.vercel.app/api/aud-sync" -X POST --max-time 45
curl -s "https://hikman-prueba.vercel.app/api/jpy-sync" -X POST --max-time 45
curl -s "https://hikman-prueba.vercel.app/api/chf-sync" -X POST --max-time 30
curl -s "https://hikman-prueba.vercel.app/api/cny-sync" -X POST --max-time 45

# ABS Data API: estructura de dimensiones de un dataflow (orden del key + codelists)
curl -s "https://data.api.abs.gov.au/rest/datastructure/ABS/LF?format=json" -A "Mozilla/5.0"
# Valores válidos por dimensión (marginal, no garantiza la combinación exacta)
curl -s "https://data.api.abs.gov.au/rest/availableconstraint/LF?format=json" -A "Mozilla/5.0"
# Traer datos de una serie con key completo (orden: ver datastructure)
curl -s "https://data.api.abs.gov.au/rest/data/LF/M13.3.1599.20.AUS.M?format=jsondata&startPeriod=2026-01" -A "Mozilla/5.0"

# RBA cash rate (CSV público, tabla F1.1, serie FIRMMCRT)
curl -s "https://www.rba.gov.au/statistics/tables/csv/f1.1-data.csv" -A "Mozilla/5.0"

# StatCan WDS: sacar dimensiones/memberId de una tabla antes de armar el coordinate
curl -s -X POST "https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata" \
  -H "Content-Type: application/json" -d '[{"productId":18100006}]'
# Traer datos de una serie ya con coordinate conocido
curl -s -X POST "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods" \
  -H "Content-Type: application/json" \
  -d '[{"productId":18100006,"coordinate":"1.1.0.0.0.0.0.0.0.0","latestN":5}]'

# Bank of Canada Valet
curl -s "https://www.bankofcanada.ca/valet/observations/V39079/json?recent=5" -H "User-Agent: Mozilla/5.0"

# SNB Data Portal: traer una serie de un cubo (matchear por header[0].dimItem, no por posición)
curl -s "https://data.snb.ch/api/cube/snboffzisa/data/json/en" -A "Mozilla/5.0"

# SECO GDP / trade balance, feed CSV vía scheduler.swissdatas.ch (no documentado,
# se encontró raspando el HTML de seco.admin.ch/en/gross-domestic-product)
curl -s "https://scheduler.swissdatas.ch/scheduled/ch-seco-gdp.csv" -A "Mozilla/5.0"
# SECO confianza del consumidor (Konsumentenstimmungsindex), trimestral
curl -s "https://scheduler.swissdatas.ch/scheduled/ks-q.csv" -A "Mozilla/5.0"

# KOF Economic Barometer v2 (ETH Zúrich) — la v1 (datenservice.kof.ethz.ch) está discontinuada
curl -s "https://tsdb-api.kof.ethz.ch/v2/ts?keys=ch.kof.barometer&mime=csv&access_type=public" -A "Mozilla/5.0"

# chinadata.live (CNY) — listar todos los datasets disponibles (slug, frecuencia, rango de fechas)
curl -s "https://chinadata.live/api/v2/datasets" -A "Mozilla/5.0"
# Traer una serie puntual
curl -s "https://chinadata.live/api/v2/data/china-pmi" -A "Mozilla/5.0"
# La API oficial de la NBS está bloqueada por WAF para IPs no chinas (403 "UrlACL") — no usar:
# curl -s "https://data.stats.gov.cn/easyquery.htm?m=QueryData&dbcode=hgyd&rowcode=sj&colcode=zb&wds=[]&dfwds=[...]"

# Consultar/editar Supabase directo por REST (para diagnosticar sin abrir el dashboard)
ANON="<la clave de arriba>"
curl -s "https://ukwtmsvobrljebomuoxp.supabase.co/rest/v1/indicator_overrides?indicator_id=eq.XXX&select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# Contar filas totales de una tabla (para detectar el problema del límite de 1000)
curl -s -D - "https://ukwtmsvobrljebomuoxp.supabase.co/rest/v1/indicator_overrides?select=indicator_id&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Prefer: count=exact" -o /dev/null | grep -i content-range
```

**Nota sobre Playwright en este entorno**: para probar contra la URL
pública de producción (no localhost) hace falta el proxy de salida
(`echo $https_proxy` para el puerto actual, cambia entre sesiones), y aun
así tiene fallas de conexión intermitentes — para probar UI fue más
confiable levantar `npm run preview` local (**ojo**: en preview local
`supabaseEnabled` da `false` porque no hay `.env` con las claves, así que
corre en modo "Guardado local" — no sirve para probar la sincronización
real con Supabase, solo la UI/lógica de componentes; las imágenes
autohospedadas en `public/bankers/` SÍ cargan bien en Playwright porque son
same-origin, a diferencia de las de Wikimedia que necesitan el proxy y
igual no cargan en este sandbox — no es un bug real, ver nota de USD/EUR).

## Estilo de trabajo esperado por el usuario (patrones ya establecidos)

- Escribe en mayúsculas, español, directo. No explicar de más; respuestas
  cortas y accionables.
- Beginner en infra — cualquier paso en Supabase/Vercel necesita
  instrucciones tipo "clic acá, pegá esto", y el SQL para copiar/pegar
  completo, no fragmentos para armar a mano.
- Le importa mucho la **exactitud de los datos** — activamente la verifica
  contra su propia fuente de referencia y avisa apenas algo no cuadra
  (pasó dos veces con CAD esta sesión: el CPI m/m y el Core CPI/Median/Trim
  — ambas veces era un problema real de convención, no un malentendido del
  usuario). **Nunca asumir que "está bien, son solo redondeos" sin
  verificar contra la fuente primaria, y cuando el usuario dice que un
  número no coincide, investigar a fondo la convención (SA/NSA, qué
  definición de "core", etc.) en vez de re-verificar superficialmente lo
  mismo que ya se había verificado.**
- A veces manda capturas de pantalla en vez de archivos cuando tiene
  problemas para subir un Excel — sirven para catalogar estructura/valores
  puntuales, pero no reemplazan una fuente con histórico real para los
  gráficos (se reconstruye desde la API oficial en esos casos).
- Prefiere que Claude investigue y proponga antes de implementar cuando
  hay ambigüedad real (usar `AskUserQuestion` para decisiones de alcance,
  como se hizo con GBP — automatizar poco vs. investigar más — y con el
  alcance de indicadores de CAD/JPY/AUD/CHF/NZD).
- Pide varios cambios juntos en un solo mensaje a veces (ej. "agregá
  Balanza Comercial y PIB a todas las divisas") — está bien ejecutarlos
  todos en la misma sesión, con `TaskCreate`/`TaskUpdate` para no perder
  el hilo, y avisar del progreso a medida que se completa cada uno.
- Después de cada cambio: build local, typecheck, verificar visualmente
  con Playwright cuando aplica (`npm run preview` + capturas), commit con
  mensaje descriptivo en español, push a **las dos ramas**, esperar el
  redeploy de Vercel (poll con `curl` comparando el hash del bundle JS —
  ojo, el hash de Vercel no siempre coincide con el del build local aunque
  el código sea el mismo; comparar contenido del bundle si hace falta
  certeza, no solo el hash), correr el sync real en producción para dejar
  Supabase actualizado, y **siempre reportar con datos concretos** (valores
  reales, capturas, no solo "ya funciona").
- **Deploy a producción es un paso separado, con permiso explícito
  propio** (patrón confirmado con CHF y CNY): el pedido de "agregá la
  divisa X" NO implica automáticamente pushear a
  `claude/macro-usd-web-dashboard-xm5ypk` — el usuario lo pide aparte, a
  veces en un mensaje de una sola palabra ("PUSHEA"). Desarrollar y
  commitear en la rama asignada de la sesión primero; recién pushear a
  producción cuando lo pida explícitamente, y en ese momento sí correr el
  sync real contra Supabase y verificar contra la tabla `indicator_overrides`
  vía REST antes de darlo por confirmado.
- **Cuando avisa que un dato está desactualizado, no asumir que es un
  problema puntual de ese único indicador** — con CNY, avisó que Inflación
  estaba en mayo y el problema real afectaba a 10 de los 13 indicadores
  (toda la fuente `chinadata.live`, no solo CPI/PPI). Revisar TODOS los
  indicadores automáticos de esa divisa contra la fuente antes de asumir
  que la corrección es acotada a lo que el usuario mencionó.
