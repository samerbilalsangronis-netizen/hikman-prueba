# Handoff — HIKMAN ENDÓGENO (dashboard macro multi-divisa) — para continuar en otro chat

Fecha de este resumen: 17-jul-2026. Escrito porque la ventana de contexto de
la sesión anterior se estaba por acabar. Pega este archivo completo (o pide a
Claude que lo lea desde el repo) al abrir el chat nuevo.

## Qué es esto

Reemplazo de Excels de análisis macro (uno por divisa) por un dashboard web
multi-divisa. La idea central del proyecto es que **nunca vuelva a pasar
inadvertido** que un dato está viejo o mal calculado — de ahí las insignias
de frescura en cada tarjeta y la obsesión por verificar cada serie contra la
fuente oficial antes de automatizarla.

**Estado actual: USD y EUR completos y en producción. GBP es el próximo paso
— el usuario dijo que iba a mandar el Excel de la Libra pero todavía no
llegó adjunto. Pedírselo apenas se retome.** Después de GBP faltan NZD, AUD,
CHF, JPY, CAD (ver sección de investigación más abajo, hecha en una sesión
previa, todavía vigente).

## Dónde vive todo

- **Repo**: `samerbilalsangronis-netizen/hikman-prueba` (GitHub)
- **Rama de trabajo**: `claude/macro-usd-web-dashboard-xm5ypk` (única rama "real", no hay `main`). Esta sesión trabajó desde `claude/file-contents-review-9zq0mo` y se pusheó a ambas — **cualquier sesión nueva debería confirmar cuál es la rama activa actual** con `git log <rama> -1` en ambas y comparar con lo desplegado en Vercel antes de asumir.
- **Deploy**: Vercel, auto-deploy en cada push a la rama de producción
- **URL en producción**: https://hikman-prueba.vercel.app
- **Pestaña del navegador**: "HIKMAN ENDÓGENO" (antes decía "USD Macro")
- **Base de datos**: Supabase, proyecto `HIKMAN ENDÓGENO`
  - URL: `https://ukwtmsvobrljebomuoxp.supabase.co`
  - anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrd3Rtc3ZvYnJsamVib211b3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDc0NzUsImV4cCI6MjA5OTUyMzQ3NX0.GPCCMKD7voaGi78eJf_S6NoVsWz4J6cu75KwBorhw3U`
  - (clave pública por diseño, va embebida en el sitio; no es secreta)
- **FRED API key**: `bb898209fe9db86c7bb0af38789a4d91` (gratis, del usuario, en fredaccount.stlouisfed.org)
- Variables de entorno en Vercel (Project Settings → Environment Variables):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FRED_API_KEY`

El usuario es **principiante en infra pero exigente con la exactitud de los
datos**. Hubo que guiarlo paso a paso por Supabase (crear tablas por SQL,
2 veces esta sesión por errores de sintaxis — ver "Bugs no obvios"). Sigue
sin poder correr el proyecto localmente; todo el ciclo es: Claude edita →
build/typecheck local → push → Vercel autodeploy → verificar con
curl/Playwright contra producción (o contra `npm run preview` local cuando
Playwright no puede llegar a producción, ver nota de proxy al final).

## Stack técnico

React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Recharts 3 + React Router
(HashRouter) + Supabase (Postgres) + funciones serverless de Vercel.

### Estructura de carpetas relevante

```
src/
  types.ts                 — Section, Format, Currency, IndicatorMeta, ScoreRow,
                              CentralBanker, BankerNote, Statement, BankerVoteStatus, Stance
  data/
    indicators.ts           — INDICATORS[] = [...USD_INDICATORS, ...EUR_INDICATORS],
                              SECTION_LABELS (por Currency), indicatorsBySection(section, currency)
    indicatorsEur.ts         — EUR_INDICATORS[], ids con prefijo eur_
    historical-series.json  — histórico sembrado (USD + los manuales de EUR)
    fredMappings.ts          — FRED_MAPPINGS (USD) + EUR_FRED_MAPPINGS + EUR_EUROSTAT_INDICATOR_ID
                              (copia usada solo por el frontend para la insignia "FRED"/"EUROSTAT")
    fomcMeetings.ts          — calendario oficial FOMC 2026 (hardcodeado)
    scoreSeed.ts             — semilla del score USD (incluye 'uom' y 'cb', ver más abajo)
    scoreSeedEur.ts          — semilla del score EUR (de la hoja "Resumen EUR" del Excel)
    centralBankers.ts        — FED_BANKERS[] / ECB_BANKERS[], bankersForCurrency(currency).
                              Verificado por WebSearch jul-2026, con fotos de Wikimedia Commons.
    CurrencyContext.tsx      — selector de moneda global (USD/EUR), persistido en localStorage
    MacroDataContext.tsx     — contexto React: overrides, forecasts, score, fomcWatch, bankerNotes.
                              Supabase si está configurado, si no localStorage. OJO: fetchAllRows()
                              pagina indicator_overrides — ver bug de 1000 filas más abajo.
  lib/
    format.ts, freshness.ts
  components/
    ChartCard.tsx, SectionGrid.tsx, FomcWatchPanel.tsx (solo se muestra si currency==='USD'),
    ScorePanel.tsx (ahora con prop onChangeValoracion para editar inline), FreshnessBadge.tsx, Layout.tsx
  pages/
    Dashboard.tsx      — score editable inline, ya NO tiene "Indicadores Clave"
    Tasas.tsx, Inflacion.tsx, Empleo.tsx
    Crecimiento.tsx    — tiene el acordeón (antes vivía en Ism.tsx) porque ahí viven ahora
                         los PMI con subcomponentes (ism_manuf, ism_serv)
    Sentimiento.tsx    — (antes Ism.tsx) sección "Confianza / Sentimiento", ruta /confianza
    Banqueros.tsx      — nueva, ruta /banqueros
    Actualizar.tsx     — ya NO tiene la tabla de score (se edita desde Resumen)
api/
  fred-sync.ts   — función serverless autocontenida, botón "Sincronizar con FRED" (USD)
  eur-sync.ts    — ídem para EUR: FRED (tasas BCE, CPI, PIB) + Eurostat directo (desempleo)
supabase/
  schema.sql     — DDL completo, incluye banker_statements (agregada esta sesión)
```

### Por qué `api/fred-sync.ts` y `api/eur-sync.ts` duplican los mapeos de `src/data/`

Vercel empaqueta cada función de `/api` por separado y **no logra rastrear
imports que cruzan a `/src`** — falla en runtime con `ERR_MODULE_NOT_FOUND`.
Cada función serverless tiene que ser 100% autocontenida. Si cambias un
mapeo, **hay que tocar los dos archivos** (el de `/src` es solo para la
insignia en la UI, el de `/api` es el que realmente sincroniza).

## Arquitectura multi-divisa (decidida e implementada esta sesión)

- **Selector global de moneda** en el header (`CurrencyContext`), no rutas
  separadas por divisa. Las mismas pestañas de navegación cambian de
  contenido según la moneda activa.
- **Mismo `INDICATORS[]`**, namespaced por prefijo de id (`eur_cpi`, futuro
  `gbp_cpi`...) + campo `currency` en `IndicatorMeta` (opcional, ausente =
  `'USD'`, así no hubo que tocar los 41 indicadores originales).
- `ScoreRow` tiene el mismo patrón: campo `currency` opcional, arrays
  `USD_SCORE_SEED` / `EUR_SCORE_SEED` concatenados en `MacroDataContext`.
- `SECTION_LABELS` es `Record<Currency, Record<string, string>>` — mismo
  `section` interno (`tasas`, `inflacion`, `empleo`, `crecimiento`,
  `confianza`, `score`), pero el texto mostrado puede diferir por moneda
  (ej. "Tasas y Fed" vs "Tasas y BCE").
- Tablas de Supabase son compartidas entre monedas (no tienen columna
  `currency`) — la separación es puramente por el prefijo del id. Nunca
  reutilizar un id de USD para otra moneda.
- Patrón de sourcing por indicador (repetir para cada divisa nueva):
  1. Buscar si el dato está en FRED (busca "euro area X fred", suele
     estar bajo series con prefijo raro tipo `CP0000EZ19M086NEST`).
  2. Si no, buscar la fuente oficial del país (Eurostat, ONS, BoJ, etc.)
     con API REST gratis sin key.
  3. **Verificar el número contra una fuente de referencia real** (Excel
     del usuario, o un calendario económico) antes de dar por buena la
     automatización — dos veces esta sesión un cálculo "lógico" resultó
     con un sesgo real de ~0.1pp (ver sección de decisiones técnicas).
  4. Si no hay API gratis confiable, o el número no coincide con la
     fuente real y no se puede explicar el porqué, **queda manual** (no
     forzar automatización con datos no verificados).

## Modelo de datos (Supabase)

5 tablas, todas con RLS `using(true) with check(true)` (lectura/escritura
pública — aceptable para dashboard personal):

- `indicator_overrides (indicator_id, date, value)` — series de tiempo, manuales o sincronizadas
- `score_overrides (id, valoracion)` — score compuesto, USD y EUR mezclados (ids distintos)
- `indicator_forecasts (indicator_id, forecast)` — previsión manual
- `fomc_watch (meeting_date, prob_cut, prob_hold, prob_hike, note)` — solo USD, manual
- `banker_statements (banker_id, current_statement_date, current_stance, current_summary,
  current_source_url, previous_statement_date, previous_stance, previous_summary,
  previous_source_url)` — **nueva esta sesión**. Un registro por banquero; al cargar un
  comunicado nuevo, el "actual" pasa a "anterior" (lo hace el código, no SQL).
  Las fotos y el listado de banqueros (nombre/cargo/si vota) NO están acá — viven
  hardcodeados en `src/data/centralBankers.ts`.

## Indicadores actuales

**USD (~43)**: los 41 originales (ver historial de commits para el desglose
completo) **más 2 nuevos esta sesión**: `uom` (Sentimiento del Consumidor U.
Michigan, auto vía FRED `UMCSENT`) y `cb` (Confianza del Consumidor
Conference Board, manual) — ya estaban referenciados en `scoreSeed.ts` desde
un principio pero nunca se habían dado de alta como indicadores/tarjetas.

**EUR (20)**, todos en `indicatorsEur.ts`, ids con prefijo `eur_`:
- Tasas (3, todas auto vía FRED): `eur_ecb_deposit_rate` (ECBDFR),
  `eur_ecb_refi_rate` (ECBMRRFR), `eur_ecb_marginal_rate` (ECBMLFR)
- Inflación (4): `eur_cpi`, `eur_core_cpi` (m/m, **auto** vía FRED
  `CP0000EZ19M086NEST` / `TOTNRGFOODEA20MI15XM`) + `eur_cpi_yoy`,
  `eur_core_cpi_yoy` (a/a, **manual** — ver por qué abajo)
- Empleo (3): `eur_unemployment` (auto vía **Eurostat directo**, no FRED),
  `eur_wage_yoy`, `eur_labor_cost_yoy` (manuales)
- Confianza/Sentimiento (3): `eur_consumer_confidence`,
  `eur_business_confidence`, `eur_zew_sentiment` (todos manuales)
- Crecimiento (7): `eur_gdp_qoq`, `eur_gdp_yoy` (auto vía FRED
  `CLVMNACSCAB1GQEA19`) + `eur_pmi_manuf_flash`, `eur_pmi_serv_flash`,
  `eur_retail_sales`, `eur_retail_sales_yoy`, `eur_industrial_production`
  (manuales)

## Reorganización de secciones (esta sesión)

Los PMI (ISM + S&P Global en USD; PMI Flash en EUR) son indicadores de
**actividad/crecimiento**, no de confianza pura — se movieron todos a la
sección `crecimiento` (junto con el acordeón de subcomponentes, que antes
vivía en `Ism.tsx` y ahora vive en `Crecimiento.tsx`). La sección que
quedó (antes "ISM/PMI Sentimiento") se renombró internamente `confianza` y
en pantalla **"Confianza / Sentimiento"** — agrupa encuestas de confianza
pura (`uom`, `cb` para USD; `eur_consumer_confidence`,
`eur_business_confidence`, `eur_zew_sentiment` para EUR). Ruta `/ism` →
`/confianza`, archivo `Ism.tsx` → `Sentimiento.tsx`.

**Si agregás otra divisa**: sus PMI van a `crecimiento`, sus encuestas de
confianza del consumidor/empresarial van a `confianza`. No repetir el
error de meter PMI en confianza otra vez.

## Score compuesto — ahora editable desde el Resumen

`ScorePanel` acepta `onChangeValoracion?: (id, valoracion) => void` — si se
pasa, cada fila muestra un `<select>` en vez de un badge estático. Dashboard
lo pasa (`updateScoreValoracion` de `MacroDataContext`), Actualizar.tsx ya
NO tiene la tabla de score (se sacó, estaba duplicada). Se sacó también la
sección "Indicadores Clave" del Resumen (el score editable la reemplaza).

## Sección de Banqueros Centrales (`/banqueros`, nueva esta sesión)

Composición **verificada por WebSearch** (jul-2026, no inventada):

- **Fed (19)**: 7 Junta de Gobernadores (Kevin Warsh=Chair, Philip
  Jefferson=Vice Chair, Barr, Bowman, Cook, Powell, Waller) + John Williams
  (NY, voto permanente) — todos "voting". 4 presidentes regionales en
  rotación 2026: Hammack (Cleveland), Kashkari (Minneapolis), Logan
  (Dallas), Paulson (Filadelfia) — "rotating". 6 que no votan este año:
  Collins (Boston), Barkin (Richmond), Goolsbee (Chicago), Musalem (St.
  Louis), Schmid (Kansas City), Daly (San Francisco). **Atlanta vacante**
  (Bostic renunció feb-2026, sucesor no confirmado — no se agregó nadie).
- **BCE (10)**: Comité Ejecutivo (6: Lagarde=Presidenta, Vujčić=Vice,
  Lane, Schnabel, Elderson, Cipollone) — "voting". 4 gobernadores
  nacionales del Grupo 1 (países grandes, rotan un voto entre sí): Nagel
  (Alemania/Bundesbank), Moulin (Francia/Banque de France — asumió jun-2026,
  reemplazó a Villeroy de Galhau), Panetta (Italia), Escrivá (España) —
  "rotating". **Faltan los ~16 gobernadores del Grupo 2** (países más
  chicos) — pendiente, no se investigó todavía.
- **Fotos**: 22 de 32 banqueros tienen foto real de Wikimedia Commons
  (`photoUrl` hardcodeado en `centralBankers.ts`, verificado con la API de
  Wikipedia `action=query&prop=pageimages`, cada URL confirmada con HEAD
  request). Los 5 sin foto (Logan, Paulson, Barkin, Musalem, Lane) muestran
  placeholder de iniciales — no se inventó ninguna URL.
- **Comunicado actual/anterior**: `BankerNote { current?, previous? }`. Al
  guardar uno nuevo vía `addBankerStatement(bankerId, statement)`, el
  código mueve el que era `current` a `previous` automáticamente (mismo
  patrón Anterior/Actual del resto del dashboard) — esto NO lo hace SQL,
  lo hace `MacroDataContext.tsx` leyendo el estado anterior antes de
  sobreescribir.
- Tarjeta: foto cuadrada grande (24×24, no circular), cargo, badge de si
  vota, link a perfil oficial, dos bloques de comunicado (actual/anterior)
  con fecha + hawkish/dovish/neutral + resumen + fuente, botón "Cargar
  nuevo comunicado".

## Decisiones técnicas importantes (no volver a redescubrir esto)

**De la sesión de USD original** (siguen vigentes, ver también el historial
de commits si hace falta más detalle):
1. Tasa de la Fed = `DFEDTARU` (límite superior), no `FEDFUNDS`.
2. a/a de CPI/PPI usa series NSA (`CPIAUCNS`, `CPILFENS`, `PPIFID`, `PPICOR`).
3. a/a de Retail Sales/Producción Industrial usa SA (`RSAFS`, `INDPRO`) —
   convención opuesta a CPI/PPI, no asumir que "a/a siempre es NSA".
4. m/m siempre usa SA.
5. PPI clásico (`PPIFGS`/`PPILFE`) discontinuado dic-2015, se usa
   `PPIFIS`/`PPIFES` (m/m) y `PPIFID`/`PPICOR` (a/a).
6. Variación por FECHA no por posición (`shiftMonths`), por huecos en FRED.
7. Balance de la Fed combina `WALCL` semanal con el PIB trimestral vigente.

**Nuevas de esta sesión (EUR + infraestructura)**:

8. **Desempleo EUR: FRED tiene la serie discontinuada desde 2023**
   (`LRHUTTTTEZM156S` y variantes, último dato 2022-2023). Se sincroniza
   directo desde **Eurostat** (`une_rt_m`, geo=`EA21` — código vigente de
   la Eurozona, Eurostat lo cambia según la composición de miembros, antes
   era EA19/EA20). Verificado: coincide exacto con el Excel del usuario.

9. **CPI/Core CPI a/a de EUR: NO se puede derivar de forma confiable del
   índice HICP de FRED**. FRED publica el índice `CP0000EZ19M086NEST` /
   `TOTNRGFOODEA20MI15XM` redondeado a 2 decimales; calcular el a/a como
   cociente de dos observaciones (mismo método que funciona bien para
   USD) da un sesgo real de ~0.1pp que se acumula al componerse sobre 12
   meses (dio 2.7%/2.4% cuando el dato FINAL oficial confirmado por el
   usuario era 2.8%/2.4%). El dataset de Eurostat con la tasa a/a ya
   calculada (`prc_hicp_manr`) está **discontinuado desde feb-2026**
   (verificado: "updated" del dataset quedó parado en esa fecha). Por
   eso `eur_cpi_yoy`/`eur_core_cpi_yoy` quedaron manuales — el m/m
   (`eur_cpi`/`eur_core_cpi`) SÍ coincide exacto y sigue automático.
   **Lección general: verificar SIEMPRE el a/a contra un dato final real
   antes de asumir que un cálculo derivado del índice es suficientemente
   preciso — funciona para unos países/series y para otros no.**

10. **PIB EUR (`eur_gdp_qoq`/`eur_gdp_yoy`)**: Eurostat reporta la
    variación trimestral **SIN anualizar** (a diferencia de BEA/EE.UU. que
    sí anualiza). Se computa como `pct_change` de 3 meses (nuevo
    transform `pct_change_quarter` en `fredMappings.ts`/`eur-sync.ts`),
    no con la fórmula de anualización que usa USD.

11. **Bug grave de Supabase encontrado y arreglado**: PostgREST (la API
    REST de Supabase) tiene un límite de 1000 filas por página
    (`db-max-rows`) — un `.select()` sin `.range()` se trunca **en
    silencio, sin error**, una vez que la tabla supera esa cantidad. Con
    41 indicadores USD + 20 EUR sincronizados mes a mes,
    `indicator_overrides` ya pasó los 1000 registros (1154 al momento de
    encontrar el bug) — cada carga de página perdía una parte de los
    datos según el orden en que Postgres los devolviera. Esto era la
    causa real del reporte "muchos datos no actualizan con la FRED" y del
    desempleo EUR mostrando un dato de 5 meses atrás. **Arreglado** con
    `fetchAllRows()` en `MacroDataContext.tsx` — pagina con `.range()`
    hasta traer todo. **Si en el futuro algo "no se actualiza" pero los
    datos están bien en Supabase, sospechar primero de este patrón**
    (cualquier `.select()` sin `.range()` en una tabla grande).

12. **`current_date` es palabra reservada de PostgreSQL** (función
    incorporada, devuelve la fecha de hoy) — no se puede usar como nombre
    de columna, da error de sintaxis. Se usó `current_statement_date` /
    `previous_statement_date` en su lugar. Revisar nombres de columna
    contra la lista de palabras reservadas de Postgres antes de crear
    tablas nuevas (`current_date`, `current_time`, `current_timestamp`,
    `user`, `order`, etc. son los más comunes de pisar por accidente).

13. **Google Translate rompe el editor SQL de Supabase**: si el navegador
    tradujo la página automáticamente, también traduce el texto del
    editor SQL (nombres de tabla/columna incluidos), produciendo SQL
    inválido con errores de sintaxis confusos. Si el usuario reporta un
    error de sintaxis raro al correr SQL que vos redactaste bien, **lo
    primero es preguntar si la página está traducida** (ícono 🌐 en la
    barra de direcciones) antes de asumir que el SQL está mal.

14. **API de Wikipedia/Wikimedia necesita User-Agent explícito** — sin
    headers, `urllib`/requests simples dan 403. Con
    `User-Agent: 'NombreApp/1.0 (contacto)'` funciona. Además, pegarle
    muy seguido a `upload.wikimedia.org` con HEAD requests da 429 rápido
    — no hace falta verificar cada URL con HEAD si la API de pageimages
    ya devolvió la miniatura (si la API la devuelve, el archivo existe).

15. **Playwright en este sandbox no puede cargar imágenes externas
    (`upload.wikimedia.org`) ni videos** sin pasarle `proxy: { server:
    'http://127.0.0.1:PUERTO', bypass: 'localhost,127.0.0.1' }` en
    `chromium.launch()` — el puerto cambia entre sesiones/turnos, mirar
    `echo $https_proxy` antes de usarlo. Aun con proxy configurado,
    cargar imágenes de Wikimedia specifically siguió sin funcionar en las
    pruebas de este sandbox (probablemente por el certificado MITM del
    proxy) — **esto es una limitación del entorno de pruebas, no un bug
    real**: las fotos SÍ cargan en un navegador normal de un usuario real
    (se verificó cada URL con `curl` normal, que si respeta el proxy del
    sistema y dio 200 image/jpeg). No perder tiempo tratando de renderizar
    imágenes externas en Playwright dentro de este sandbox — confiar en
    la verificación por `curl`/HEAD en su lugar.

## Bugs no obvios (por si reaparecen síntomas parecidos)

- **`ERR_MODULE_NOT_FOUND` en funciones `/api`**: por importar desde
  `../src/...`. Solución: función 100% autocontenida.
- **Acordeón de ISM "no hacía nada" al hacer clic**: el clic sí
  funcionaba, pero el panel expandido se renderizaba en una sección
  aparte al final de la página (después de todas las tarjetas), muy por
  debajo del scroll visible sin hacer scroll manual. Se arregló
  insertando el panel con `col-span-full` **justo debajo de la tarjeta
  clickeada**, dentro del mismo grid. Patrón replicado en
  `Crecimiento.tsx` cuando el acordeón se movió ahí.
- **Truncamiento silencioso a 1000 filas** — ver punto 11 arriba.
- **`current_date` como nombre de columna** — ver punto 12 arriba.

## Pendiente explícito: expansión a otras divisas

**GBP es el próximo paso — pedirle el Excel al usuario apenas se retome
(dijo que lo iba a mandar, nunca llegó adjunto).** Una vez con el Excel,
seguir el mismo proceso que con EUR:
1. Leer el Excel con la skill de xlsx, identificar hojas reales vs.
   posibles restos de otro Excel (pasó con EUR: 6 de 14 hojas eran basura
   de USD).
2. Catalogar cada indicador real, con qué frecuencia, y comparar con la
   "Resumen" (score) si existe.
3. Para cada indicador, investigar si hay serie en FRED, si no buscar la
   fuente oficial del país (para GBP: **ONS API** + **Bank of England
   IADB**, ambas sin key, ya investigadas en una sesión previa — ver
   tabla de investigación más abajo).
4. Verificar cada auto-sync propuesto contra un dato real antes de
   confiar en él (aprendizaje de EUR: el a/a de CPI casi se automatiza mal).
5. Preguntarle al usuario qué tasa de referencia del BoE usar (el BoE
   tiene una sola Bank Rate, más simple que las 3 del BCE) y si quiere el
   Monetary Policy Committee (9 miembros: Governor + Deputies + externos)
   en Banqueros — investigar composición real con WebSearch antes de
   escribir nombres.
6. Agregar sección de Banqueros para GBP (BoE MPC) siguiendo el patrón de
   `centralBankers.ts` — recordar el patrón de fotos vía Wikipedia API +
   verificación con HEAD antes de hardcodear URLs.

**Después de GBP**: NZD, AUD, CHF, JPY, CAD. Investigación previa (de una
sesión anterior a esta, todavía no verificada con el rigor que se le dio a
EUR — repetir el proceso de verificación, no asumir que sigue siendo exacto):

- CAD → Bank of Canada Valet API (sin key)
- CHF → SNB Data Portal `data.snb.ch` (sin key, REST público)
- JPY → BOJ Time-Series API + e-Stat Dashboard API (sin key)
- AUD → ABS Indicator API (key gratis por email, no instantánea)
- NZD → RBNZ (solo archivos descargables, no API REST limpia — más manual)

**Previsión de tasas estilo FedWatch — sigue sin solución gratuita** para
ninguna divisa nueva (por eso se decidió omitir el panel tipo FOMC Watch
para EUR, y probablemente para las demás también, salvo que el usuario
pida lo contrario):
- CME FedWatch API (barata, US$25/mes) solo cubre USD/Fed.
- `rateprobability.com` cubre 8 bancos centrales por US$22/mes pero sin
  API para desarrolladores (solo widget web).
- Alternativa real no explorada: comprar futuros crudos (SOFR, €STR,
  SONIA, ASX cash rate) de un proveedor genérico y replicar la fórmula de
  FedWatch — más trabajo de ingeniería.

## Gaps conocidos (no ocultar, mencionar si el usuario pregunta)

- ECB: faltan ~16 gobernadores nacionales del Grupo 2 en Banqueros.
- 5 banqueros sin foto verificada: Lorie Logan, Anna Paulson, Thomas
  Barkin, Alberto Musalem (Fed), Philip Lane (BCE) — muestran iniciales.
- Atlanta Fed sin presidente confirmado (vacante desde renuncia de Bostic).
- Ninguna divisa nueva tiene panel de previsión de tasas tipo FOMC Watch.
- Histórico de `eur_cpi_yoy`/`eur_core_cpi_yoy` en `historical-series.json`
  tiene el mismo sesgo de ~0.1pp que se corrigió solo para el último punto
  (jun-2026) — los meses viejos quedan aproximados, no exactos.

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
real con Supabase, solo la UI/lógica de componentes).

## Estilo de trabajo esperado por el usuario (patrones ya establecidos)

- Escribe en mayúsculas, español, directo. No explicar de más; respuestas
  cortas y accionables.
- Beginner en infra — cualquier paso en Supabase/Vercel necesita
  instrucciones tipo "clic acá, pegá esto", y el SQL para copiar/pegar
  completo, no fragmentos para armar a mano.
- Le importa mucho la **exactitud de los datos** — varias veces detectó
  discrepancias reales comparando contra su Excel o un calendario
  económico, y todas resultaron en bugs reales que valió la pena arreglar
  (nunca asumir que "está bien, son solo redondeos" sin verificar contra
  la fuente primaria — esta sesión pasó dos veces con EUR).
- Prefiere que Claude investigue y proponga antes de implementar cuando
  hay ambigüedad real (se usó `AskUserQuestion` varias veces esta sesión:
  navegación por moneda, cobertura de indicadores EUR, qué tasa del BCE
  usar).
- Pide varios cambios juntos en un solo mensaje a veces — está bien
  ejecutarlos todos en la misma sesión, con `TaskCreate`/`TaskUpdate` para
  no perder el hilo, y avisar del progreso a medida que se completa cada uno.
- Después de cada cambio: build local, typecheck, verificar visualmente
  con Playwright cuando aplica (`npm run preview` + capturas), commit con
  mensaje descriptivo en español, push a **las dos ramas** (la de trabajo
  de la sesión y `claude/macro-usd-web-dashboard-xm5ypk` si son distintas),
  esperar el redeploy de Vercel (poll con `curl` comparando el hash del
  bundle JS), y **siempre reportar con datos concretos** (valores reales,
  capturas, no solo "ya funciona").
