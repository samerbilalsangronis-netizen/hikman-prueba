# Handoff — HIKMAN ENDÓGENO (dashboard macro multi-divisa) — para continuar en otro chat

Fecha de este resumen: 19-jul-2026. Pega este archivo completo (o pedile a
Claude que lo lea desde el repo) al abrir el chat nuevo.

## Qué es esto

Reemplazo de Excels de análisis macro (uno por divisa) por un dashboard web
multi-divisa. La idea central del proyecto es que **nunca vuelva a pasar
inadvertido** que un dato está viejo o mal calculado — de ahí las insignias
de frescura en cada tarjeta y la obsesión por verificar cada serie contra la
fuente oficial (con el número real, no solo "la API respondió 200") antes
de automatizarla.

**Estado actual: USD, EUR, GBP y CAD completos y en producción.** Faltan
JPY, AUD, CHF, NZD — ver "Pendiente explícito" más abajo, incluye los datos
crudos que ya mandó el usuario (por captura de pantalla, no Excel) para
esas 4.

## Dónde vive todo

- **Repo**: `samerbilalsangronis-netizen/hikman-prueba` (GitHub)
- **Ramas de trabajo**: `claude/handoff-documentation-review-k28bsl` y
  `claude/macro-usd-web-dashboard-xm5ypk` — **ambas están sincronizadas al
  mismo commit** al escribir esto (se pushea a las dos siempre). Igual,
  cualquier sesión nueva debería confirmar con `git log <rama> -1` en las
  dos y comparar con lo desplegado en Vercel antes de asumir.
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
  types.ts                 — Section, Format, Currency ('USD'|'EUR'|'GBP'|'CAD'),
                              IndicatorMeta, ScoreRow, CentralBanker, BankerNote,
                              Statement, BankerVoteStatus, Stance
  data/
    indicators.ts           — INDICATORS[] = [...USD, ...EUR, ...GBP, ...CAD],
                              SECTION_LABELS (por Currency), indicatorsBySection(section, currency)
    indicatorsEur.ts / indicatorsGbp.ts / indicatorsCad.ts — ids con prefijo eur_/gbp_/cad_
    historical-series.json  — histórico sembrado, TODAS las divisas mezcladas en un solo objeto
    fredMappings.ts          — FRED_MAPPINGS (USD) + EUR_FRED_MAPPINGS + EUR_EUROSTAT_INDICATOR_ID
                              + GBP_BOE_INDICATOR_ID + CAD_AUTO_INDICATOR_IDS (lista simple, CAD no usa FRED)
                              — copia usada SOLO por el frontend para la insignia de fuente en Actualizar.tsx
    fomcMeetings.ts          — calendario oficial FOMC 2026 (hardcodeado, solo USD)
    scoreSeed.ts / scoreSeedEur.ts / scoreSeedGbp.ts / scoreSeedCad.ts
    centralBankers.ts        — FED_BANKERS[] / ECB_BANKERS[] / BOE_BANKERS[] / BOC_BANKERS[],
                              bankersForCurrency(currency). Ver sección Banqueros más abajo.
    CurrencyContext.tsx      — selector de moneda global, CURRENCIES=['USD','EUR','GBP','CAD'], localStorage
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
    — TODAS tienen ternarios por currency para textos/labels; al agregar una divisa nueva
      hay que tocar las 7 páginas + Layout.tsx (grep "'EUR'" en src/ para encontrarlas todas)
api/
  fred-sync.ts   — USD, vía FRED
  eur-sync.ts    — EUR, vía FRED + Eurostat directo (desempleo)
  gbp-sync.ts    — GBP, SOLO la Bank Rate vía BoE IADB (resto manual, ver por qué abajo)
  cad-sync.ts    — CAD, vía StatCan WDS + Bank of Canada Valet (11 de 15 indicadores automatizados)
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

**USD (~43)** y **EUR (20)**: sin cambios esta sesión, ver historial de
commits para el desglose. **Pendiente**: agregar `eur_trade_balance` (EUR
ya tiene PIB pero no Balanza Comercial) — el usuario lo pidió explícitamente
para dejar EUR/GBP a la par de USD/CAD, **todavía no se hizo** (ver
Pendiente explícito).

**GBP (15)**, `indicatorsGbp.ts`, ids `gbp_`:
- Tasas (1, auto vía **BoE IADB**, no FRED — FRED tiene la Bank Rate
  discontinuada desde 2016): `gbp_boe_rate`
- Resto (14) **todos manuales**: CPI/Core CPI m/m y a/a, Desempleo,
  Claimant Count Change, Salario ±Bonus a/a, Confianza GfK, PMI
  Manuf/Serv Flash, Ventas Minoristas (total y subyacente), Productividad,
  PIB Mensual. Por qué manuales: la API vieja de ONS (`api.ons.gov.uk`) fue
  dada de baja en nov-2024; la nueva (`api.beta.ons.gov.uk`) tiene datasets
  clave **congelados** — verificado con evidencia concreta: `cpih01` trae
  un alert explícito "no longer being updated... up to January 2026", y
  `retail-sales-index` sigue en su versión de feb-2026 pese a que el
  `next_release` anunciado ya pasó hace meses. Automatizar ahí arriesgaría
  mostrar un dato viejo sin avisar. **Pendiente**: agregar `gbp_trade_balance`.

**CAD (17 tras la corrección de esta sesión)**, `indicatorsCad.ts`, ids `cad_`:
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
  `cad_consumer_confidence`, `cad_gdp_yoy`. Total actual: **+6**.

## Sección de Banqueros Centrales (`/banqueros`)

**Fed (19)** y **BCE (10)**: sin cambios esta sesión (ver handoffs previos).
**Corrección esta sesión**: los 5 que no tenían foto verificada (Logan,
Paulson, Barkin, Musalem del Fed) **ahora sí tienen foto** — se
autohospedaron desde la página oficial del banco regional respectivo (ver
"Por qué autohospedar fotos" abajo). Susan Collins (Fed Boston) también
tenía foto faltante y se agregó (SÍ estaba en Wikimedia Commons, bajo
"Susan M. Collins (economist)" — cuidado con no confundirla con la
senadora homónima). **Con esto los 32 banqueros de Fed+BCE tienen foto.**

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

### Por qué autohospedar fotos en vez de hotlinkear (encontrado esta sesión)

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
   CPI" genérico de arriba) — publicadas **directo como tasa a/a** por el
   Valet (`CPI_TRIM`, `CPI_MEDIAN`, sin necesidad de derivarlas de un
   índice). Se agregaron como `cad_cpi_trim`/`cad_cpi_median`.
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

## Pendiente explícito

**1. Terminar EUR/GBP**: agregar `eur_trade_balance` y `gbp_trade_balance`
(sección crecimiento, informativo, no en el score — mismo patrón que
`eur_gdp_qoq`/`gbp_gdp_mom`). Pedido explícito del usuario, todavía no
implementado.

**2. JPY, AUD, CHF, NZD** — el usuario mandó capturas de pantalla (no el
.xlsx completo, tuvo problemas para subirlo) de un Excel compartido con
hojas `CAD | JPY | AUD | CHF | NZD | DECISIONES`, formato snapshot estilo
Trading Economics (Reciente/Anterior/Más Alto/Más Bajo/Fecha), **datos de
2025, desactualizados** — mismo tratamiento que CAD: se usa solo para
identificar indicadores y pesos del score, el histórico y valor actual se
reconstruyen desde la fuente oficial de cada país, verificando cada serie
contra una referencia real (comunicado oficial Y agregador de mercado, ver
lección CAD #6-7 arriba) antes de automatizar.

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

Recordar (lección #3): al armar `scoreSeed{Jpy,Aud,Chf,Nzd}.ts`, redondear
cualquier valoración fuera de -2..2 antes de cargarla (ej. NZD Inflación=4
→ probablemente 2; CAD PIB=-3 se redondeó a -2).

Cada hoja individual (JPY/AUD/CHF/NZD) tiene la misma estructura de columnas
que CAD (Reciente/Anterior/Más Alto/Más Bajo/Fecha) con estas filas: Stock
Market, GDP Growth Rate, GDP Annual Growth Rate, Inflation Rate MoM,
Inflation Rate, Unemployment Rate, Employment Change (AUD: "Employed
Persons"), Retail Sales MoM (AUD: "Retail Sales"), Manufacturing PMI,
Services PMI, Business Confidence, Consumer Confidence, Interest Rate,
Government Budget, Balance of Trade, Current Account, Current Account to
GDP, Government Debt to GDP, Corporate Tax Rate, Personal Income Tax Rate.
**Mismo criterio que CAD**: solo se implementan como indicadores los que
están en el score + Balanza Comercial + PIB (pedido explícito del
usuario) + la tasa del banco central — no Stock Market/impuestos/deuda.

Investigación de fuentes por país (de una sesión previa a GBP, **repetir el
proceso de verificación con cada una, no asumir que sigue vigente** — GBP y
CAD ya mostraron que las APIs cambian o que la convención asumida estaba
mal):
- **CAD** → ya hecho, ver arriba (StatCan WDS + BoC Valet).
- **CHF** → SNB Data Portal `data.snb.ch` (sin key, REST público) — no
  investigado a fondo todavía esta sesión.
- **JPY** → BOJ Time-Series API + e-Stat Dashboard API (sin key) — no
  investigado a fondo todavía esta sesión.
- **AUD** → ABS Indicator API (key gratis por email, no instantánea —
  pedirla apenas se retome AUD si hace falta) — no investigado a fondo.
- **NZD** → RBNZ (solo archivos descargables, no API REST limpia — va a
  ser la más manual de las 4) — no investigado a fondo.

**Bancos centrales pendientes** (mismo rigor que Fed/BCE/BoE/BoC — WebSearch
+ página oficial antes de escribir nombres, nunca asumir vigente sin
verificar): RBA (Australia), RBNZ (Nueva Zelanda), SNB (Suiza), BOJ (Japón).

**Previsión de tasas estilo FedWatch** — sigue sin solución gratuita para
ninguna divisa no-USD (ver handoffs previos para el detalle de por qué se
descartó CME FedWatch/rateprobability.com) — se omite el panel para
GBP/CAD y probablemente para las 4 que faltan también.

## Gaps conocidos (no ocultar, mencionar si el usuario pregunta)

- BCE: faltan ~16 gobernadores nacionales del Grupo 2 en Banqueros.
- Atlanta Fed sin presidente confirmado (vacante desde renuncia de Bostic).
- Ninguna divisa no-USD tiene panel de previsión de tasas tipo FOMC Watch.
- EUR/GBP no tienen Balanza Comercial todavía (pendiente #1 arriba).
- Histórico de `eur_cpi_yoy`/`eur_core_cpi_yoy` en `historical-series.json`
  tiene un sesgo de ~0.1pp en los meses viejos (ver handoff previo) — solo
  el último punto está corregido.
- BoC: Nicolas Vincent pasa de "External Deputy Governor" a "Deputy
  Governor" full-time el 3-ago-2026 — actualizar título en
  `centralBankers.ts` cuando se retome después de esa fecha.
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
