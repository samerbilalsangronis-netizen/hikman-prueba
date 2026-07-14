# Handoff — USD Macro Dashboard (para continuar en otro chat)

Fecha de este resumen: 14-jul-2026. Escrito porque la ventana de contexto de la
sesión anterior se estaba por acabar. Pega este archivo completo (o pide a
Claude que lo lea desde el repo) al abrir el chat nuevo.

## Qué es esto

Reemplazo de un Excel de análisis macro (`USD_ENDO_3.xlsx`, 23 hojas, 60
gráficos) por un dashboard web. El Excel mezclaba datos bien mantenidos con
indicadores clave (M2, tasas, balance de la Fed) abandonados desde 2014-2015
sin que se notara. La idea central del proyecto es que **nunca vuelva a pasar
inadvertido** que un dato está viejo — de ahí las insignias de frescura en
cada tarjeta.

Alcance actual: **solo USD**. El usuario quiere agregar después EUR, GBP,
NZD, AUD, CHF, JPY, CAD — **eso es lo próximo, todavía no se empezó**.

## Dónde vive todo

- **Repo**: `samerbilalsangronis-netizen/hikman-prueba` (GitHub)
- **Rama de trabajo**: `claude/macro-usd-web-dashboard-xm5ypk` (única rama, no hay `main`)
- **Deploy**: Vercel, auto-deploy en cada push a esa rama
- **URL en producción**: https://hikman-prueba.vercel.app
- **Base de datos**: Supabase, proyecto `HIKMAN ENDÓGENO`
  - URL: `https://ukwtmsvobrljebomuoxp.supabase.co`
  - anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrd3Rtc3ZvYnJsamVib211b3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDc0NzUsImV4cCI6MjA5OTUyMzQ3NX0.GPCCMKD7voaGi78eJf_S6NoVsWz4J6cu75KwBorhw3U`
  - (clave pública por diseño, va embebida en el sitio; no es secreta)
- **FRED API key**: `bb898209fe9db86c7bb0af38789a4d91` (gratis, del usuario, en fredaccount.stlouisfed.org)
- Variables de entorno en Vercel (Project Settings → Environment Variables):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FRED_API_KEY`

El usuario es **principiante** — hubo que guiarlo paso a paso por Supabase y
Vercel. Sigue sin tener forma de correr el proyecto localmente él mismo; todo
el ciclo es: Claude edita → build/typecheck local → push → Vercel autodeploy →
verificar con curl/Playwright contra la URL de producción.

## Stack técnico

React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Recharts 3 + React Router
(HashRouter, para no necesitar rewrites de SPA en Vercel) + Supabase (Postgres)
+ funciones serverless de Vercel.

### Estructura de carpetas relevante

```
src/
  types.ts                  — tipos: Section, Format, IndicatorMeta (con parentId opcional), etc.
  data/
    indicators.ts            — INDICATORS[] (toda la metadata), SECTION_LABELS, indicatorsBySection()
    historical-series.json   — histórico sembrado, extraído del Excel original
    fredMappings.ts           — mapeo indicador→serie FRED (copia usada solo por el frontend para la insignia "FRED")
    fomcMeetings.ts           — calendario oficial FOMC 2026 (hardcodeado, fuente: federalreserve.gov)
    scoreSeed.ts               — semilla del score compuesto (de la hoja "Resumen USD" del Excel)
    MacroDataContext.tsx      — contexto React: overrides, forecasts, score, fomcWatch. Supabase si está configurado, si no localStorage.
  lib/
    format.ts     — formatValue() por tipo de Format (pct, pct1, index, thousands, billions, ratio, trade)
    freshness.ts  — getFreshness() con umbrales por Frequency (weekly/monthly/quarterly)
  components/
    ChartCard.tsx       — la tarjeta de cada indicador (Anterior/Previsión/Actual + gráfico Recharts). Memoizado (ver sección de bugs).
    SectionGrid.tsx     — grid simple para secciones sin jerarquía (Tasas, Inflación, Empleo, Crecimiento)
    FomcWatchPanel.tsx  — barra de probabilidad para la página Tasas y Fed
    ScorePanel.tsx, FreshnessBadge.tsx, Layout.tsx
  pages/
    Dashboard.tsx, Tasas.tsx, Inflacion.tsx, Empleo.tsx, Crecimiento.tsx,
    Ism.tsx (acordeón custom, no usa SectionGrid), Actualizar.tsx (hub de carga manual)
api/
  fred-sync.ts   — función serverless de Vercel. AUTOCONTENIDA (ver nota abajo), llamada por el botón "Sincronizar con FRED"
supabase/
  schema.sql     — DDL completo (útil solo para un proyecto Supabase nuevo desde cero; el actual ya tiene todo corrido)
```

### Por qué `api/fred-sync.ts` duplica el mapeo de `src/data/fredMappings.ts`

Vercel empaqueta cada función de `/api` por separado y **no logra rastrear
imports que cruzan a `/src`** — probado en producción, falla en runtime con
`ERR_MODULE_NOT_FOUND` / `FUNCTION_INVOCATION_FAILED`. La función tiene que
ser 100% autocontenida. Si cambias un mapeo FRED, **hay que tocar los dos
archivos** (`src/data/fredMappings.ts` para la insignia "FRED" en la UI, y
`api/fred-sync.ts` para la sincronización real).

## Modelo de datos (Supabase)

4 tablas, todas con RLS pero política `using(true) with check(true)` (lectura
y escritura pública — aceptable para un dashboard personal; si algún día se
quiere restringir, activar Supabase Auth y cambiar la policy):

- `indicator_overrides (indicator_id, date, value)` — puntos de series de tiempo, manuales o sincronizados por FRED
- `score_overrides (id, valoracion)` — score compuesto USD (−2 a +2 por indicador)
- `indicator_forecasts (indicator_id, forecast)` — "Previsión" manual por indicador (FRED no publica consensos)
- `fomc_watch (meeting_date, prob_cut, prob_hold, prob_hike, note)` — FOMC Watch manual

El histórico "de fábrica" vive en `src/data/historical-series.json` (extraído
del Excel), y el merge en tiempo de lectura es: seed ∪ overrides de Supabase,
con overrides ganando por fecha exacta. Función `mergeSeries()` en
`MacroDataContext.tsx`.

## Indicadores actuales (41 en total)

**ISM/Sentimiento** (12): `ism_manuf`, `ism_serv` (con acordeón, ver
`parentId`) + 10 subcomponentes manuales (`ism_manuf_new_orders`,
`ism_manuf_production`, `ism_manuf_employment`, `ism_manuf_supplier_deliveries`,
`ism_manuf_inventories`, `ism_manuf_prices`, `ism_serv_business_activity`,
`ism_serv_new_orders`, `ism_serv_employment`, `ism_serv_prices`) +
`sp_pmi_manuf`, `sp_pmi_serv`, `sp_pmi_composite` (S&P Global, manual,
explícitamente distinto del ISM).

**Empleo** (5): `nfp`, `unemployment`, `wage_pct`, `jolts`, `adp` (adp es manual, sin API gratis).

**Inflación** (8): `cpi`, `core_cpi`, `ppi`, `core_ppi` (m/m) + `cpi_yoy`,
`core_cpi_yoy`, `ppi_yoy`, `core_ppi_yoy` (a/a).

**Tasas y Fed** (3): `fed_funds_rate`, `t10y`, `cbbs_pct_gdp`. (M2 se eliminó
a pedido del usuario — ver commit `da3ad03`.)

**Crecimiento** (11): `gdp_qoq`, `gdp_deflator`, `retail_sales`,
`retail_sales_yoy`, `core_retail_sales`, `retail_control` (manual),
`industrial_production`, `industrial_production_yoy`, `trade_balance`,
`empire_state`, `gdpnow` (manual).

Todo lo que **no** viene de FRED se identifica en `Actualizar.tsx` vía el
`Set` `FRED_COVERED` (derivado de `FRED_MAPPINGS`) y se muestra sin campos de
carga manual (solo el campo "Previsión", que es manual para TODOS los
indicadores, vengan o no de FRED).

## Decisiones técnicas importantes (no volver a redescubrir esto)

1. **Tasa de la Fed = `DFEDTARU`** (límite superior del rango objetivo), NO
   `FEDFUNDS` (tasa efectiva promedio). Investing.com/prensa reportan el
   límite superior. Verificado: rango actual 3.50%–3.75%, FEDFUNDS daba 3.63%
   (≈punto medio), DFEDTARU da 3.75% (coincide con Investing). Es una serie
   diaria pero cambia solo ~8 veces al año — se trae ventana de 800
   observaciones y se comprime con `dedupeConsecutive()` en `fred-sync.ts`.

2. **Interanual (a/a) de CPI/PPI usa series SIN ajuste estacional (NSA)**:
   `CPIAUCNS`, `CPILFENS`, `PPIFID`, `PPICOR`. Verificado directo contra la
   API oficial del BLS (`api.bls.gov`), no solo FRED. BLS calcula su tabla de
   "12-month percent change" con NSA.

3. **Interanual (a/a) de Ventas Minoristas y Producción Industrial usa la
   serie AJUSTADA (SA)** — `RSAFS`, `INDPRO` — **la convención opuesta a
   CPI/PPI**. Census y la Fed no siguen la convención de BLS. Verificado
   contra los números reales que el usuario compartió de su Excel/Investing:
   con NSA daba 5.25%/1.63%, con SA da 6.88%/1.67% (coincide exacto). **No
   asumir que "a/a siempre es NSA" — depende de la agencia que publica.**

4. **m/m siempre usa SA** para todo (CPI, PPI, Retail Sales, Producción
   Industrial) — sin excepciones encontradas hasta ahora.

5. **PPI**: las series clásicas `PPIFGS`/`PPILFE` fueron descontinuadas por
   BLS/FRED en dic-2015. Se usan `PPIFIS`/`PPIFES` (metodología "Final
   Demand", vigente) para el m/m, y `PPIFID`/`PPICOR` (sus versiones NSA)
   para el a/a.

6. **Cálculo de variación por FECHA, no por posición en el arreglo**
   (`pctChangeByMonth()` en `fred-sync.ts`, usa `shiftMonths()`). FRED a veces
   tiene huecos (encontré uno real en `CPILFENS` en oct-2025, probablemente
   por el cierre de gobierno de esa fecha) — comparar por índice fijo da mal
   el mes si hay un hueco.

7. **Balance de la Fed (`cbbs_pct_gdp`)**: combina `WALCL` (semanal) y `GDP`
   nominal (trimestral) — para cada fecha semanal de WALCL usa el PIB
   trimestral vigente más reciente en esa fecha (no solo el último PIB).

8. **"Retail Control"** (ventas minoristas excluyendo autos, gasolina,
   materiales de construcción, servicios de comida) **no existe como serie
   propia en FRED** — Census no la publica separada. Queda manual.

9. **GDPNow (Fed Atlanta)**: nowcast sin API/CSV estable descubierta. Manual.

10. **Subcomponentes de ISM y los PMI de S&P Global**: ninguno tiene API
    gratuita (son organizaciones privadas). Todo manual. La descripción de
    S&P Global dice explícitamente que no tiene por qué coincidir con ISM
    (metodologías y paneles de empresas distintos) — esto respondía a una
    confusión real del usuario, que comparaba una fila "PRELIMINAR" del Excel
    (que es de S&P Global, ISM nunca publica preliminar) contra nuestro ISM.

## Bug fixes no obvios (por si reaparecen síntomas parecidos)

- **`ERR_MODULE_NOT_FOUND` en `fred-sync.ts`**: causado por importar desde
  `../src/...`. Solución: función autocontenida (ver arriba).
- **M2 mostraba "$11.8B" en vez de "$11.8T"**: el valor se guarda en miles de
  millones (billions), el formato dividía por 1000 pero etiquetaba mal la
  unidad. (Ya no aplica, M2 se eliminó, pero el patrón de formato `'trade'`
  en `format.ts` para `trade_balance` sigue el mismo cuidado con unidades.)
- **Gráficos con ejes cortados**: el `margin.left` negativo en los
  `<ResponsiveContainer>` de Recharts chocaba con el `width` del `YAxis`
  cuando el texto formateado era largo (ej. "-40.00%"). Se corrigió
  ajustando `left: 0` y `width={54}` en `ChartCard.tsx`.

## El problema sin resolver: el acordeón de ISM sigue sin funcionar para el usuario

Esto es lo más urgente para la próxima sesión.

**Qué se intentó:**
1. Primero solo un botón chevron pequeño era clickeable (▸ N) — el usuario
   probablemente hacía clic en el título/gráfico y no pasaba nada.
2. Se cambió para que **todo el encabezado** (título + descripción +
   insignias) sea un solo `<button>` que llama a `onToggle`.
3. Al probar con Playwright localmente y en producción, se encontró que un
   **`fullPage: true` screenshot de Playwright** hacía que las barras del
   gráfico Recharts desaparecieran después de expandir — pero se confirmó con
   certeza (comparando `fullPage:false` vs `fullPage:true` en el MISMO
   instante) que **esto era un artefacto de la herramienta de captura, no un
   bug real**: un screenshot normal (no fullPage) tomado en el mismo momento
   mostraba las barras perfectamente.
4. De todas formas se dejaron dos mejoras reales y correctas (no dañinas,
   buena práctica): `ChartCard` envuelto en `React.memo` con comparación por
   contenido (no por referencia) del array `points`, y el array `data` que
   recibe Recharts memoizado con `useMemo` por una clave de contenido
   (`dataKey`). Esto evita que tarjetas no relacionadas se vuelvan a
   renderizar (y sus gráficos reinicien animación) cuando se hace clic en el
   acordeón de OTRA tarjeta.
5. Se hizo commit `675fee5` con el fix de "toda la tarjeta clickeable" y se
   verificó que el bundle desplegado (`index-BgQ35QlC.js` al momento de este
   resumen) contiene el código nuevo.
6. **El usuario reportó que sigue sin funcionar DESPUÉS de este fix.**

**Lo que NO se ha probado/descartado todavía:**
- Puede ser **caché del navegador** del usuario (bundle JS viejo servido por
  el navegador o por un CDN/proxy intermedio) — pedirle que haga un hard
  refresh (Ctrl+Shift+R / Cmd+Shift+R) o pruebe en una ventana de incógnito.
- Puede ser un problema específico de su **navegador o dispositivo**
  (¿celular? ¿Safari? ¿algún bloqueador de scripts?) — no se le preguntó
  explícitamente.
- Puede que el usuario esté describiendo un síntoma distinto a "no
  reacciona al clic" — por ejemplo, que expanda pero se vea mal, o que
  colapse solo, o que confunda qué tarjeta es expandible (los 3 PMI de S&P
  Global NO tienen acordeón, son tarjetas planas — si intenta hacer clic ahí
  esperando que se expanda, no va a pasar nada, y eso es **correcto**, no un
  bug).
- No se verificó con una captura de pantalla real del usuario mostrando qué
  pasa cuando hace clic.

**Primer paso recomendado en el chat nuevo**: pedirle al usuario una captura
de pantalla o video corto de qué pasa exactamente cuando hace clic (¿en qué
tarjeta? ¿qué navegador/dispositivo? ¿pasó por un hard refresh?), en vez de
seguir asumiendo causas. Ya se descartó que sea un bug de renderizado de
Recharts (confirmado con evidencia).

## Pendiente explícito: expansión a otras divisas

El usuario quiere EUR, GBP, NZD, AUD, CHF, JPY, CAD. Ya se investigó (no se
implementó nada todavía):

**Datos "duros" (CPI, empleo, tasa oficial, PIB) — gratis, mismo patrón que FRED:**
- CAD → Bank of Canada Valet API (sin key)
- CHF → SNB Data Portal `data.snb.ch` (sin key, REST público)
- JPY → BOJ Time-Series API + e-Stat Dashboard API (sin key)
- EUR → ECB Data Portal / SDW (sin key)
- GBP → ONS API + Bank of England IADB (sin key)
- AUD → ABS Indicator API (key gratis por email, no instantánea)
- NZD → RBNZ (solo archivos descargables, no API REST limpia — más manual)

**Previsión de tasas estilo FedWatch — NO hay solución gratuita para las 7 divisas nuevas:**
- CME FedWatch API existe y es barata (US$25/mes) pero **solo cubre USD/Fed**.
- `rateprobability.com` cubre 8 bancos centrales por US$22/mes pero **no
  tiene API para desarrolladores** (solo widget web) — no integrable sin
  scraping (no recomendado).
- Alternativa real: comprar datos de futuros crudos (SOFR, €STR, SONIA, ASX
  cash rate, etc.) de un proveedor genérico (Barchart, EODHD, Twelve Data) y
  replicar la fórmula pública de FedWatch nosotros mismos — más trabajo de
  ingeniería, cobertura completa en un solo proveedor.
- Hay un informe completo en un Artifact publicado durante la sesión anterior
  (buscar "investigacion-apis" si se necesita releer el detalle completo,
  con tabla de precios y links).

**Decisión de arquitectura pendiente** (no tomada aún): cómo modelar
multi-divisa — ¿namespacear ids (`eur_cpi`, `gbp_cpi`...) reusando el mismo
`INDICATORS[]`? ¿Agregar un campo `currency` a `IndicatorMeta` y filtrar por
selector? ¿Páginas separadas por divisa vs. un switcher global? El usuario no
ha dado preferencia todavía — preguntarle al retomar.

## Cómo verificar cosas (comandos que ya funcionaron en esta sesión)

```bash
# Build + typecheck del frontend
npm run build

# Typecheck de la función serverless (Vercel la compila aparte, con su propio tsconfig ad-hoc)
cat > tsconfig.api-check.json << 'EOF'
{ "compilerOptions": { "strict": true, "esModuleInterop": true, "skipLibCheck": true,
  "module": "esnext", "moduleResolution": "bundler", "target": "es2022",
  "types": ["node"], "noEmit": true, "resolveJsonModule": true },
  "include": ["api/**/*.ts"] }
EOF
npx tsc -p tsconfig.api-check.json
rm tsconfig.api-check.json

# Probar el sync de FRED en producción directo
curl -s "https://hikman-prueba.vercel.app/api/fred-sync" -X POST --max-time 30

# Consultar/editar Supabase directo por REST (sirve para diagnosticar sin abrir el dashboard)
ANON="<la clave de arriba>"
curl -s "https://ukwtmsvobrljebomuoxp.supabase.co/rest/v1/indicator_overrides?indicator_id=eq.XXX&select=*" -H "apikey: $ANON"
```

**Nota sobre Playwright en este entorno**: para probar contra la URL pública
de producción (no localhost) hace falta el proxy de salida
(`https_proxy=http://127.0.0.1:42603`, ver `/root/.ccr/README.md`), y aun así
tuvo fallas de conexión intermitentes (`ERR_CONNECTION_RESET`) que nunca se
resolvieron del todo — para probar UI contra producción fue más confiable
levantar `npm run preview` local y probar ahí, confiando en que el build es
idéntico al desplegado (mismo `vite build`).

## Estilo de trabajo esperado por el usuario (patrones ya establecidos)

- Escribe en mayúsculas, español, directo. No le expliques de más;
  respuestas cortas y accionables.
- Es principiante en despliegue/infra — cualquier paso en Supabase/Vercel
  necesita instrucciones tipo "clic acá, pega esto".
- Le importa mucho la **exactitud de los datos** — varias veces detectó
  discrepancias reales comparando contra Investing.com/su Excel, y todas
  resultaron en bugs reales que valió la pena arreglar (nunca asumir que "está
  bien, son solo redondeos" sin verificar contra la fuente primaria).
- Prefiere que Claude investigue y proponga antes de implementar cuando hay
  ambigüedad (ver uso de `AskUserQuestion` en la sesión anterior).
- Después de cada cambio: build local, typecheck, verificar visualmente con
  Playwright cuando aplica, commit con mensaje descriptivo en español, push,
  esperar el redeploy de Vercel (poll con `curl` en background), y **siempre
  reportar con datos concretos** (valores reales, no solo "ya funciona").
