# Handoff — HIKMAN ENDÓGENO (dashboard macro multi-divisa) — para continuar en otro chat

Fecha de este resumen: 21-jul-2026 (actualizado en la misma sesión que
agregó JPY). Pega este archivo completo (o pedile a Claude que lo lea
desde el repo) al abrir el chat nuevo.

## Qué es esto

Reemplazo de Excels de análisis macro (uno por divisa) por un dashboard web
multi-divisa. La idea central del proyecto es que **nunca vuelva a pasar
inadvertido** que un dato está viejo o mal calculado — de ahí las insignias
de frescura en cada tarjeta y la obsesión por verificar cada serie contra la
fuente oficial (con el número real, no solo "la API respondió 200") antes
de automatizarla.

**Estado actual: USD, EUR, GBP, CAD, AUD y NZD completos y en producción.
JPY está completo pero SOLO pusheado a `claude/handoff-review-8vej1i`** —
esta sesión tiene la misma restricción que sesiones previas de no pushear
a la rama de producción sin permiso explícito del usuario (ver "Dónde vive
todo" más abajo); falta mergear/pushear a
`claude/macro-usd-web-dashboard-xm5ypk` para que salga a producción, y
recién ahí correr `/api/jpy-sync` contra Supabase real (quedó pendiente,
no se pudo verificar en producción por el mismo motivo — sí se verificó
localmente con `npm run preview`, que lee `historical-series.json`
directo, sin pasar por Supabase). AUD tiene 20 indicadores (16 automáticos): además de lo descrito abajo,
se agregaron Weighted Median y PPI, el bloque de inflación (CPI/Trimmed
Mean/Weighted Median) se pasó a la base TRIMESTRAL "pre-October 2025" a
pedido del usuario (ver lección AUD #21/#22 — no es un dato viejo, es un
release oficial paralelo que sigue la fuente de referencia del usuario),
y se reordenaron las tarjetas de Inflación de TODAS las divisas (m/m
junto a su a/a, no agrupados por separado). NZD tiene 14 indicadores (solo
6 automáticos — la divisa con menos automatización hasta ahora). JPY
tiene 16 indicadores, 12 automáticos — la divisa no-USD MÁS automatizada
hasta ahora, ver "Lecciones JPY" más abajo. Falta CHF — ver "Pendiente
explícito" más abajo, incluye los datos crudos que ya mandó el usuario
(por captura de pantalla, no Excel).

## Dónde vive todo

- **Repo**: `samerbilalsangronis-netizen/hikman-prueba` (GitHub)
- **Rama de producción real** (la que deployea Vercel, confirmado
  comparando el bundle JS servido con el hash de cada rama): `claude/macro-usd-web-dashboard-xm5ypk`
  — es también la rama HEAD por defecto del repo (`git remote show
  origin`). **Esta sesión trabajó en `claude/handoff-review-8vej1i`**
  (asignada por el entorno) y **pusheó el commit de AUD solo ahí** — el
  workflow habitual de sesiones previas era pushear siempre a dos ramas a
  la vez, pero esta sesión tiene restricción de no pushear a una rama
  distinta de la asignada sin permiso explícito del usuario. **Si el
  usuario quiere AUD en producción, hay que pushear (o mergear)
  `claude/handoff-review-8vej1i` a `claude/macro-usd-web-dashboard-xm5ypk`
  explícitamente** — no asumir que ya está ahí. También existe
  `claude/handoff-documentation-review-k28bsl` (rama de una sesión
  anterior, sincronizada con producción al momento de escribir esto).
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
  types.ts                 — Section, Format, Currency ('USD'|'EUR'|'GBP'|'CAD'|'AUD'|'NZD'|'JPY'),
                              IndicatorMeta, ScoreRow, CentralBanker, BankerNote,
                              Statement, BankerVoteStatus, Stance
  data/
    indicators.ts           — INDICATORS[] = [...USD, ...EUR, ...GBP, ...CAD, ...AUD, ...NZD, ...JPY],
                              SECTION_LABELS (por Currency), indicatorsBySection(section, currency)
    indicatorsEur.ts / indicatorsGbp.ts / indicatorsCad.ts / indicatorsAud.ts / indicatorsNzd.ts / indicatorsJpy.ts — ids con prefijo eur_/gbp_/cad_/aud_/nzd_/jpy_
    historical-series.json  — histórico sembrado, TODAS las divisas mezcladas en un solo objeto
    fredMappings.ts          — FRED_MAPPINGS (USD) + EUR_FRED_MAPPINGS + EUR_EUROSTAT_INDICATOR_ID
                              + GBP_BOE_INDICATOR_ID + CAD_AUTO_INDICATOR_IDS + AUD_AUTO_INDICATOR_IDS
                              + NZD_AUTO_INDICATOR_IDS + JPY_AUTO_INDICATOR_IDS
                              (listas simples, CAD/AUD/NZD/JPY no usan FRED)
                              — copia usada SOLO por el frontend para la insignia de fuente en Actualizar.tsx
    fomcMeetings.ts          — calendario oficial FOMC 2026 (hardcodeado, solo USD)
    scoreSeed.ts / scoreSeedEur.ts / scoreSeedGbp.ts / scoreSeedCad.ts / scoreSeedAud.ts / scoreSeedNzd.ts / scoreSeedJpy.ts
    centralBankers.ts        — FED_BANKERS[] / ECB_BANKERS[] / BOE_BANKERS[] / BOC_BANKERS[] / RBA_BANKERS[] / RBNZ_BANKERS[] / BOJ_BANKERS[],
                              bankersForCurrency(currency). Ver sección Banqueros más abajo.
    CurrencyContext.tsx      — selector de moneda global, CURRENCIES=['USD','EUR','GBP','CAD','AUD','NZD','JPY'], localStorage
    MacroDataContext.tsx     — contexto React: overrides, forecasts, score, fomcWatch, bankerNotes.
                              Supabase si está configurado, si no localStorage. fetchAllRows() pagina
                              indicator_overrides (ver bug de 1000 filas en decisiones técnicas).
  lib/
    format.ts, freshness.ts
  components/
    ChartCard.tsx, SectionGrid.tsx, FomcWatchPanel.tsx (solo currency==='USD'),
    ScorePanel.tsx (select de valoración: SOLO 5 opciones enteras -2..2 — ver bug importante abajo),
    FreshnessBadge.tsx, Layout.tsx (nav + selector de moneda)
  pages/
    Dashboard.tsx, Tasas.tsx, Inflacion.tsx, Empleo.tsx, Crecimiento.tsx (acordeón PMI),
    Sentimiento.tsx (ruta /confianza), Banqueros.tsx, Actualizar.tsx
    — TODAS (salvo Dashboard.tsx, que es genérico) tienen ternarios por currency para
      textos/labels; al agregar una divisa nueva hay que tocar las 6 páginas + Layout.tsx +
      Actualizar.tsx (grep "'CAD'" en src/ para encontrarlas todas)
api/
  fred-sync.ts   — USD, vía FRED
  eur-sync.ts    — EUR, vía FRED + Eurostat directo (desempleo)
  gbp-sync.ts    — GBP, SOLO la Bank Rate + Balanza Comercial vía FRED/BoE IADB (resto manual, ver por qué abajo)
  cad-sync.ts    — CAD, vía StatCan WDS + Bank of Canada Valet (11 de 15 indicadores automatizados)
  aud-sync.ts    — AUD, vía ABS Data API (SDMX) + CSV público del RBA (12 de 16 indicadores automatizados)
public/
  bankers/*.jpg  — fotos de banqueros AUTOHOSPEDADAS (no hotlink) — ver por qué abajo
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
  explícito del usuario, aplicado a USD/EUR/GBP/CAD/AUD/NZD en jul-2026. El
  orden de las tarjetas es simplemente el orden del array en
  `indicators{X}.ts` (no hay lógica de sorting en `SectionGrid`/
  `ChartCard`) — al agregar un indicador nuevo con su par m/m+a/a,
  colocarlos consecutivos en el archivo.
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

## Modelo de datos (Supabase)

5 tablas, todas con RLS `using(true) with check(true)` (lectura/escritura
pública — aceptable para dashboard personal). Sin cambios esta sesión —
ver handoffs previos o `supabase/schema.sql` para el DDL completo:
`indicator_overrides`, `score_overrides`, `indicator_forecasts`,
`fomc_watch` (solo USD), `banker_statements`.

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
   descuento) NO es la tasa operativa actual — no usar.

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

## Pendiente explícito

**1. CHF** — el usuario mandó capturas de pantalla (no el .xlsx
completo, tuvo problemas para subirlo) de un Excel compartido con hojas
`CAD | JPY | AUD | CHF | NZD | DECISIONES`, formato snapshot estilo
Trading Economics (Reciente/Anterior/Más Alto/Más Bajo/Fecha), **datos de
2025, desactualizados** — mismo tratamiento que CAD/AUD/NZD/JPY: se usa
solo para identificar indicadores y pesos del score, el histórico y valor
actual se reconstruyen desde la fuente oficial de cada país, verificando
cada serie contra una referencia real (comunicado oficial Y agregador de
mercado, ver lección CAD #6-7 arriba) antes de automatizar. Las columnas
NZD y JPY de la tabla DECISIONES de abajo ya se usaron (ver "Lecciones
NZD"/"Lecciones JPY" arriba) — se dejan en la tabla solo como referencia
histórica de dónde salió cada valoracion.

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
- **CHF** → SNB Data Portal `data.snb.ch` (sin key, REST público) — no
  investigado a fondo todavía. **Ojo**: antes de asumir que está libre de
  bloqueos tipo Cloudflare/Imperva (como pasó con rbnz.govt.nz), probarlo
  con curl real desde el entorno de la sesión, no solo confiar en que "sin
  key" documentado signifique "fetch automatizado funciona".
- **JPY** → hecho en la sesión del 21-jul-2026, ver "Lecciones JPY" arriba
  (e-Stat Dashboard API + CSV del BOJ + CSV de Aduanas de Japón, todo sin
  key — boj.or.jp NO está bloqueado, a diferencia de rbnz.govt.nz).
- **NZD** → hecho en la sesión del 21-jul-2026, ver "Lecciones NZD" arriba
  (Stats NZ CSV por release, sin key — RBNZ bloqueado por completo).

**Bancos centrales pendientes** (mismo rigor que Fed/BCE/BoE/BoC/RBA/RBNZ/BOJ —
WebSearch + página oficial antes de escribir nombres, nunca asumir vigente
sin verificar): SNB (Suiza).

**Previsión de tasas estilo FedWatch** — sigue sin solución gratuita para
ninguna divisa no-USD (ver handoffs previos para el detalle de por qué se
descartó CME FedWatch/rateprobability.com) — se omite el panel para
GBP/CAD/AUD/NZD y probablemente para JPY/CHF también.

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
- **JPY todavía NO está en producción** — solo en
  `claude/handoff-review-8vej1i`, falta mergear/pushear a la rama de
  producción (ver "Estado actual" y "Dónde vive todo" arriba) y recién ahí
  correr `/api/jpy-sync` una vez contra Supabase real. Verificado
  localmente con `npm run preview` (lee `historical-series.json` directo,
  sin Supabase) — todos los valores coinciden con lo documentado en
  `indicatorsJpy.ts`.
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
