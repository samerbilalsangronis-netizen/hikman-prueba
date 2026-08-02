# Handoff — HIKMAN ENDÓGENO (dashboard macro multi-divisa) — para continuar en otro chat

Fecha de este resumen: **2-ago-2026**, actualizado al cierre de la
sesión de ese día (la continuación directa de la tanda larga del
1-ago tarde/noche — mismo chat, sin cortar). Pega este archivo completo
(o pedile a Claude que lo lea desde el repo) al abrir el chat nuevo —
está pensado para ser autocontenido. El documento es largo y crece
cronológicamente (sesión por sesión, sin borrar nada viejo) — si solo
hace falta agarrar viaje rápido, leer esta sección y la de
**"## Sesión 2-ago-2026: ..."** más abajo (la más nueva) alcanza; el
resto queda como referencia histórica por divisa/feature.

## ⚠️ Arrancar por acá: estado al cierre de la sesión del 2-ago-2026

Todo mergeado y en producción (`claude/macro-usd-web-dashboard-xm5ypk`).
Resumen de lo que se hizo esta sesión (detalle completo en las
secciones "PMI headline", "Bug: Cargando…" y "Sesión 2-ago-2026" más
abajo):

- **PMI headline con historial real**: se investigó y descartó que los
  subcomponentes de PMI (Nuevas Órdenes/Producción/Empleo/Precios)
  tengan fuente gratis fuera de ISM/NBS China — el resto (S&P Global,
  BusinessNZ, procure.ch) solo publica el headline gratis. Se cargó el
  **headline completo de 2025 (12 meses) + 2026 hasta la fecha** en las
  8 economías: EUR/GBP (ya tenían desde 2008, no hacía falta nada),
  S&P Global USD (distinto de ISM), Japón, Australia, Canadá, Nueva
  Zelanda, Suiza (Manufactura Y Servicios — Servicios de Suiza nunca
  había tenido dato, se cargó de cero).
- **Insignia Preliminar/Final ahora es dinámica por punto** (antes era
  fija por indicador): columna `stage` nueva en `indicator_overrides`
  de Supabase, selector Preliminar/Final en Actualizar Datos, la
  tarjeta muestra la etapa del último punto realmente cargado. Cargar
  el final con la misma fecha que el preliminar reemplaza el punto y
  cambia el badge solo.
- **Bug real de datos encontrado y corregido: ISM (USD) estaba corrido
  un mes** en `historical-series.json` (el valor de cada mes guardado
  bajo la fecha del mes siguiente, más manuf/serv cruzados en el punto
  más reciente) — corregido primero nov-2025 a jun-2026 contra los
  comunicados oficiales de ISM, y **en la continuación de esta misma
  sesión se confirmó y corrigió el mismo bug en TODA la serie desde
  2015-01** (ver "Sesión 2-ago-2026 (cont. 2)" más abajo) — ya en
  producción.
- **Varios duplicados de fecha en PMI** (choque entre fecha de
  publicación real vs. la convención "1° del mes" del resto del
  dashboard) encontrados y limpiados en Supabase — EUR/GBP/AUD/JPY/CHF/
  CAD/S&P Global US. Uno de ellos (`cad_pmi_manuf`) estaba tapando el
  dato correcto de junio en producción.
- **Auditoría flash-vs-final completa** de enero-junio 2026 en S&P
  Global US/Japón/Australia (36 valores) — 1 error real encontrado y
  corregido (AUD Servicios marzo, 46.6→46.3). GBP Manufactura/Servicios
  de junio también tenían el flash cargado en vez del final —
  corregido.
- **Bug real: "Cargando…" se podía quedar trabado para siempre** si el
  pedido a Supabase fallaba o se colgaba sin resolver ni rechazar
  (firewall/proxy que descarta paquetes en silencio) — ahora hay un
  timeout de 30s + un 4° estado de badge "Sin conexión (reintentar)",
  clickeable para reintentar sin recargar la página.
- **Cinta de titulares fijados interactiva**: se pausa con el mouse
  encima, se puede arrastrar con click (antes era una animación CSS
  que no paraba nunca).
- **Pestaña nueva "📅 Cuándo se publican"**: hover/foco muestra el
  patrón habitual de publicación por tipo de indicador (CPI, PMI con y
  sin flash, empleo, crecimiento, bancos centrales). Solo desktop.
- **2 bugs de mobile corregidos**: el texto "USD" del header quedaba
  tapado detrás de las pastillas de divisa; el badge "N subcomponentes"
  se cortaba contra el borde de las tarjetas con subcomponentes.

**Pendiente explícito para la próxima sesión** (actualizado en la
continuación de esta misma sesión — ver "Sesión 2-ago-2026 (cont. 2):
auditoría ISM completa..." más abajo para el detalle):
- ~~Auditar el histórico de ISM anterior a nov-2025~~ — **RESUELTO**:
  se confirmó que el bug de corrimiento de 1 mes afecta TODA la serie
  desde 2015-01, no solo nov-2025/jun-2026 — corregido de punta a
  punta en `historical-series.json` (139 meses por serie, 2014-12 a
  2026-06), verificado mes a mes contra prnewswire.com en varios puntos
  de control (2015, COVID abr/may-2020, límite sep/oct-2025).
- Cargar el FINAL de julio-2026 (vía Actualizar Datos) para
  `sp_pmi_manuf`/`serv`, `jpy_pmi_manuf`/`serv`, `aud_pmi_manuf`/`serv`
  en cuanto salga (todavía no publicado al momento de este chequeo,
  2-ago-2026 domingo — el flash de julio ya está cargado y verificado
  correcto para las 3 economías); cargar julio de `cad_pmi_manuf`/`serv`,
  `nzd_pmi_manuf`/`serv`, `chf_pmi_manuf` apenas publiquen (tampoco
  salió todavía, 1ª publicación cae el lunes 3-ago-2026 o después).
- ~~2 filas de `nzd_pmi_manuf`/`nzd_pmi_serv` sin identificar~~ —
  **RESUELTO**: ya estaban borradas de producción (la
  `migration_2026-08-01_pmi_dedup_2.sql` de la sesión anterior ya las
  eliminó, el resumen de arriba estaba desactualizado en ese punto). Se
  investigó a fondo qué podían representar (50.3/50.2, fecha 2026-06-29)
  contra el histórico real de BusinessNZ PMI/PSI 2024-2026 (valores
  originales y revisados) — no coinciden con ningún dato oficial
  encontrado. Conclusión: dato espurio (probablemente un artefacto de
  import, no un punto real sin cargar) — no hace falta reponer nada.

Para agarrar viaje rápido con la sesión anterior (1-ago tarde/noche —
preliminar/final original, automatización de EUR, cron de GitHub
Actions, subcomponentes de PIB), la sección de abajo sigue siendo
válida como estaba:

## Estado al cierre de la sesión anterior (1-ago-2026, tarde/noche)

Todo está **mergeado y en producción** (`claude/macro-usd-web-dashboard-xm5ypk`,
9 commits nuevos sobre el handoff anterior — ver `git log` para los
hashes — cada uno verificado con `npm run build` + typecheck de `/api`
local, y la mayoría además probados en vivo contra
`hikman-prueba.vercel.app`/Supabase real después del deploy). No queda
nada pendiente de deploy. Resumen rápido (detalle completo en la sección
de sesión más abajo):

- **USD Empleo**: Ganancias Promedio por Hora (a/a) — completa el par
  que solo tenía m/m — e Índice de Costo Laboral (t/t y a/a) agregados,
  ambos automáticos vía FRED (verificado exacto contra el comunicado del
  BLS de Q2-2026).
- **Insignia Preliminar/Final** (`IndicatorMeta.releaseStage`): nueva,
  visible en cada tarjeta y en Actualizar Datos. Aplicada donde la
  fuente publica el mismo dato en dos vueltas y el dashboard sabe cuál
  trackea (PMI Flash EUR/GBP, CPI de Tokio JPY = preliminar; S&P PMI
  USD/JPY/AUD = final) — **a propósito NO se usa** en indicadores con
  revisión gradual del mismo punto de la serie (PIB de cualquier divisa,
  HICP de EUR una vez automatizado con flash→final) porque ahí el
  estado cambia por punto, no es una propiedad fija del indicador.
- **EUR HICP automatizado con reemplazo flash→final solo, sin
  intervención manual**: se encontró `prc_hicp_fpd`, un dataset de
  Eurostat que separa la vuelta flash (release=FLS) de la final
  (release=FIN) con la tasa m/m y a/a ya calculada — reemplaza el mapeo
  FRED viejo (que solo traía el dato confirmado con ~1 mes de rezago
  respecto al flash). Cubre eur_cpi/_yoy, eur_core_cpi/_yoy,
  eur_de_hicp/eur_fr_hicp (m/m Y a/a — antes el a/a de Alemania/Francia
  era manual, ahora también automático). Mismo mecanismo de upsert por
  fecha de PERÍODO que ya usa el resto del proyecto: cuando Eurostat
  pasa de flash a final, pisa el mismo punto solo.
- **EUR PIB por componente, mismo tratamiento**: se encontró que
  `namq_10_gdp` (el mismo dataset que ya daba el nivel del PIB) tiene un
  `unit=CON_PPCH_PRE` con la contribución al crecimiento YA calculada
  por Eurostat — se automatizaron Consumo/Inversión/Gasto
  Público/Exportaciones Netas, con 17 trimestres de historia (2022-2026)
  cargados de una.
- **Bug real de infraestructura encontrado: el cron de GitHub Actions
  nunca disparó solo** desde que se configuró en la sesión anterior — 0
  corridas por `schedule` en `list_workflow_runs`, solo la manual de
  prueba. Se disparó manualmente (ya corrió bien) y se armó una **Rutina
  de respaldo cada hora** (Claude Code Remote `create_trigger`,
  `trig_01VigD4t2wgyxh8YCAYDqtg1`) que llama a los mismos endpoints de
  sync como red de seguridad independiente del cron nativo — no la
  borres sin confirmar antes que el cron de GitHub ya esté disparando
  solo de forma consistente (`actions_list` → `list_workflow_runs` →
  buscar `event: schedule`).
- **University of Michigan Consumer Sentiment corregido a mano**: FRED
  (nuestra fuente automática para `uom`) estaba ~1 mes atrasado respecto
  a la fuente primaria (`sca.isr.umich.edu`, pública sin login) — se
  cargó el valor confirmado (55.2, jul-2026) directo, se autocorrige
  solo cuando FRED se ponga al día (mismo punto/fecha).
- **Subcomponentes de PIB rediseñados en las 9 divisas**: "Demanda
  Interna/Demanda Externa" (vacíos, ninguna fuente los publicaba
  agregados así) reemplazados por el desglose clásico
  **Consumo/Inversión/Gasto Público/Exportaciones Netas** + se mantiene
  Precios (el deflactor, sin cambios) — 5 subcomponentes por divisa en
  vez de 3. Cobertura real por divisa, ver sección de sesión para el
  detalle y las fuentes de cada una:
  - **USD**: automático vía FRED (BEA NIPA tabla 1.1.2), historia
    profunda ya poblada.
  - **EUR**: automático vía Eurostat (ver arriba), 17 trimestres.
  - **AUD**: automático — se encontró que la ABS también tiene la
    contribución pre-calculada (`ANA_EXP`, measure `TCH`) — 17
    trimestres cargados.
  - **JPY**: solo Exportaciones Netas cargado (Japón no desglosa
    Consumo/Inversión/Gasto como contribución, solo domanda interna
    total vs. externa) — 1 trimestre.
  - **CNY**: Consumo/Inversión/Exportaciones Netas cargados pero
    reparentados al **a/a** (`cny_gdp_yoy`, no `cny_gdp_qoq`) — es la
    única base en la que la NBS publica esto, y "Consumo" ahí viene
    combinado hogares+gobierno (por eso `cny_gdp_government` queda sin
    dato a propósito) — 1 trimestre.
  - **GBP, CAD, NZD, CHF**: sin fuente limpia encontrada (ONS/StatCan/
    Stats NZ no publican una tabla de contribución; el intento propio de
    derivarla de niveles para CAD no cerró contra el PIB real, y el feed
    de SECO para CHF tenía una escala inconsistente) — quedan
    manuales, igual que antes.
- **CAD**: se agregó y luego se sacó (a pedido explícito del usuario) una
  tarjeta de "PIB Mensual — Estimación Preliminar" — el dato de avance sí
  existe (confirmado en el texto de "The Daily" de StatCan) pero no en la
  tabla estructurada que usa el sync, así que quedaría manual de todos
  modos; el usuario prefirió no tenerla.
- **JPY**: se renombró "Confianza del Consumidor" a **"Confianza de los
  Hogares"** (`jpy_consumer_confidence`) — es el mismo dato que
  Investing.com traduce distinto, no un indicador nuevo.
- **NZD**: se cargó el dato anterior de Confianza Empresarial (36.6,
  jun-2026, ANZ Business Confidence) — antes solo tenía el actual.

**Nada de esta sesión toca Supabase con SQL pendiente de correr** — todos
los cambios de datos (correcciones puntuales + backfill histórico de PIB
por componente) ya están pusheados directo a producción vía REST, no
hace falta que el usuario pegue nada en el SQL Editor.

**Sobre los commits "Unverified" en GitHub**: el usuario recibe un aviso
del stop hook local (`stop-hook-git-check.sh`) cada vez que un merge
commit queda con `committer: noreply@github.com` (el comportamiento
normal de GitHub al mergear un PR vía API o botón web, no algo que
dependa de la sesión). Ya se le explicó dos veces en esta sesión que es
puramente cosmético (solo la etiqueta "Verified"/"Unverified" en la web
de GitHub, no afecta el código ni el deploy) y **el usuario pidió
explícitamente no tocarlo** — no reescribir esos commits con
`--amend --reset-author` ni hacer `force-push` sobre la rama de
producción para "solucionarlo". Si el aviso vuelve a aparecer, no hace
falta re-explicarlo de cero — remitir a este párrafo.

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
  origin`). **Esta sesión (1-ago-2026, tarde/noche) trabajó en
  `claude/handoff-documentation-review-486n0j`** (asignada por el
  entorno; la rama que traía el entorno originalmente,
  `claude/handoff-documentation-review-9z8wtp` de una sesión previa, ya
  no existe/no se usó), pusheó cada commit ahí primero y de ahí
  directo (fast-forward, sin merge commit) a
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

## Corrección de datos y features nuevas (sesión 31-jul-2026, continuación)

Segunda sesión el mismo día, arrancó con "leamos el último handoff y
continuemos" (PR #1 se mergeó a producción al toque) y siguió con una
lista larga de pedidos del usuario: auditar y corregir datos
desactualizados en todas las divisas, agregar indicadores faltantes
puntuales, y dos features nuevas (modal de subcomponentes, Renta
Variable). Todo mergeado a producción en 3 PRs (#2, #3, #4).

### 1. Auditoría de frescura — bug real en AUD, CNY atrasado otra vez

El usuario reportó que la inflación de AUD no reflejaba el dato de
junio (publicado el miércoles). Investigación:

- **Causa real**: `indicator_overrides` tenía **78 filas huérfanas**
  para `aud_cpi`/`aud_cpi_yoy`/`aud_core_cpi`/`aud_core_cpi_yoy`/
  `aud_weighted_median`/`aud_weighted_median_yoy` — de un intento
  anterior con el CPI **mensual** de la ABS (descartado en una sesión
  previa a favor de la base trimestral "pre-October 2025", ver lección
  AUD #21/22 arriba) que nunca se limpió al cambiar de fuente. Como el
  frontend toma `points[points.length - 1]` (el de fecha más nueva) y
  esas filas mensuales huérfanas (ej. `2026-05-01`) tenían fecha más
  reciente que el trimestre real ya sincronizado (`2026-04-01` = Q2),
  se mostraba el dato viejo/mensual en vez del trimestral correcto.
  **Se borraron las 78 filas** (`month not in (1,4,7,10)`) y se corrió
  el sync real — Q2-2026 (CPI, Core, Weighted Median) y PPI Q2 (que
  tampoco estaba, release distinto al de CPI) quedaron al día,
  verificado contra la ABS Data API en vivo.
- **Blindaje agregado a `api/aud-sync.ts`**: después de cada upsert de
  un indicador trimestral, `cleanupOffCycleRows()` borra cualquier fila
  con mes fuera de {1,4,7,10} para ese id — previene que este mismo
  patrón (fuente cambia de granularidad, filas viejas quedan huérfanas)
  vuelva a colarse como "el dato más reciente" en el futuro. Aplica a
  los 10 ids trimestrales de AUD (`QUARTERLY_IDS` en el archivo).
- **CNY se atrasó de nuevo** (no reportado por el usuario esta vez, se
  encontró al auditar el resto de divisas): `chinadata.live` volvió a
  quedar ~2 meses atrás en 8 de 13 series (CPI, PPI, ventas minoristas,
  producción industrial, inversión fija, PIB — solo PMI seguía al día),
  exactamente el patrón que ya advertía este HANDOFF ("puede volver a
  atrasarse, chequear los 13 de una"). Se verificaron los valores
  oficiales de junio/Q2-2026 contra NBS/GACC (vía prensa — CNBC,
  FocusEconomics, Reuters/investinglive) y se pushearon directo a
  Supabase: `cny_cpi` -0.3% m/m, `cny_cpi_yoy` 1.0%, `cny_ppi` -0.3%
  m/m, `cny_ppi_yoy` 4.1%, `cny_retail_sales_yoy` 1.0%,
  `cny_industrial_output_yoy` 5.3%, `cny_fixed_asset_investment` -5.7%
  (acumulado ene-jun), `cny_gdp_qoq` 0.9%, `cny_gdp_yoy` 4.3%,
  `cny_trade_balance` 125630 (USD millones). **Este agregador sigue
  siendo el punto más frágil del dashboard — si se repite una tercera
  vez, considerar el fallback ya sugerido en el handoff previo**
  (scraper de `stats.gov.cn/english/PressRelease/` para lo que no sea
  PMI).
- **Resto de divisas** (USD/EUR/GBP/CAD/NZD/JPY/CHF): se disparó un
  sync real de cada una contra producción, 0 errores, ninguna otra con
  el mismo patrón de filas huérfanas en sus series trimestrales
  automáticas (se auditaron todas: `gdp_qoq`/`gdp_deflator` de USD,
  `eur_gdp_qoq`/`eur_gdp_yoy`, `nzd_cpi`/`nzd_gdp_*`,
  `jpy_gdp_qoq`/`jpy_gdp_yoy`, `chf_gdp_qoq`/`chf_gdp_yoy`/
  `chf_consumer_confidence`, `cny_gdp_qoq`/`cny_gdp_yoy` — todas con
  saltos limpios de 3 meses entre puntos). El único "atraso" detectado
  fuera de AUD/CNY es el rezago normal de publicación del PIB
  (EUR/NZD/JPY/CHF todavía en Q1-2026 porque Q2 no se publica hasta
  agosto/septiembre en la mayoría de países — no es un bug).

### 2. JPY — CPI de Tokio (adelanto del nacional)

`jpy_tokyo_cpi_yoy` / `jpy_tokyo_core_cpi_yoy` — el e-Stat Dashboard
(misma API que ya usa el resto de JPY) publica el CPI de Tokio bajo el
**mismo IndicatorCode** que el nacional, con `RegionCode=13100` (東京都
区部, los 23 barrios especiales). Solo a/a — es lo único que sigue el
mercado para esta serie (no hay m/m publicado/seguido para Tokio).
**Importante**: el Dashboard de e-Stat solo tiene el desglose municipal
con valores **crudos** (`IsSeasonalAdjustment='1'`, a diferencia del
nacional que usa `'2'`) — pero eso coincide con la convención real, el
mercado siempre mira a/a crudo para Tokio. El Dashboard se actualiza
~1 mes más tarde que el comunicado de adelanto real del Statistics
Bureau (que es la razón de ser de esta serie: adelanta ~3-4 semanas al
CPI nacional del mismo mes) — se cargó a mano el punto de julio-2026
(2.0% headline / 1.9% core, verificado contra FXStreet/Investing/Yahoo
Finance) para no perder el dato más reciente mientras el sync
automático llega a la misma fecha. Verificado: headline 1.71%
calculado vs 1.70% oficial para junio (match casi exacto); core 1.72%
calculado vs 1.6% oficial (~0.1pp de margen — mismo tipo de margen ya
aceptado y documentado en `cny_cpi_yoy`, no se revirtió a manual porque
no hay alternativa m/m más precisa para esta serie).

### 3. USD — Jobless Claims (auto) + NFIB (manual)

`initial_claims`/`continuing_claims` — FRED tiene `ICSA`/`CCSA`,
semanales, sin transformar (`transform: 'level'`), agregadas a Empleo.
NFIB Small Business Optimism Index — **verificado que NO está en FRED**
(cero resultados buscando "NFIB" o "small business optimism" en el
buscador de series de FRED) y NFIB no publica un CSV público abierto
(403 al pedir su página de encuestas directo) — queda manual en
Confianza, mismo criterio que Conference Board (`cb`).

### 4. EUR — HICP m/m de Alemania y Francia automatizado

`CP0000DEM086NEST` / `CP0000FRM086NEST` en FRED — **mismos códigos de
serie que `eur_cpi` a nivel Eurozona** (`CP0000EZ19M086NEST`), solo con
el `geo` cambiado a DE/FR — están vivos y al día (verificado hasta
junio-2026). Se agregaron `eur_de_hicp_mom`/`eur_fr_hicp_mom`
automáticos. **El a/a de ambos queda manual a propósito**: derivarlo
del índice (mismo método `pct_change_yoy` que ya usa `eur_gdp_yoy`) dio
2.35%/2.02% contra el 2.4%/2.0% oficial de junio (Destatis/INSEE) — un
sesgo de ~0.05-0.1pp, la misma magnitud por la que `eur_cpi_yoy`/
`eur_core_cpi_yoy` ya estaban excluidos del mapeo automático a nivel
Eurozona (ver comentario en `fredMappings.ts`) — se mantuvo la misma
vara de precisión para consistencia.

Se investigó automatizar Ventas Minoristas/Producción Industrial de
Alemania vía Eurostat (`sts_trtu_m`/`sts_inpr_m`, con `s_adj=SCA`,
`indic_bt=VOL_SLS`/sin indic_bt, `unit=I21`) — **sí están al día** (mayo
2026) pero el m/m derivado dio ~0.1-0.15pp de diferencia contra el
comunicado oficial de Destatis (1.1% retail/0.9% industrial oficial vs
~0.99%/0.76% derivado) — se descartó por el mismo motivo que el a/a de
HICP. Quedan manuales. **Ojo con `s_adj`**: Eurostat tiene tres códigos
(`NSA`/`CA`/`SCA`) — `CA` (solo ajuste de calendario) da un número
distinto a `SCA` (ajuste estacional + calendario, la que reportan los
comunicados oficiales) — confundirlos da un m/m con sesgo grande, no
sutil.

### 5. Modal de subcomponentes ISM/PMI/GDP (cambio de UX + ~63 indicadores nuevos)

El usuario pidió cambiar el acordeón inline de ISM (USD) — tocar la
tarjeta la expandía hacia abajo con los subcomponentes — por una
**ventana/modal** que muestre los subcomponentes con dato actual y
anterior. Se generalizó en vez de hardcodear para ISM:

- `src/lib/indicatorGroups.ts` (`groupByParent`): agrupa una lista de
  `IndicatorMeta` en `{ parent, children }[]` usando el campo
  `parentId` que ya existía (hasta ahora solo lo usaba ISM). Reusado
  tanto por `Crecimiento.tsx` (decide qué tarjeta muestra el botón "N
  subcomponentes") como por `Actualizar.tsx` (ver punto 6).
- `src/components/SubcomponentModal.tsx`: overlay `fixed inset-0` con
  backdrop oscuro (`rgba(0,0,0,0.55)`), reusa `ChartCard` para cada
  hijo. **Ojo**: al verificar con Playwright + captura de pantalla, el
  backdrop se veía "ausente" a simple vista en la imagen — resultó ser
  un error de percepción mía viendo el PNG a baja resolución, no un bug
  real: se confirmó con `getComputedStyle` + muestreo de pixel RGB
  (`(112,112,111)`, coincide exacto con `rgba(0,0,0,0.55)` sobre fondo
  blanco) que el overlay renderiza perfecto. **Lección para la próxima
  vez que algo se vea raro en una captura**: antes de asumir que hay un
  bug de CSS, verificar con `elementFromPoint` + pixel real, no confiar
  solo en la impresión visual de una imagen comprimida/reescalada.
- `ChartCard.tsx`: el prop `expandControl` (con estado `expanded`/
  `onToggle`) se simplificó a `subcomponentsControl` (solo `onOpen` +
  `childCount`) — ya no hay estado de expandido, el modal se abre o no.

**Se agregaron subcomponentes manuales (sin dato cargado) a las 8
divisas no-USD** — mismo patrón que ya tenía ISM, ninguna fuente
gratis los publica como series separadas:
- **PMI** (4 c/u: nuevas órdenes, producción, empleo, precios) al PMI
  Manufactura/Flash principal de cada divisa: `eur_de_pmi_manuf`,
  `eur_fr_pmi_manuf`, `gbp_pmi_manuf_flash`, `cad_pmi_manuf`,
  `aud_pmi_manuf`, `nzd_pmi_manuf`, `jpy_pmi_manuf`, `chf_pmi_manuf`,
  `cny_pmi_manuf` — 9 padres × 4 = 36 nuevos.
- **PIB** (3 c/u: deflactor, demanda interna, demanda externa) al PIB
  principal de cada divisa (más USD, que ya tenía `gdp_deflator` como
  tarjeta suelta — pasó a ser hijo de `gdp_qoq` en vez de eso): 9
  padres × 3 = 27 nuevos (2 en USD porque el deflactor ya existía).
- Total: **~63 indicadores nuevos, todos manuales, ninguno con dato
  cargado todavía** — quedan con la insignia "sin datos" hasta que el
  usuario los cargue desde "Actualizar Datos". Ver "Gaps conocidos"
  abajo.
- **Bug propio encontrado durante la carga en batch**: al usar `Edit`
  con un `old_string` que terminaba justo antes del `},` de cierre de
  un objeto (sin incluir el `{` del siguiente), el reemplazo dejaba un
  `},` duplicado y rompía el array — pasó en `indicatorsChf.ts` y
  `indicatorsCny.ts` (para los subcomponentes de PIB), detectado porque
  `npm run build` tira error de sintaxis inmediato. **Lección**: al
  insertar un bloque nuevo entre dos objetos existentes, o el
  `old_string` incluye el `{` de apertura del siguiente objeto, o hay
  que revisar el resultado a mano — no asumir que "el build no tiró
  error" sin correrlo (en este caso si tiró error y se agarró antes de
  pushear, pero vale la pena el hábito).

### 6. Actualizar Datos — orden agrupado (padre + subcomponentes juntos)

Antes, cada sección de "Actualizar Datos" simplemente filtraba
`INDICATORS` por `section`+`currency` preservando el orden de
declaración del array — como los subcomponentes de ISM se declaraban
TODOS DESPUÉS de los dos padres (`ism_manuf`, `ism_serv`, *después*
sus 10 hijos), la tabla mostraba "PMI Manufactura, PMI Servicios, PIB,
Ventas Minoristas... [recién acá empiezan los subcomponentes de
todo lo anterior, mezclados]" — el orden visual que el usuario se quejó
que "no queda bien". Se resolvió reusando el mismo `groupByParent` de
`Crecimiento.tsx`: ahora cada sección arma `groups = groupByParent(rows)`
y renderiza cada padre inmediatamente seguido de sus hijos (con indent +
"↳" en la fila para que se lea la jerarquía). Aplica a cualquier
sección con `parentId` (hoy: Crecimiento), no solo USD.

Para el caso de Alemania/Francia dentro de Inflación de EUR (que el
usuario también pidió ver ordenado): esos indicadores usan el campo
`country`, no `parentId` — no se tocó `groupByParent` para esto, porque
**ya estaban ordenados por construcción**: `indicatorsEur.ts` declara
primero todos los indicadores generales de Eurozona, después el bloque
completo de Alemania, después el bloque completo de Francia — al
preservar el orden de declaración, la tabla ya sale agrupada sin
código nuevo. Verificado con Playwright.

### 7. Nueva sección "Renta Variable y Acciones" (`/renta-variable`)

Pedido original del usuario: integrar la API de **massive.com** para
cotización en tiempo real de renta variable por divisa. Investigación
antes de construir nada (mismo criterio de "verificar antes de
automatizar" de todo el proyecto):

- **massive.com tiene tiempo real, pero no gratis**: el tier gratis
  ("Stocks Basic") es 5 llamadas/min y **solo datos de fin de día** (ni
  siquiera delayed). 15 min delayed arranca en $29/mes ("Starter"),
  tiempo real de verdad en $199/mes ("Advanced"). Este proyecto nunca
  pagó por ninguna API hasta ahora.
- Se evaluó **Finnhub** (ya integrado, tiene key en Vercel) como
  alternativa gratis con tiempo real real — pero su tier gratis **solo
  cubre acciones de EE.UU.**, mercados internacionales (LSE, TSX, ASX,
  TSE, Euronext, SIX) requieren plan pago incluso en Finnhub.
- Se le presentó la disyuntiva al usuario (pagar, usar massive.com
  gratis con datos de fin de día, o mezclar fuentes) y **eligió**:
  Finnhub para las acciones de USD (fuente oficial, ya integrada) +
  **Yahoo Finance** (API no oficial, `query1.finance.yahoo.com`, sin
  key) para todo lo demás — incluidos **todos los índices** de las 9
  divisas, porque Finnhub free no cotiza bien índices. Se verificó con
  curl, ANTES de integrarlo, que los 9 índices representativos y 8
  acciones de muestra responden bien (mismo criterio del proyecto:
  nunca automatizar sin probar la fuente primero).
- **`api/equities-quotes.ts`**: a diferencia de todos los demás
  `*-sync.ts`, esta función **no escribe en Supabase** — no tiene
  sentido guardar un "histórico" de un precio que se pide fresco en
  cada carga de la página (no es una serie macro con un punto por
  mes/trimestre). Recibe `symbols`/`sources`/`labels` por query string
  desde el frontend (`src/data/equities.ts` tiene la config fija de
  qué símbolo mostrar por divisa), pide en paralelo (`Promise.all`) a
  Finnhub o Yahoo según corresponda por símbolo.
- **Gotcha real encontrado y manejado**: las acciones de Londres
  (`AZN.L`, `SHEL.L`, etc.) cotizan en **peniques** (`currency: "GBp"`
  o `"GBX"` en la respuesta de Yahoo), no en libras — hay que dividir
  por 100 o el precio sale 100x más alto de lo real. Se detecta y
  convierte en `fetchYahooQuote()`.
- Índices/acciones elegidas por divisa (en `src/data/equities.ts`, el
  usuario puede pedir cambiarlas): USD=S&P500+Apple/Microsoft/Nvidia,
  EUR=Euro Stoxx 50+SAP/LVMH/ASML, GBP=FTSE100+AstraZeneca/Shell/HSBC,
  CAD=TSX+RBC/Shopify/TD, AUD=ASX200+BHP/CBA/CSL,
  NZD=NZX50+Fisher&Paykel/Auckland Airport, JPY=Nikkei225+Toyota/Sony/
  SoftBank, CHF=SMI+Nestlé/Roche/Novartis, CNY=CSI300+Kweichow Moutai/
  Bank of China.
- Verificado contra producción real (no solo local): Finnhub (AAPL) y
  Yahoo (S&P500, SAP, AstraZeneca en GBP ya convertido, Toyota,
  Moutai) responden bien, 0 errores.
- **Riesgo aceptado y documentado**: Yahoo Finance no oficial no tiene
  SLA ni garantía de Yahoo — podría cambiar de formato o bloquear sin
  aviso en cualquier momento (mismo nivel de riesgo que ya se acepta
  con el CSV del RBA o el de Aduanas de Japón, ambos tampoco son APIs
  oficiales soportadas). Si `/api/equities-quotes` empieza a fallar
  para símbolos `source: 'yahoo'`, revisar ahí primero.

## Corrección de datos y features nuevas, parte 2 (sesión 31-jul/1-ago-2026)

Tercera tanda de pedidos el mismo día/madrugada, después de que las
secciones 1-7 de arriba ya estaban mergeadas (PRs #2-#4). Todo lo de
acá abajo se mergeó en PRs #5 al #10, cada uno con el check de Vercel
en verde antes de mergear.

### 8. Modal más compacto + PMI Servicios sin subcomponentes (bug de cobertura)

Feedback del usuario con captura de pantalla: el modal de
subcomponentes "se ve algo amplio y ocupa mucha pantalla" y "los pmi
de servicios no tienen esa función de subcomponentes".

- **Achicado**: `SubcomponentModal.tsx` pasó de `max-w-4xl`/`p-5`/
  `gap-4` a `max-w-2xl`/`p-4`/`gap-3`, y cada `ChartCard` hijo se
  renderiza con el nuevo prop `compact` (`ChartCard.tsx`: oculta el
  párrafo de descripción, `p-3` en vez de `p-4`, gráfico
  `h-[80px]` en vez de `h-[140px]`).
- **PMI Servicios**: la sección 5 de arriba solo había agregado
  subcomponentes al PMI **Manufactura**/Flash de cada divisa — un
  gap real de cobertura, no un bug de código (el sistema
  `parentId`/`groupByParent` ya soportaba cualquier padre, simplemente
  no se habían declarado los hijos para Servicios). Se agregaron los
  mismos 4 subcomponentes (precios, producción, nuevas órdenes,
  empleo) al PMI Servicios/No-Manufacturero principal de cada divisa:
  `sp_pmi_serv` (USD), `eur_pmi_serv_flash` (+ el flash de
  Manufactura Eurozona, `eur_pmi_manuf_flash`, que también se había
  quedado sin hijos en la primera pasada), `gbp_pmi_serv_flash`,
  `cad_pmi_serv`, `aud_pmi_serv`, `nzd_pmi_serv`, `jpy_pmi_serv`,
  `chf_pmi_serv`, `cny_pmi_non_manuf` — 9 padres × 4 = 36 indicadores
  más, mismo criterio que Manufactura (manuales, sin dato cargado).
- **Bug de arquitectura encontrado en el camino**: el modal de
  subcomponentes solo funcionaba en `Crecimiento.tsx` (tenía su propia
  copia de `groupByParent` + `SubcomponentModal`) — el resto de
  secciones (`Inflacion.tsx`, `Empleo.tsx`, `Tasas.tsx`,
  `Sentimiento.tsx`) usaban `SectionGrid.tsx`, que NO tenía la lógica
  de modal. Esto se iba a notar recién con el pedido de PCE (punto 10
  abajo): sus subcomponentes habrían aparecido como tarjetas sueltas
  sin agrupar en vez de abrir el modal. Se generalizó `SectionGrid.tsx`
  para que use `groupByParent` + `SubcomponentModal` internamente
  (mismo patrón que tenía `Crecimiento.tsx`), y `Crecimiento.tsx` se
  simplificó a un simple `<SectionGrid section="crecimiento" months={36} />`
  para no duplicar la lógica. Verificado sin regresión con Playwright
  en Crecimiento e Inflación.
- **Falso positivo investigado y descartado**: al revisar una captura
  de Playwright del modal (antes del achique), parecía que no tenía
  backdrop oscuro — se verificó con `getComputedStyle` +
  `document.elementFromPoint()` + muestreo de pixel RGB real y se
  confirmó que el modal SIEMPRE renderizó bien (`position: fixed`,
  z-index correcto, `rgba(0,0,0,0.55)` sobre blanco en las coordenadas
  del backdrop) — el problema era la imagen de baja resolución, no el
  código. No se cambió nada por esto.

### 9. Renta Variable — más índices y acciones tech en USD, DAX en EUR

Pedido: agregar más acciones tech influyentes a USD ("nvidia, amd,
entre otras"), agregar Nasdaq y Dow Jones 30 junto al S&P 500, y
agregar el DAX alemán a EUR.

- `EquityGroup` en `src/data/equities.ts` pasó de `index: EquitySymbol`
  (uno solo) a `indices: EquitySymbol[]` (array) para soportar más de
  un índice por divisa. `RentaVariable.tsx` itera `group.indices` en
  vez de renderizar un único índice.
- **USD**: `indices` ahora `S&P 500` (`^GSPC`) + `Nasdaq Composite`
  (`^IXIC`) + `Dow Jones 30` (`^DJI`), los tres vía Yahoo (Finnhub free
  no cotiza bien índices, ver punto 7 arriba). `stocks` pasó de
  Apple/Microsoft/Nvidia a Apple/Microsoft/**Nvidia/AMD**/Alphabet
  (Google)/Amazon/Meta Platforms — 7 acciones tech, todas vía Finnhub
  (US-only pero gratis y real-time real).
- **EUR**: `indices` ahora `Euro Stoxx 50` (`^STOXX50E`) + `DAX
  (Alemania)` (`^GDAXI`), ambos vía Yahoo. `stocks` sin cambios
  (SAP.DE, MC.PA, ASML.AS).
- Resto de divisas (GBP/CAD/AUD/NZD/JPY/CHF/CNY) sin cambios — un solo
  índice cada una.
- Verificado en vivo contra producción: los 2 índices nuevos de USD y
  el DAX responden bien vía Yahoo, y las 4 acciones tech nuevas
  responden bien vía Finnhub.

### 10. Score compuesto USD — PIB, Jobless Claims, CB reducido

Tres pedidos puntuales sobre `src/data/scoreSeed.ts` (USD):

- Agregado `gdp_qoq` ("PIB") con `weight: 'Máx(2) / Mín(-2)'`.
- Agregado `initial_claims` ("Solicitudes Iniciales de Desempleo") y
  `continuing_claims` ("Solicitudes Continuas de Desempleo"), cada uno
  con `weight: 'Máx(1) / Mín(-1)'`.
- `cb` (Confianza del Consumidor, Conference Board) reducido de
  `'Máx(2) / Mín(-2)'` a `'Máx(1) / Mín(-1)'`.
- Recordatorio de arquitectura (ya documentado en sesiones previas,
  vale la pena repetirlo): `weight` es solo una etiqueta descriptiva,
  el `<select>` real en `ScorePanel.tsx` siempre ofrece el rango fijo
  [-2,-1,0,1,2] sin importar el label — es un límite "de honor" para
  el analista, no una restricción de código. No hubo que tocar
  `ScorePanel.tsx` para ninguno de estos tres cambios.

### 11. Auto-refresh vía GitHub Actions — se eliminaron los botones manuales

Pedido: eliminar los botones de "Sincronizar/Actualizar" (Titulares +
las 9 divisas) y reemplazarlos por refresco automático — Titulares
cada 10 min, divisas cada 30 min, para "no estar dándole click al
botón".

- **Vercel Cron (plan Hobby/gratis, el único que paga este proyecto)
  solo permite una ejecución por día** — no sirve para 10min/30min. Se
  le presentó la disyuntiva al usuario (pagar Vercel Pro, resignarse a
  refresco diario, o usar GitHub Actions gratis) y **eligió GitHub
  Actions**.
- **Gotcha real**: los workflows programados de GitHub Actions
  (`schedule: cron:`) solo se leen desde la rama **default** del repo
  — confirmado con `git remote show origin` →
  `claude/macro-usd-web-dashboard-xm5ypk`. No alcanza con que el
  archivo `.yml` esté en cualquier rama, tiene que llegar a la rama
  default vía merge para que GitHub empiece a dispararlo solo.
- `.github/workflows/sync-titulares.yml`: cron `*/10 * * * *` +
  `workflow_dispatch` (para poder dispararlo a mano si hace falta),
  dos pasos: `POST /api/headlines-sync` y `POST
  /api/translate-headlines`.
- `.github/workflows/sync-currencies.yml`: cron `*/30 * * * *` +
  `workflow_dispatch`, 9 pasos (uno por divisa: `/api/fred-sync`,
  `/api/eur-sync`, `/api/gbp-sync`, `/api/cad-sync`, `/api/aud-sync`,
  `/api/nzd-sync`, `/api/jpy-sync`, `/api/chf-sync`,
  `/api/cny-sync`), cada uno con `continue-on-error: true` para que si
  una divisa falla no frene el resto.
- Ambos workflows confirmados **activos y disparados manualmente una
  vez** (`workflow_dispatch`) contra producción para verificar antes
  de confiar en el cron: "Sincronizar Titulares" terminó con
  `conclusion: success`; "Sincronizar Divisas" quedó corriendo sus 9
  pasos secuenciales sin error reportado.
- `src/pages/Actualizar.tsx`: se sacó el botón "⟳ Sincronizar" y todo
  su estado asociado (`fredSyncing`, `fredResult`, `handleFredSync`) —
  quedó una nota de texto en el encabezado y en el tooltip de cada fila
  automática explicando la cadencia de 30 min.
- `src/pages/Titulares.tsx`: se sacaron los botones de sync manual y
  de "traducir pendientes" (y su estado) — quedó nota de texto sobre
  la cadencia de 10 min, y el estado vacío ahora dice "Esperá al
  próximo sync automático... o agregá uno manualmente" en vez de
  invitar a tocar un botón que ya no existe.
- **La carga manual de indicadores en "Actualizar Datos" (los inputs
  de texto por indicador) NO se tocó** — solo se eliminó el botón de
  sincronización automática por API, que es un concepto distinto (los
  manuales nunca tuvieron botón de sync, siempre fueron de carga a
  mano).

### 12. USD — PCE (la medida de inflación que target-ea la Fed) + subcomponentes

Pedido: agregar PCE si FRED lo tiene, y depués (pregunta de
seguimiento) si Ingresos/Consumo Personal son cifras mensuales,
agregarlas como subcomponentes de la tarjeta PCE m/m.

- FRED tiene `PCEPI` (índice de precios PCE) y `PCEPILFE` (núcleo,
  excluye alimentos y energía) — mismo patrón de transform que CPI:
  `pce`/`core_pce` (`transform: 'pct_change'`, m/m) y
  `pce_yoy`/`core_pce_yoy` (`transform: 'pct_change_yoy'`, a/a).
  Agregados a la sección Inflación de USD, verificados al día contra
  FRED (junio-2026 disponible).
- **Ingresos y Consumo Personal SÍ son mensuales** (series `PI`
  —Personal Income— y `PCE` —Personal Consumption Expenditures, el
  gasto nominal, no confundir con el índice de precios `PCEPI`— ambas
  de FRED, publicadas el mismo día que el índice de precios PCE).
  Agregadas como `personal_income`/`personal_spending`, ambas con
  `parentId: 'pce'` (child de la tarjeta PCE m/m, no de la a/a — igual
  criterio que ISM: los subcomponentes cuelgan de la versión m/m
  porque es la que sigue el mercado mes a mes).
- Con `SectionGrid.tsx` ya generalizado (punto 8), estos dos
  subcomponentes automáticamente obtuvieron el botón "2
  subcomponentes" + modal en la tarjeta PCE m/m sin tocar código de
  UI — la única diferencia con el resto de subcomponentes nuevos de
  esta sesión es que **estos dos SÍ tienen dato real cargado** (son
  automáticos vía FRED, no manuales like el resto del punto 5/8).

Con esto la lista completa de PRs mergeados esta sesión (segunda
mitad del 31-jul hasta 1-ago-2026) es #2 al #10, todos verificados con
el check de Vercel en verde y varios además probados en vivo contra
`hikman-prueba.vercel.app`.

## Sesión 1-ago-2026 (tarde/noche): preliminar/final, EUR flash→final, cron de GitHub Actions roto, subcomponentes de PIB

Tercera sesión del mismo día. Arrancó con el usuario retomando el chat
después de la sesión anterior (madrugada del 1-ago) y pidiendo cosas
puntuales que fueron escalando a investigaciones más profundas. Sin PRs
de por medio esta vez — se trabajó y pusheó directo a
`claude/handoff-documentation-review-486n0j` y de ahí (fast-forward, sin
merge commit) a `claude/macro-usd-web-dashboard-xm5ypk`, con permiso
implícito dado el patrón ya establecido en la sesión anterior de pushear
directo cuando el usuario pide "pushea". 9 commits, todos con
`npm run build` + typecheck de `/api` en verde antes de pushear.

### 1. USD Empleo — Ganancias Promedio por Hora (a/a) + Índice de Costo Laboral

Pedido explícito del usuario. `wage_pct` (ya existente, solo m/m) se
renombró a "Ganancias Promedio por Hora (m/m)" y se agregó
`wage_pct_yoy` (mismo FRED `CES0500000003`, transform `pct_change_yoy`).
Nuevo: `eci_qoq`/`eci_yoy` — Índice de Costo Laboral (compensación total,
trabajadores civiles), la medida de costo laboral que más de cerca sigue
la Fed. **FRED_MAPPINGS de USD no tenía el transform `pct_change_quarter`**
(sí existía en `eur-sync.ts` para PIB de EUR, pero nunca se había portado
al sync de USD) — se agregó. `eci_qoq` usa `ECIALLCIV` (SA, la serie que
destaca el propio comunicado del BLS para t/t); `eci_yoy` usa
`CIU1010000000000I` (NSA) — misma convención SA-para-t/t/NSA-para-a/a que
CPI/PPI. Verificado contra el comunicado del BLS de Q2-2026 (31-jul-2026):
oficial 0.9% t/t y 3.4% a/a vs. 0.89%/3.38% calculado (a/a con ~0.02pp de
margen de redondeo, normal).

### 2. Insignia Preliminar/Final (`IndicatorMeta.releaseStage`)

Pedido explícito: "identificar todos los datos macro que son
preliminares y finales, que se vea en la casilla del dato". Campo nuevo
`releaseStage?: 'preliminar' | 'final'` en `types.ts`, badge chico (borde
+ texto, ámbar para preliminar / gris para final) en `ChartCard.tsx`
(título de la tarjeta, funciona en compacto y en el modal de
subcomponentes por igual) y en `Actualizar.tsx` (al lado del badge de
fuente FRED/EUROSTAT/etc.).

**Criterio aplicado** (documentado en el campo mismo, en `types.ts`): solo
se marca cuando la fuente publica el MISMO dato en dos vueltas distintas
y este dashboard sabe con certeza cuál de las dos está trackeando. **A
propósito NO se usa** para indicadores con revisión gradual del mismo
punto de serie (PIB de cualquier divisa: el último punto siempre puede
ser preliminar y se revisa en el mismo id con el correr de los meses, no
hay forma honesta de taggear el indicador entero como una cosa fija) —
mismo criterio se le terminó aplicando también al HICP de EUR una vez
que se automatizó el flash→final (ver punto 3): se le sacó el tag
`final` que se le había puesto en un primer commit, porque dejó de ser
una propiedad fija.

Etiquetado en esta sesión (38 ids en el primer pase, después se corrigió):
- **Preliminar**: `eur_pmi_manuf_flash`/`eur_pmi_serv_flash` + sus 8
  subcomponentes, `gbp_pmi_manuf_flash`/`gbp_pmi_serv_flash` + sus 8
  subcomponentes (22 ids — ya se llamaban "Flash" en el nombre, no hacía
  falta investigar), `jpy_tokyo_cpi_yoy`/`jpy_tokyo_core_cpi_yoy` (2 ids
  — ya documentado como "adelanto del nacional").
- **Final**: `sp_pmi_manuf`/`sp_pmi_serv` (USD), `jpy_pmi_manuf`/
  `jpy_pmi_serv`, `aud_pmi_manuf`/`aud_pmi_serv` (6 ids — ninguna de
  estas tres divisas trackea la lectura flash de S&P Global por
  separado, así que lo que se carga a mano es la final), `jpy_gdp_qoq`/
  `jpy_gdp_yoy` (2 ids — ya documentado que se verifica contra el dato
  revisado).
- **Corrección real encontrada investigando el reporte de EUR (punto 3)**:
  `eur_de_hicp_mom`/`yoy` y `eur_fr_hicp_mom`/`yoy` se habían marcado
  `final` en el primer pase (asumiendo que como no había flash trackeado
  aparte, lo cargado era la final) — **error**: se verificó con Destatis
  ("Inflationsrate im Juli 2026 voraussichtlich +2,8%... resultados
  definitivos recién el 12-ago") e INSEE ("résultats provisoires...
  definitivos el 14-ago") que ambas oficinas publican primero una cifra
  EXPLÍCITAMENTE preliminar (lo que se carga el día del release) y la
  definitiva ~2 semanas después — se corrigieron los 4 a `preliminar`.
  **Lección para cualquier caso similar**: no asumir "final" solo porque
  no se trackea una versión "preliminar" aparte — verificar si la fuente
  misma llama preliminar/provisoria a lo que se está cargando.
- Al automatizar el HICP de EUR con flash→final real (punto 3), se le
  sacó el tag a los 8 ids de EUR (`eur_cpi`/`_yoy`, `eur_core_cpi`/`_yoy`,
  `eur_de_hicp_mom`/`_yoy`, `eur_fr_hicp_mom`/`_yoy`) — pasaron a
  comportarse como el PIB (dinámico por punto), no una propiedad fija.

### 3. EUR — investigación de "por qué no actualiza" → 3 hallazgos reales

El usuario reportó que la inflación de la Eurozona/Francia no reflejaba
el flash de julio (31-jul-2026). Investigación de tres capas:

**a) La Eurozona agregada (`eur_cpi`/`_yoy`) NO estaba atrasada por
diseño** — FRED (fuente automática de esa serie hasta este punto) solo
republica el dato FINAL de Eurostat, con ~1 mes de rezago respecto al
flash (confirmado: FRED tenía junio confirmado el 17-jul, no tenía nada
de julio). Julio recién iba a estar disponible vía FRED a mediados de
agosto. Esto se resolvió de raíz automatizando con Eurostat directo (ver
más abajo), no hacía falta esperar a FRED.

**b) Francia (`eur_fr_hicp_mom`/`_yoy`) SÍ estaba genuinamente atrasada**
— el flash de julio de INSEE (31-jul-2026, HICP m/m +0.6%/a/a +2.4%,
"résultats provisoires") no se había cargado, a diferencia de Alemania
que sí tenía su flash del mismo día ya cargado por una sesión anterior.
Se cargó a mano en ese momento (después reemplazado por el sync
automático, ver punto 4).

**c) Bug de datos real encontrado**: `eur_fr_hicp_yoy` tenía un punto
guardado (3.0%, fechado `2026-07-16`) que **no coincidía con ningún
comunicado real de INSEE** para ningún mes cercano (junio real ~2.0%,
julio flash ~2.4%) — se borró y se recargaron los puntos correctos.
**Causa raíz relacionada, encontrada más tarde (punto 4)**: varias cargas
manuales de esta sesión y de sesiones anteriores usaban la fecha de
PUBLICACIÓN en vez de la fecha de PERÍODO para el campo `date` de
`indicator_overrides` — rompe el mecanismo de "el próximo sync pisa este
mismo punto" porque el sync automático siempre usa `YYYY-MM-01` (fecha de
período). Se encontraron y corrigieron **5 puntos con este problema**:
`eur_cpi_yoy` (17-jul), `eur_core_cpi_yoy` (17-jul), `eur_de_hicp_mom`/
`_yoy` (30-jul), `eur_fr_hicp_mom`/`_yoy` (los que se acababan de cargar
a mano en el punto b, 31-jul). **Lección para cualquier carga manual
futura, en cualquier divisa**: el campo `date` de `indicator_overrides`
tiene que ser SIEMPRE la fecha del período de referencia (primer día del
mes/trimestre), nunca la fecha en la que se cargó o se publicó el dato —
si no, un punto "fantasma" con fecha más reciente que el período real
puede quedar mostrándose como "Actual" indefinidamente, y además rompe
la lógica de reemplazo automático flash→final.

### 4. EUR HICP — automatización real vía `prc_hicp_fpd` (Eurostat)

El usuario preguntó explícitamente si había forma de que el dato
preliminar apareciera enseguida y se reemplazara solo por el final
cuando saliera. Investigación: Eurostat tiene un dataset dedicado a
exactamente esto, **`prc_hicp_fpd`** ("HICP — first released data"), con
una dimensión `release` que separa **FLS** (flash, ~1 semana después de
terminado el mes) de **FIN** (final/revisado, ~2-3 semanas después del
flash) — y la tasa m/m/a/a YA CALCULADA por Eurostat (no hay que derivar
de un índice, evitando el sesgo de ~0.1pp que ya excluía el a/a del
mapeo automático viejo).

`api/eur-sync.ts` → `fetchHicpFpd()`: pide `M.{unit}.{coicop}.FIN+FLS.{geo}`
(unit=RCH_M/RCH_A, coicop=TOTAL/TOT_X_NRG_FOOD para core), arma un mapa
`período → valor` recorriendo primero FLS y pisando con FIN si también
está disponible para ese período, y guarda con fecha de PERÍODO
(`YYYY-MM-01`). Como el upsert es por `(indicator_id, date)`, la corrida
siguiente pisa el flash con el final automáticamente en la misma fila,
sin intervención manual — **verificado con datos reales, no solo en
teoría**: `eur_cpi_yoy` de junio-2026 mostraba 2.8% (flash) antes del
primer sync con esta fuente, y pasó a 2.7% (el FINAL, revisado a la
baja) apenas se corrió — mientras julio-2026 se pobló con 2.9% (el flash
recién salido el 31-jul). Reemplaza el mapeo FRED viejo para
`eur_cpi`/`_yoy`, `eur_core_cpi`/`_yoy`, `eur_de_hicp_mom`/`_yoy`,
`eur_fr_hicp_mom`/`_yoy` — estos dos últimos **dejan de ser manuales en
el a/a** (antes solo el m/m estaba automatizado vía FRED, el a/a se
había descartado por el mismo sesgo de derivar de un índice).

Geo/coicop verificados: `EA20` = "Euro area" (el código que usa
Eurostat en sus comunicados de flash, no `EA19`/`EA21`/`EA`), `DE`/`FR`
directo. `TOT_X_NRG_FOOD` = "Overall index excluding energy, food,
alcohol and tobacco", el código correcto para "Core CPI".

**Gotcha real de la API SDMX de Eurostat**: pedir con parámetros de
query string sueltos (`?geo=EA20&unit=...`) y `lastTimePeriod=N` a veces
**ignora el filtro** y devuelve el dataset completo (70+ MB, timeout) —
la forma confiable es el formato de key posicional en el path
(`/data/{dataset}/{freq}.{unit}.{item}.{geo}?format=JSON&startPeriod=...`),
mismo patrón que ya se usaba para `prc_hicp_fpd`. Si se agrega otra
consulta a la API de Eurostat en el futuro, usar SIEMPRE el formato de
path, nunca query-string suelto.

### 5. EUR — PIB por componente, automatización vía `namq_10_gdp`

Directamente relacionado al punto 8 (rediseño de subcomponentes de PIB):
una vez cargados a mano 68 puntos históricos para EUR (punto 8), el
usuario notó que el PIB general (`eur_gdp_qoq`, vía FRED, ya tenía
Q2-2026) pero los subcomponentes seguían en Q1 — Eurostat publica el
headline flash mucho más rápido que el detalle por componente (~5-7
semanas de rezago, la "estimación regular"), así que sin automatizar
esto iba a repetirse cada trimestre. Se encontró que **el mismo dataset
`namq_10_gdp`** que ya daba el nivel del PIB (vía FRED, serie
`CLVMNACSCAB1GQEA19`) tiene, dentro de Eurostat directo, un
`unit=CON_PPCH_PRE` ("contribution, percentage point change, previous
period") con la contribución YA calculada — no hay que derivarla de
niveles (a diferencia de lo que se intentó sin éxito para CAD, ver punto
8).

`fetchNamqContribution(naItem)`: pide `Q.CON_PPCH_PRE.SCA.{naItem}.EA20`.
Items usados: `P31_S14_S15` (Consumo, hogares), `P3_S13` (Gobierno),
`P51G` (Inversión/GFCF), `P6`+`P7` (Exportaciones Netas = exportaciones +
importaciones — **ojo**: `P7` de este dataset YA viene con el signo
correcto, negativo cuando las importaciones suben, así que se SUMAN los
dos, no se resta). Verificado Q1-2026: 0.12+0.13-0.07-0.30 ≈ -0.2%
(coincide con el PIB real de Eurostat). Corrida real en producción, 0
errores.

### 6. Bug real de infraestructura: el cron de GitHub Actions nunca disparó solo

Mientras se investigaba el punto 3, el usuario preguntó explícitamente
si el problema tenía que ver con haber sacado el botón manual de sync
(sesión anterior). Se verificó con la API de GitHub
(`actions_list` → `list_workflow_runs`): **ambos workflows
(`sync-titulares.yml` cada 10min, `sync-currencies.yml` cada 30min)
tenían exactamente 1 corrida total cada uno** — la manual de prueba
disparada al mergear, ~00:38 UTC del 1-ago. Para cuando se detectó
(~02:07 UTC, 1h29min después), deberían haber disparado ~9 veces
(titulares) y ~3 veces (divisas) por `schedule` — cero lo hicieron. El
YAML no tiene ningún error de sintaxis (`cron: '*/10 * * * *'` y
`'*/30 * * * *'` son válidos) — es un comportamiento conocido pero no
bien documentado de GitHub: workflows programados recién creados pueden
tardar (a veces horas) en "despertar" del lado del scheduler de GitHub,
sin garantía de cuánto.

**Mitigación aplicada**: se disparó manualmente ambos workflows de nuevo
(ya corrieron bien la segunda vez) y se armó una **Rutina de respaldo**
(`mcp__Claude_Code_Remote__create_trigger`, cron `0 * * * *`,
`create_new_session_on_fire: true`) — id `trig_01VigD4t2wgyxh8YCAYDqtg1`,
nombre "Backup sync HIKMAN (Titulares + Divisas)" — que llama a los
mismos 11 endpoints (`headlines-sync`, `translate-headlines`, `fred-sync`,
`eur-sync`, `gbp-sync`, `cad-sync`, `aud-sync`, `nzd-sync`, `jpy-sync`,
`chf-sync`, `cny-sync`) cada hora como red de seguridad independiente
del cron nativo, con instrucciones de avisar solo si hay errores
repetidos, y de sugerir borrarse sola si en algún momento se confirma
que el cron de GitHub ya está disparando solo de forma consistente. **No
se llegó a confirmar en esta sesión si el cron nativo arrancó a andar
solo más tarde** — la próxima sesión debería chequear
`list_workflow_runs` con `event: schedule` antes de asumir que sigue
roto o que ya se arregló.

### 7. University of Michigan Consumer Sentiment (`uom`) — corregido a mano

El usuario reportó que el dato de sentimiento del consumidor (31-jul,
que él pensaba preliminar) no actualizaba. Investigación: **el dato del
31-jul en realidad era el FINAL de julio (55.2)**, no preliminar — el
preliminar de julio había salido antes, a mediados de mes (54.4); el
próximo dato real es el preliminar de AGOSTO, recién el 14-ago (se le
aclaró el malentendido al usuario, lo aceptó). El problema real: **FRED
(fuente de `uom`) todavía no había absorbido el 55.2** — verificado
directo contra la API de FRED, la serie `UMCSENT` seguía en junio (49.5)
con `last_updated` de antes del 31-jul. No es un bug de esta app, es un
rezago real del lado de FRED. Se encontró que la propia Universidad de
Michigan publica el dato en su página pública (`sca.isr.umich.edu`, sin
login) apenas sale — se cargó 55.2 a mano para no dejar la tarjeta
desactualizada mientras se espera a FRED. **No se automatizó esa fuente**:
su portal de datos estructurados (`data.sca.isr.umich.edu`) pide login
para la serie descargable, y encima esa subpágina mostraba un número
distinto (49.5) al de la homepage pública (55.2) — inconsistente incluso
dentro del propio sitio de la universidad, no vale la pena scrapear.

### 8. Subcomponentes de PIB — rediseño completo en las 9 divisas + backfill histórico

Pedido en dos partes: primero "revisá los subcomponentes del PIB de cada
economía", después (al preguntar qué reemplazo quería) "la opción 2 y
precios" — reemplazar "Demanda Interna/Demanda Externa" (agregados en la
sesión anterior, vacíos, ninguna fuente los publicaba así) por el
desglose clásico C+I+G+NX (Consumo/Inversión/Gasto Público/Exportaciones
Netas), manteniendo Precios (el deflactor, sin tocar). Después el
usuario pidió además backfill histórico ("desde principios de 2026")
para que quedara un registro real, no solo el próximo trimestre que se
cargue a mano — eso llevó a auditar fuente por fuente cuáles países
publican una CONTRIBUCIÓN pre-calculada (lo único confiable de cargar)
vs. cuáles no.

**Cambio estructural** (`src/data/indicators*.ts`, las 9 divisas):
`{prefix}_gdp_domestic_demand`/`{prefix}_gdp_external_demand` → 4 ids
nuevos `{prefix}_gdp_consumption`/`_investment`/`_government`/
`_net_exports`, mismo `parentId` que antes (el PIB principal de esa
divisa). **Bug propio encontrado antes de commitear**: el script de
reemplazo (Python, regex) dejaba `parentId: None,` (typo directo de
Python, no de los datos) en los 32 bloques nuevos de las 8 divisas
no-USD — se corrigió con `sed` antes de que llegara a un commit.

**Cobertura real lograda por divisa** (la lección grande de esta parte:
"¿el país publica una fuente de contribución YA calculada, o solo tasas
de crecimiento sueltas por componente?" — la respuesta varía mucho y no
se puede asumir sin chequear caso por caso):

- **USD**: automático desde el primer commit — BEA publica esto directo
  como "Contributions to percent change in real GDP" (NIPA tabla
  1.1.2), ya en FRED: `DPCERY2Q224SBEA` (Consumo), `A006RY2Q224SBEA`
  (Inversión), `A822RY2Q224SBEA` (Gobierno), `A019RY2Q224SBEA`
  (Exportaciones Netas). Verificado Q2-2026: suman 1.50pp, exacto contra
  `gdp_qoq` (1.5%) ya cargado.
- **EUR**: automático, ver punto 5 arriba. 17 trimestres (2022-Q1 a
  2026-Q1) cargados de una vía la misma query que se automatizó después.
- **AUD**: automático — la ABS TAMBIÉN tiene la contribución
  pre-calculada, dataflow `ANA_EXP`, `MEASURE=TCH` ("Contributions to
  Growth - Chain volume measures") — no se automatizó en el sync (quedó
  como carga histórica única, no wireado a `aud-sync.ts` todavía, a
  diferencia de EUR) pero se cargaron 17 trimestres (2022-Q1 a 2026-Q1)
  verificados. **Detalle de mapeo** (dimensión `SECTOR` del dataflow):
  Consumo = `FCE.PHS` (hogares); Gasto Público = `FCE.GGS` (consumo de
  gobierno) + `GFC.GGS` (inversión de gobierno, sumados — mismo criterio
  que USD, que combina consumo e inversión pública en un solo bucket);
  Inversión = `GFC.PSS` (inversión privada) + `IST.SSS` (cambio en
  inventarios); Exportaciones Netas = `XGS.SSS` + `MGS.SSS`. Verificado
  Q1-2026: 0.3+0.7+0.1-0.8 = 0.3%, exacto contra el PIB real (el primer
  intento, sin separar el gasto de gobierno en consumo+inversión, daba
  0.2% — 0.1pp de diferencia real, no redondeo, por eso se separó por
  sector).
- **JPY**: solo Exportaciones Netas (0.3pp, Q1-2026) — el Cabinet Office
  japonés (ESRI) **no desglosa** Consumo/Inversión/Gasto como
  contribución en puntos porcentuales, solo publica demanda interna
  total vs. demanda externa como series de "寄与度" (contribución) — y
  encima esas series de e-Stat Dashboard están discontinuadas desde
  2025-Q3 (base vieja, sin reemplazo encontrado). El de Exportaciones
  Netas se sacó de Trading Economics (que sí trackea esa serie del
  Cabinet Office) porque el PDF oficial (`esri.cao.go.jp`) no se pudo
  parsear — ver nota de PDF más abajo.
- **CNY**: Consumo/Inversión/Exportaciones Netas cargados (Q1-2026:
  2.4pp/1.9pp/0.8pp ≈ 5.0% a/a, exacto) pero **reparentados a
  `cny_gdp_yoy`, no `cny_gdp_qoq`** — la NBS solo publica esta
  contribución para el crecimiento INTERANUAL, nunca trimestral. Además
  "Consumo" en la convención china (`Final Consumption Expenditure`) ya
  viene combinado hogares+gobierno sin desglosar — por eso
  `cny_gdp_government` queda sin dato a propósito (no es una carga
  pendiente, es un límite real de cómo China publica sus cuentas
  nacionales). Q2-2026 se encontró pero en formato "% de participación"
  (ambiguo, no puntos porcentuales directos) — no se cargó para no
  arriesgar una conversión mal hecha.
- **GBP, CAD, NZD, CHF**: sin nada cargado, siguen "sin datos" como
  antes de esta sesión. Investigado y descartado por motivos distintos
  en cada caso:
  - **GBP** (ONS): el bulletin de "GDP quarterly national accounts" da
    tasas de crecimiento POR componente (ej. "household consumption
    increased 0.6%") pero nunca la contribución en puntos porcentuales
    en el texto — esa cifra vive solo en un gráfico (Figure 6) sin datos
    tabulares accesibles vía scraping razonable.
  - **CAD** (StatCan): se buscó en el catálogo completo de cubos
    (`getAllCubesListLite`, 8215 cubos) — **solo existen tablas de
    contribución ANUALES** (36100128/131/132/135), ninguna trimestral.
    Se intentó derivar la contribución trimestral desde los niveles
    reales (tabla 36100123, SAAR) con la fórmula estándar
    `100×(X_t-X_{t-1})/GDP_{t-1}` — el cálculo dio -0.3% para el PIB de
    Q1-2026 cuando el comunicado real de StatCan dice explícitamente
    "real GDP was unchanged... 0.0%" — **no cerró, así que no se cargó
    nada** en vez de arriesgar un número que no se puede confiar. Queda
    sin resolver: no se identificó por qué la derivación desde niveles
    no coincide (podría ser una confusión entre GDP por industria vs.
    por gasto, dos series distintas de StatCan que en teoría deberían
    coincidir pero no necesariamente en cada trimestre puntual — no
    investigado a fondo por tiempo).
  - **CHF** (SECO): el feed CSV ya usado (`scheduler.swissdatas.ch/
    scheduled/ch-seco-gdp.csv`) SÍ tiene un `type=gc_q` ("growth
    contribution quarterly") que en teoría es justo lo que hace falta —
    pero las filas de comercio exterior (`exp`/`imp`/`trade_balance`/
    `v_net`/`demand_dom`) salían con una escala completamente
    inconsistente con el resto (valores de -3 a +6 cuando el PIB total
    del trimestre fue +0.4%) — no se investigó por qué (¿otra base,
    otra unidad, otro denominador?) y no se cargó nada por el mismo
    criterio que CAD.
  - **NZD** (Stats NZ): mismo patrón que GBP, solo tasas de crecimiento
    sueltas encontradas, no contribución en pp.

**Nota sobre extracción de PDFs en este sandbox**: se intentó leer el
resumen oficial del Cabinet Office de Japón (PDF) para buscar la
contribución completa — `WebFetch` no puede leer contenido binario de
PDF (solo HTML convertido a texto), y las librerías Python instalables
en este entorno (`pypdf`, `pdfminer.six`) fallan por un problema de
entorno con el módulo `cryptography`/`_cffi_backend` (no relacionado al
proyecto, un problema del sandbox). Si hace falta leer un PDF de nuevo,
no perder tiempo con estas librerías acá — usar `WebSearch`/`WebFetch`
sobre versiones HTML del mismo contenido, o pedirle al usuario el texto
si existe un espejo en HTML.

**Gaps conocidos nuevos por esta sección** (ver también la lista general
más abajo): `cny_gdp_government` sin dato a propósito (límite real de
fuente, no pendiente); GBP/CAD/NZD/CHF sin ningún subcomponente de PIB
cargado (ni siquiera 1 trimestre) — si se repite el pedido de backfill,
empezar por buscar si StatCan/ONS/Stats NZ/SECO sacaron alguna vez una
tabla de contribución trimestral nueva antes de re-intentar la
derivación manual desde niveles (que ya falló una vez para CAD).

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
- **`chinadata.live` volvió a atrasarse una segunda vez el 31-jul-2026**
  (un día después de la primera corrección) — mismo patrón, 8 de 13
  series ~2 meses atrás. Corregido de nuevo a mano (ver "Corrección de
  datos..." arriba). Dos veces en dos días es más frecuente de lo que
  el handoff anterior anticipaba — si pasa una tercera vez, priorizar
  el fallback de scraper de `stats.gov.cn` en vez de seguir corrigiendo
  a mano cada vez.
- **~99 subcomponentes nuevos de PMI Manufactura+Servicios/PIB (sesión
  31-jul/1-ago-2026) no tienen ningún dato cargado** — 63 de la
  primera pasada (solo Manufactura) + 36 más de PMI Servicios agregados
  después (ver secciones 5 y 8 arriba para la lista completa de ids).
  Todos manuales, quedan con la insignia "sin datos" hasta que el
  usuario los cargue desde "Actualizar Datos" (ahora agrupados justo
  debajo de su padre, más fácil de encontrar). **Excepción real con
  dato cargado**: `personal_income`/`personal_spending` (subcomponentes
  de PCE m/m en USD, ver sección 12) — automáticos vía FRED, no
  manuales.
- **Renta Variable (`/renta-variable`) depende de una API no oficial de
  Yahoo Finance** para todos los índices de las 9 divisas y las
  acciones de 8 de las 9 (todo salvo las 7 acciones de USD, que usan
  Finnhub) — sin SLA, podría romperse sin aviso. Si deja de responder,
  revisar `api/equities-quotes.ts` primero (ver detalle en "Nueva
  sección Renta Variable" arriba).
- **GitHub Actions (`sync-titulares.yml`/`sync-currencies.yml`) es el
  mecanismo de refresco automático principal** desde que se sacaron los
  botones manuales (sección 11) — **actualización 1-ago-2026 (sesión
  tarde/noche): se confirmó que el cron NO disparó solo durante al menos
  la primera hora y media después de crearse** (0 corridas por
  `schedule` en `list_workflow_runs`, comportamiento conocido pero no
  garantizado de GitHub con workflows recién creados). Se armó una
  Rutina de respaldo cada hora (`trig_01VigD4t2wgyxh8YCAYDqtg1`, ver
  sección de sesión punto 6) que llama a los mismos endpoints
  independientemente del cron nativo — **cualquier sesión nueva debería
  chequear con `list_workflow_runs` (`event: schedule`) si el cron ya
  arrancó a andar solo**; si sí, avisar al usuario que la Rutina de
  respaldo ya no hace falta y ofrecer borrarla con `delete_trigger`.
- `cny_gdp_government` no tiene dato a propósito, no por carga pendiente
  — la NBS no desglosa gasto de gobierno del consumo privado en su
  "Final Consumption Expenditure" (ver sección de sesión punto 8).
- **GBP, CAD, NZD, CHF no tienen NINGÚN subcomponente de PIB cargado**
  (ni un solo trimestre) — ninguna de las 4 fuentes oficiales ya usadas
  en este proyecto publica una tabla de contribución al crecimiento por
  componente lista para usar; el intento de derivarla desde niveles
  reales para CAD no cerró contra el PIB oficial (dio -0.3% vs. el 0.0%
  real) y no se cargó nada. Ver sección de sesión punto 8 para el
  detalle completo de qué se investigó en cada una antes de descartarla.

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

# Eurostat SDMX: SIEMPRE usar el formato de key posicional en el path, nunca
# query-string suelto con lastTimePeriod (ignora el filtro y devuelve el
# dataset completo, 70+MB, timeout) — formato:
# /data/{dataset}/{freq}.{unit/otras dims}.{item}.{geo}?format=JSON&startPeriod=...

# Eurostat prc_hicp_fpd (HICP flash/final ya calculado) — geo=EA20/DE/FR,
# coicop=TOTAL (headline) o TOT_X_NRG_FOOD (core), unit=RCH_M/RCH_A,
# release=FIN+FLS juntos (FIN tiene prioridad si existe para el período)
curl -s "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/prc_hicp_fpd/M.RCH_A.TOTAL.FIN+FLS.EA20?format=JSON&startPeriod=2026-01" -A "Mozilla/5.0"

# Eurostat namq_10_gdp (PIB por componente, contribución ya calculada) —
# unit=CON_PPCH_PRE, na_item: P31_S14_S15=Consumo hogares, P3_S13=Gobierno,
# P51G=Inversión/GFCF, P6=Exportaciones, P7=Importaciones (ya con signo
# correcto — sumar P6+P7 para Exportaciones Netas, no restar)
curl -s "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/namq_10_gdp/Q.CON_PPCH_PRE.SCA.P31_S14_S15.EA20?format=JSON&startPeriod=2025-Q1" -A "Mozilla/5.0"

# ABS Data API: estructura de dimensiones de un dataflow (orden del key + codelists)
curl -s "https://data.api.abs.gov.au/rest/datastructure/ABS/LF?format=json" -A "Mozilla/5.0"
# Valores válidos por dimensión (marginal, no garantiza la combinación exacta)
curl -s "https://data.api.abs.gov.au/rest/availableconstraint/LF?format=json" -A "Mozilla/5.0"
# Traer datos de una serie con key completo (orden: ver datastructure)
curl -s "https://data.api.abs.gov.au/rest/data/LF/M13.3.1599.20.AUS.M?format=jsondata&startPeriod=2026-01" -A "Mozilla/5.0"

# ABS ANA_EXP (PIB por gasto, contribución al crecimiento ya calculada) —
# dataflow distinto de ANA_AGG (que solo tiene agregados, sin desglose por
# gasto). MEASURE=TCH ("Contributions to Growth"), DATA_ITEM: FCE=consumo
# (con SECTOR=PHS hogares / GGS gobierno), GFC=inversión fija (SECTOR=PSS
# privada / GGS gobierno — sumar ambas a Gasto Público, no dejarlas todas
# juntas bajo Inversión, o el total no cierra), IST=inventarios, XGS/MGS=
# exportaciones/importaciones (sumar para Exportaciones Netas)
curl -s "https://data.api.abs.gov.au/rest/data/ANA_EXP/TCH.FCE.PHS.20.AUS.Q?format=jsondata&startPeriod=2022-Q1" -A "Mozilla/5.0"

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

## Sesión 1-ago-2026 (cont.): etapa preliminar/final dinámica por punto, backfill de PMI headline

Continuación de la sesión anterior en el mismo chat. El usuario aclaró dos
cosas sobre lo hecho antes:

1. **PMI subcomponentes**: confirmado que no hay forma gratis de conseguir
   el desglose numérico (ver sección "Sesión 1-ago-2026 (tarde/noche)" más
   arriba, punto de investigación de PMI) — el usuario aceptó esto y pidió
   en cambio conseguir el **dato general (headline)** de PMI para TODAS las
   economías, aclarando que para USD son dos reportes distintos: ISM
   (`ism_manuf`/`ism_serv`) y S&P Global (`sp_pmi_manuf`/`sp_pmi_serv`).

2. **Preliminar/Final tiene que ser dinámico, no una etiqueta fija**: el
   pedido explícito fue que el mismo casillero/id siga la secuencia
   Preliminar → Final → Preliminar → Final… — cuando sale el dato flash de
   un mes se carga y la tarjeta muestra "Preliminar"; cuando 1-2 semanas
   después sale el final del MISMO mes, cargarlo debe **reemplazar el punto
   de ese mes** (no agregar uno nuevo) y la tarjeta debe pasar a mostrar
   "Final", hasta que llegue el flash del mes siguiente.

### Por qué el campo `IndicatorMeta.releaseStage` original no alcanzaba

Antes de este cambio, `releaseStage` era una propiedad **fija por
indicador** (hardcodeada en `indicatorsEur.ts`/`indicatorsGbp.ts`/etc.) —
`eur_pmi_manuf_flash` siempre mostraba "Preliminar" aunque el usuario ya
hubiera cargado la revisión final de ese mes, y no existía ningún id
"final" separado para cargar esa revisión — no había dónde ponerla. El
propio comentario en `types.ts` ya admitía el problema ("ahí el
preliminar/final cambia con cada punto de la serie, no es una propiedad
fija del indicador") pero nunca se había implementado.

**Dato clave que ya estaba resuelto sin saberlo**: `addPoint(id, date,
value)` ya hace `supabase.from('indicator_overrides').upsert({indicator_id,
date, value})`, y la tabla tiene `primary key (indicator_id, date)` — o
sea que cargar un valor con la MISMA fecha que uno ya cargado **ya
reemplazaba el valor en el lugar** (mismo casillero en el gráfico e
histórico). Lo único que faltaba era que la etiqueta preliminar/final
acompañara ese reemplazo en vez de quedar fija.

### Implementación

- **`supabase/schema.sql`**: columna nueva `stage text check (stage in
  ('preliminar','final'))` en `indicator_overrides` (nullable — no rompe
  filas viejas). Migración aparte para la base ya viva:
  `supabase/migration_2026-08-01_release_stage.sql` — hay que correrla en
  Supabase > SQL Editor (el `create table if not exists` de schema.sql no
  toca tablas que ya existen).
- **`MacroDataContext.tsx`**: se agregó un `StageMap` (`id -> fecha ->
  etapa`) paralelo al `SeriesMap` existente — a propósito NO se tocó el
  tipo `SeriesPoint` (sigue siendo la tupla `[fecha, valor]`, muchos
  archivos la destructuran así). `addPoint` ahora acepta un 4° argumento
  opcional `stage?: 'preliminar' | 'final'`; `getReleaseStage(id)` resuelve
  la etapa del ÚLTIMO punto de la serie mergeada (base histórico +
  overrides), devolviendo `undefined` si ese punto no tiene etapa
  registrada (dato del seed histórico, o cargado antes de este cambio) —
  en ese caso el llamador cae a `meta.releaseStage` como default fijo
  (así los indicadores viejos que nunca reciban una carga con etapa nueva
  siguen mostrando algo razonable).
- **`ChartCard.tsx`**: nueva prop `releaseStage` (resuelta por el padre,
  no se lee el context adentro de la tarjeta — a propósito, para no romper
  el `memo`/`areEqual` que evita que Recharts reinicie la animación del
  gráfico en cada re-render ajeno). `areEqual` ahora también compara
  `releaseStage`.
- **4 puntos de entrada de `ChartCard`** (`CountryPage.tsx`,
  `Dashboard.tsx`, `SectionGrid.tsx`, y `SubcomponentModal.tsx` vía prop
  nueva `getReleaseStage`) pasan `getReleaseStage(meta.id) ??
  meta.releaseStage`.
- **`Actualizar.tsx`**: la insignia ahora usa `currentStage` (dinámico) en
  vez de `meta.releaseStage`. Al lado del input de fecha/valor, si
  `meta.releaseStage` está seteado (o sea, este indicador participa del
  ciclo preliminar/final) aparece un `<select>` Preliminar/Final — sugiere
  por defecto lo opuesto a la etapa actual (si el último cargado fue
  preliminar, sugiere final, y viceversa) pero el usuario lo puede
  cambiar. Al guardar, `handleSave` le pasa la etapa elegida a `addPoint`.

### Qué falta para que esto sea útil en la práctica

El campo `meta.releaseStage` estático en `indicatorsEur.ts`/`Gbp.ts`/
`Jpy.ts`/etc. sigue como estaba (`eur_pmi_manuf_flash` = 'preliminar' fijo,
`jpy_pmi_manuf` = 'final' fijo) — **no hacía falta tocarlo**, solo actúa
como default para cuando todavía no se cargó ningún punto con etapa
explícita. La consecuencia práctica: la próxima vez que se cargue el PMI
Flash de julio de EUR/GBP hay que usar el selector y marcarlo
"Preliminar" (aunque ya se cargue en el mismo id `eur_pmi_manuf_flash`),
y cuando salga el final 1-2 semanas después, cargarlo con la MISMA fecha
del mes (ej. `2026-07-01`) y marcarlo "Final" — ahí sí reemplaza el punto
y la tarjeta cambia sola.

### PMI headline — backfill Ene-Jul 2026 por divisa

Pedido explícito: ya que los subcomponentes de PMI no tienen fuente
gratis (ver investigación en la sección anterior), conseguir al menos el
dato general (headline) de todas las economías, aclarando que USD trackea
DOS reportes de PMI separados: ISM (`ism_manuf`/`ism_serv`, ya estaba
completo Ene-Jul 2026, no hacía falta nada) y S&P Global
(`sp_pmi_manuf`/`sp_pmi_serv`, estaba vacío).

**Series que estaban completamente vacías y se cargaron de cero** (Ene-Jun
2026 = dato final/revisado, verificado contra al menos 2 fuentes
independientes cruzando prensa especializada — Reuters/FXStreet/
investingLive/TradingEconomics — contra el comunicado de S&P Global; julio
2026 = SOLO el flash, porque a la fecha de corte 1-ago-2026 el final
todavía no se había publicado en ninguna de las 6 economías con reporte
de dos vueltas):

- `sp_pmi_manuf`/`sp_pmi_serv` (S&P Global US, distinto de ISM)
- `jpy_pmi_manuf`/`jpy_pmi_serv` (au Jibun Bank Japan)
- `aud_pmi_manuf`/`aud_pmi_serv` (Judo Bank Australia)
- `cad_pmi_manuf`/`cad_pmi_serv` (S&P Global Canada — Ene-Jun únicamente,
  julio no encontrado en ninguna fuente a la fecha de corte; Canadá NO
  tiene reporte flash, solo una publicación mensual, así que no hay nada
  "preliminar" pendiente acá, simplemente el dato de julio todavía no
  salió)
- `nzd_pmi_manuf`/`nzd_pmi_serv` (BusinessNZ PMI/PSI, metodología propia
  distinta de S&P Global — igual que Canadá, publicación única sin flash)
- `chf_pmi_manuf` (procure.ch, publicación única sin flash; **Suiza
  también tiene un reporte de Servicios de procure.ch pero no se cargó
  todavía** — se confirmó que existe, falta la investigación mes a mes)

**releaseStage cambiado de `'final'` a `'preliminar'` (default estático)**
para `sp_pmi_manuf`/`serv`, `jpy_pmi_manuf`/`serv`, `aud_pmi_manuf`/`serv`
— porque el último punto cargado (julio) es genuinamente el flash, y con
el cambio de la sección anterior este default estático es justamente lo
que se usa hasta que alguien cargue el final de julio con el selector
nuevo en Actualizar Datos (ese sí va a marcar el punto como 'final' y va
a pisar este default). `cad_pmi_*`/`nzd_pmi_*`/`chf_pmi_manuf` NO tienen
`releaseStage` — a propósito, esas tres economías no tienen reporte flash
(una sola publicación mensual), no es que falte taggearlas.

**Datos NO cargados por no estar verificados con confianza suficiente**
(el agente de investigación los encontró pero marcó como sospechosos —
se prefirió dejar el hueco en la serie antes que cargar un número que
podía estar mal):
- `nzd_pmi_manuf` mayo-2026: dos fuentes se contradicen fuerte (49.9 vs.
  "up sharply from 51.3 in May" citado en el release de junio) — no se
  pudo reconciliar. La serie salta de abril a junio.
- `nzd_pmi_serv` julio-2026: un resultado de búsqueda daba "48.9, sexta
  contracción consecutiva", matemáticamente imposible si junio (50.6) fue
  expansión — probablemente contenido de otro período mal indexado por el
  buscador. No cargado.

**Pendiente para la próxima sesión**: cargar el FINAL de julio (vía el
selector Preliminar/Final de Actualizar Datos, misma fecha `2026-07-01`)
para `sp_pmi_manuf`/`serv`, `jpy_pmi_manuf`/`serv`, `aud_pmi_manuf`/`serv`
apenas salga (normalmente 1-5 días después del flash); cargar julio de
`cad_pmi_manuf`/`serv`, `nzd_pmi_manuf`/`serv`, `chf_pmi_manuf` apenas
publiquen (primeros días hábiles de agosto); investigar y cargar
`chf_pmi_serv` (procure.ch Services) desde cero, igual que se hizo acá
con el resto.

### PMI headline — backfill de todo 2025 (12 meses) en 6 economías

Pedido explícito de seguir extendiendo el histórico ("los otros PMIs de
todas las economías excluyendo los ISM del dólar, ¿podés añadirle más
históricos?"). Antes de arrancar se confirmó que **EUR y GBP PMI Flash ya
tenían histórico completo desde 2008** (222/221 puntos) — no hacía falta
tocarlos. Las 6 series que solo tenían desde enero-2026 se extendieron
con los 12 meses de 2025 completos (144 puntos nuevos): `sp_pmi_manuf`/
`serv` (S&P Global USD, distinto de ISM), `jpy_pmi_manuf`/`serv`,
`aud_pmi_manuf`/`serv`, `cad_pmi_manuf`/`serv`, `nzd_pmi_manuf`/`serv`,
`chf_pmi_manuf`. **`chf_pmi_serv` (procure.ch Servicios) se cargó por
primera vez** — nunca había tenido ningún dato, ahora tiene los 12 meses
de 2025 desde fuente primaria (bulletins oficiales UBS/procure.ch en
alemán, no un agregador).

**Hallazgo importante del agente de investigación, aplicado a los datos
de 2025**: varios agregadores automáticos (MQL5, Trading Economics,
myfxbook) a veces muestran el valor FLASH en vez del FINAL para los
reportes S&P Global que publican las dos vueltas (EE.UU., Japón,
Australia — Canadá/Nueva Zelanda/Suiza no tienen flash, esos quedan más
confiables tal cual). El agente cruzó cada mes sospechoso contra
prensa/comunicado fechado y cargó el valor FINAL correcto. Ejemplos:
marzo-2025 SPGI-US final=50.2 (el flash que muestran los agregadores es
49.8); julio-2025 final=49.8 (flash=49.5); varios meses de Japón y
Australia con el mismo patrón — detalle mes a mes en el output del
agente si hace falta revisar.

**Riesgo sin resolver, marcado para la próxima sesión**: como este mismo
patrón (agregador = flash, no final) apareció en 2025, es razonable
sospechar que el backfill de enero-junio 2026 de estas mismas 3 series
(`sp_pmi_manuf`/`serv`, `jpy_pmi_manuf`/`serv`, `aud_pmi_manuf`/`serv`,
cargado en una sesión anterior) podría tener el mismo problema en algún
mes. Se hizo un chequeo puntual: marzo-2026 de `sp_pmi_manuf` se
verificó contra fuente y coincide exacto (52.3, correcto). Los chequeos
de enero-2026 Japón y marzo-2026 Australia salieron contaminados con
artículos de 2025 mal indexados por el buscador (mismo problema de
indexación que ya había pasado antes) y no sirvieron para confirmar ni
refutar nada — no se pudo verificar esos dos puntualmente. Si el usuario
quiere, valdría la pena una pasada dedicada re-verificando enero-junio
2026 de estas 3 series contra fuente primaria antes de confiar 100% en
esos meses.

**3 discrepancias reales entre fuentes, resueltas con criterio (no
inventadas, están documentadas en el output del agente si hace falta
reabrir la discusión)**:
- `sp_pmi_serv` diciembre-2025: 52.5 (agregador) vs. 52.9 (prensa citando
  el comunicado) — se usó 52.9.
- `aud_pmi_manuf` mayo-2025: 50.7 (una fuente) vs. 51.0 (dos fuentes
  independientes, incluido el propio comunicado de junio de S&P Global
  citando mayo como comparación) — se usó 51.0 por mayoría de fuentes.
- `nzd_pmi_manuf` abril-2025: 53.9 (publicación original) vs. 53.3
  (revisión citada en el release de mayo) — se usó 53.3, la revisión más
  reciente (BusinessNZ revisa el ajuste estacional mes a mes, es
  comportamiento normal, no un error).

### Bug (parte 2): el try/catch no alcanzaba si el fetch se cuelga sin resolver ni rechazar

El usuario probó el fix anterior y avisó que seguía trabado en
"Cargando…" 5 minutos después. Confirmado que el fix SÍ estaba en
producción (se bajó el bundle en vivo y se encontró el string "Error al
sincronizar con Supabase"), así que el problema era otro: un
`fetch` que se cuelga sin nunca resolver NI rechazar (pasa con ciertos
firewalls/proxies que descartan paquetes en silencio en vez de cortar la
conexión activamente) no dispara ningún `catch` — el `await
Promise.all(...)` simplemente espera para siempre, y ningún try/catch
del mundo lo soluciona porque no hay excepción que atrapar.

**Fix**: `withTimeout()` — envuelve el `Promise.all(...)` en un
`Promise.race()` contra un timer de 30s que rechaza si no terminó a
tiempo. Así, cuelgue o error real, siempre hay algo que cae en el catch
y dispara el `finally { setLoading(false) }`.

**De paso, corregido un problema de UX relacionado**: con el fix
anterior solo (try/catch sin timeout), si la sync fallaba el badge iba a
pasar de "Cargando…" a "Sincronizado (Supabase)" — mintiendo, porque
`syncMode` se calcula solo a partir de si Supabase está CONFIGURADO
(`supabaseEnabled`, fijo en build time), no de si el último intento tuvo
éxito. Se agregó un estado nuevo `syncError` en `MacroDataContext`
(`true` si el intento más reciente falló o dio timeout, se resetea a
`false` al arrancar cada `refresh()`) y el badge en `Layout.tsx` ahora
tiene 4 estados reales: Cargando / Sincronizado (Supabase) / Guardado
local / **Sin conexión (reintentar)** — este último en rojo
(`--status-critical`). El badge ahora también es clickeable y llama a
`refresh()` — sirve para reintentar sin recargar toda la página.

### Bug: "Cargando…" se podía quedar trabado para siempre

El usuario preguntó por qué a veces la app le aparece "Sincronizado
(Supabase)" y en otro dispositivo/usuario aparece "Cargando…". Causa:
`syncMode` (`Layout.tsx`) depende de `supabaseEnabled`, que se fija en
build time según `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — es igual
para TODOS los que visitan el mismo deploy, no puede diferir por
usuario. Lo que sí varía por usuario es la RED: `MacroDataContext.tsx`
hacía el `Promise.all(...)` con todas las consultas a Supabase SIN
try/catch — si una sola falla por error de red (sin conexión, firewall
corporativo/escolar bloqueando `supabase.co`, alguna extensión de
privacidad bloqueando requests de terceros), el `Promise.all` entero
rechaza, la función corta ahí mismo, y el `setLoading(false)` del final
nunca se ejecuta — el badge se queda en "Cargando…" para siempre en vez
de degradar a algo usable. Fix: todo el bloque de Supabase ahora está en
`try { ... } catch (error) { console.error(...) } finally {
setLoading(false) }` — si falla, loguea el error en consola y el badge
deja de estar trabado (aunque en ese caso los datos que se ven son solo
la base local `historical-series.json`, sin overrides ni lo demás,
hasta que la próxima carga de página tenga mejor conexión).

### GBP PMI Manufactura junio-2026 tenía el flash, no el final

El usuario avisó "el dato de junio de PMI manufacturero de la libra no
coincidía". Confirmado: `gbp_pmi_manuf_flash` tenía cargado 53.1 para
junio-2026, que es el FLASH — el final (publicado 1-jul-2026) es 52.5:
"UK June final manufacturing PMI 52.5 vs 53.1 prelim" (investingLive).
Corregido a 52.5. De paso se chequeó Servicios del mismo mes por las
dudas: tenía 48.7 (flash), el final es 48.8 — diferencia mínima pero se
corrigió igual ("UK June final services PMI 48.8 vs 48.7 prelim").

Esto reabrió la sospecha de la sección anterior (el mismo tipo de
error puede estar en enero-junio 2026 de `sp_pmi_manuf`/`serv`,
`jpy_pmi_manuf`/`serv`, `aud_pmi_manuf`/`serv`) — se auditaron esos 36
valores mes a mes contra fuente (mayormente investingLive, que suele
titular "<mes> final <país> <serie> PMI X vs Y prelim/prior", formato
inequívoco). **35 de 36 estaban correctos** (ya eran el final, no el
flash). Un solo error real: `aud_pmi_serv` marzo-2026 tenía 46.6
(flash) en vez de 46.3 (final) — confirmado: "The S&P Global Australia
Services PMI Business Activity Index fell sharply to 46.3 from 52.8 in
February" (investingLive, informe final del 6-abr-2026) vs. el flash del
23-mar-2026 que decía "Services activity drops sharply to 46.6".
Corregido. Con esto, el riesgo de flash-vs-final en enero-junio 2026
queda cerrado — todo lo demás de estas 3 series se confirmó correcto.

### Duplicados de PMI headline (Excel vs backfill)

El usuario avisó (con capturas) que en AUD aparecían dos puntos en julio
con el mismo valor (53.0) en fechas distintas — 1° de julio y 24 de
julio. Investigado a fondo, "revisa todos" — el problema era sistémico,
no solo de AUD.

**Causa raíz**: `import_excel_2026-07-31.sql` (sesión 31-jul-2026) ya
había cargado overrides para varias de estas mismas series, pero con la
FECHA DE PUBLICACIÓN real del dato (ej. `2026-07-24` para el flash de
AUD, `2026-06-30` para JPY) en vez de la fecha de PERÍODO "1° del mes"
que usa el resto del dashboard (`ism_manuf`, `eur_pmi_manuf_flash`, y el
backfill de esta sesión). Como `mergeSeries` combina base +
overrides por fecha exacta, dos fechas distintas para el mismo mes
generan dos puntos visibles en el gráfico en vez de reemplazarse.

**Verificación mes por mes contra la fuente**, comparando el override
viejo (Excel) contra el valor cargado esta sesión (backfill):

| Serie | Override viejo (fecha real) | Backfill (1° del mes) | Diagnóstico |
|---|---|---|---|
| `aud_pmi_manuf` | 2026-07-24 = 51.7 | 2026-07-01 = 51.7 | Duplicado puro (mismo valor) |
| `aud_pmi_serv` | 2026-07-24 = 53.0 | 2026-07-01 = 53.0 | Duplicado puro |
| `jpy_pmi_manuf` | 2026-06-30 = 54.8 | 2026-06-01 = 54.8 | Duplicado puro |
| `jpy_pmi_serv` | 2026-07-03 = 52.2 | 2026-06-01 = 52.2 | Es el dato de JUNIO (fecha de publicación 3-jul) mal fechado como si fuera julio — peor que duplicado, "roba" el casillero de julio |
| `chf_pmi_manuf` | 2026-07-01 = 54.3 | 2026-06-01 = 54.3 | Igual que arriba: es junio, pero la fecha 2026-07-01 SÍ coincide con la convención real de julio de este dashboard — sin corregir, julio se ve con un dato que en realidad no salió |
| `cad_pmi_manuf` | 2026-06-01 = 52.9 | 2026-06-01 = 53.0, 2026-05-01 = 52.9 | **Crítico**: 52.9 es en realidad MAYO (verificado: S&P Global/TradingEconomics confirman mayo=52.9, junio=53.0), pero el override quedó fechado 2026-06-01 — la MISMA fecha exacta que usa el backfill para junio. Como los overrides pisan a la base en la misma fecha, esta fila estaba OCULTANDO el 53.0 correcto de junio en producción. |
| `cad_pmi_serv` | 2026-05-05 = 49.2 | 2026-04-01 = 49.2, 2026-05-01 = 50.6 | 49.2 es ABRIL (fecha de publicación 5-may), mal fechado como si fuera mayo — queda pegado visualmente al punto real de mayo |
| `sp_pmi_manuf` | 2026-06-23 = 55.7 | 2026-06-01 = 53.9 | Es el FLASH de junio, ya superado por el final. Verificado: "US S&P Global manufacturing PMI final for June 53.9 vs 55.7 prior" (investingLive/TradingView) — la revisión de -1.8pp es real, no error, pero el flash queda obsoleto una vez cargado el final |
| `sp_pmi_serv` | 2026-06-23 = 51.3 | 2026-06-01 = 51.2 | Mismo caso, revisión mínima |

**Bonus, resuelto de paso**: el hueco que había quedado en
`nzd_pmi_manuf` mayo-2026 (dejado vacío la sesión pasada por una
discrepancia sin resolver entre fuentes, 49.9 vs. "51.3" mal citado en
un artículo) se pudo cerrar — BusinessNZ confirma directo: "New Zealand
Manufacturing Surges as Business NZ PMI Leaps to 59.7 in June... up from
49.9 in May" (fx.co). Cargado `nzd_pmi_manuf` 2026-05-01 = 49.9.

**Fix aplicado**: `supabase/migration_2026-08-01_pmi_dedup.sql` — borra
las 10 filas de override viejas/mal fechadas de arriba (correr en
Supabase > SQL Editor). El dato correcto de cada mes ya está en el
código (`historical-series.json`), así que después del DELETE cada mes
vuelve a mostrar un solo punto.

**Sin resolver, NO tocado**: quedan 2 filas sueltas —
`nzd_pmi_manuf` 2026-06-29 = 50.3 y `nzd_pmi_serv` 2026-06-29 = 50.2 —
que no coinciden con ningún valor verificado de mayo, junio ni julio
para esas series (se descartó específicamente que sean el dato real de
junio: PMI confirmado 59.7, PSI confirmado 50.6). Podrían ser un error
de tipeo del Excel original o algún dato que no se identificó — hay que
preguntarle al usuario qué representaban antes de decidir si se borran o
se corrigen.

**Lección para las próximas cargas**: cuando se backfillea una serie que
YA tiene datos en `indicator_overrides` (Excel, o cargas manuales
previas), hay que revisar la tabla real de Supabase ANTES de escribir en
`historical-series.json` — no alcanza con mirar el archivo base, porque
los overrides pueden estar en fechas distintas para el mismo mes y
generar duplicados silenciosos que no se detectan con un diff del JSON.

### Bug real y más grave encontrado de paso: ISM (USD) corrido un mes en la base

El usuario probó en incógnito después del primer fix y reportó, por
divisa: USD no actualizó, EUR no, GBP no, AUD sí quedó bien, NZD seguía
con dos datos de junio, JPY sí actualizó, CHF/CAD muestran junio como
último dato. Para diagnosticar sin adivinar, se extrajo la URL y la
`anon key` de Supabase directo del bundle JS publicado (`grep` sobre
`https://hikman-prueba.vercel.app/assets/*.js` — la anon key es pública
a propósito, la usa el propio navegador del usuario) y se consultó
`indicator_overrides` en vivo por REST en vez de asumir el estado a
partir de los .sql de importación viejos.

**Lo de EUR/GBP y NZD era exactamente el mismo bug de fecha de
publicación vs. 1° del mes** (ver sección de arriba) pero en filas que
no estaban en `import_excel_2026-07-31.sql` — alguien las había cargado
después, vía Actualizar Datos, con la fecha real del flash
(`2026-07-24`). Confirmado y agregado a
`supabase/migration_2026-08-01_pmi_dedup_2.sql`.

**Lo de USD era otra cosa, más seria**: `ism_manuf`/`ism_serv` en
`historical-series.json` tenían **todo el rango nov-2025 a jun-2026
corrido un mes** — el valor de cada mes real estaba guardado bajo la
fecha del mes SIGUIENTE. Detectado comparando, mes por mes, contra los
comunicados oficiales de ISM en prnewswire.com (título siempre
"Manufacturing/Services PMI at X%; <mes> ISM ... Report" — fuente
inequívoca). El desfasaje calzó EXACTO en 6-7 meses seguidos (ver la
tabla abajo), lo que descarta coincidencia — es un bug real de cuando se
sembró originalmente este archivo (probablemente un scraper viejo que
usaba fecha de publicación en vez de fecha de período, de antes de
saberse que ISM no tiene API pública ni está en FRED).

Además, **el punto más reciente de cada serie tenía manuf/serv
cruzados entre sí**: lo que estaba guardado como "julio" de
`ism_manuf` (54.0) era en realidad el dato real de SERVICIOS de junio, y
lo guardado como "julio" de `ism_serv` (53.3) era el dato real de
MANUFACTURA de junio. Julio 2026 de ISM (ambos reportes) todavía no
se había publicado a la fecha de esta corrección (sale el 3-ago-2026
Manufactura, ~5/6-ago Servicios) — se eliminó esa entrada de julio en
vez de dejar un valor inventado.

| Mes | `ism_manuf` real (verificado ISM) | `ism_serv` real (verificado ISM) |
|---|---|---|
| Nov-2025 | 48.2 | 52.6 |
| Dic-2025 | 47.9 | 54.4 |
| Ene-2026 | 52.6 | 53.8 |
| Feb-2026 | 52.4 | 56.1 |
| Mar-2026 | 52.7 | 54.0 |
| Abr-2026 | 52.7 | 53.6 |
| May-2026 | 54.0 | 54.5 |
| Jun-2026 | 53.3 | 54.0 |
| Jul-2026 | **no publicado todavía** | **no publicado todavía** |

**Fix aplicado**: se reemplazaron esos 8-9 puntos por serie en
`historical-series.json` con los valores de la tabla de arriba, en la
fecha real de cada uno (commit de esta sesión). Los 2 overrides sueltos
en Supabase que tapaban/duplicaban esto (`ism_manuf` 2026-07-01=53.3,
`ism_serv` 2026-07-06=54 — la misma carga manual de junio, mal fechada
con la fecha de publicación) están en
`supabase/migration_2026-08-01_pmi_dedup_2.sql`.

**El mismo bug también estaba en los subcomponentes de ISM** (Nuevas
Órdenes/Producción/Empleo/Precios) — cargados como overrides en
`indicator_overrides` con la fecha de publicación de junio (2026-07-01
Manufactura, 2026-07-06 Servicios) en vez de 2026-06-01. Verificado
contra el comunicado de junio: los valores son correctos (56/52.2/49.7/73
para Manufactura, 55.1/51.2/67.7 para Servicios), solo mal fechados. Como
acá no hay ningún dato base debajo (para estos ids `historical-series.json`
está vacío, todo es override manual), el fix es un `UPDATE` de la fecha en
vez de un `DELETE` — `supabase/migration_2026-08-01_ism_subcomponents.sql`.
De paso quedó registrado que `ism_manuf_supplier_deliveries`,
`ism_manuf_inventories` e `ism_serv_business_activity` nunca se cargaron
(ni junio ni ningún mes) — el usuario pidió completarlos con histórico.

**Cargados nov-2025 a jun-2026** (8 meses cada uno), verificado mes a mes
contra los comunicados de ISM en prnewswire.com:

| Mes | Supplier Deliveries (Manuf.) | Inventories (Manuf.) | Business Activity (Serv.) |
|---|---|---|---|
| Nov-2025 | 49.3 | 48.9 | 54.5 |
| Dic-2025 | 50.8 | 45.2 | 56.0 |
| Ene-2026 | 54.4 | 47.6 | 57.4 |
| Feb-2026 | 55.1 | 48.8 | 59.9 |
| Mar-2026 | 58.9 | 47.1 | 53.9 |
| Abr-2026 | 60.6 | 49.0 | 55.9 |
| May-2026 | 60.6 | 49.9 | 57.7 |
| Jun-2026 | 57.4 | 51.4 | 55.4 |

Cargado directo por REST a `indicator_overrides` con la `anon key`
pública del bundle (la política RLS del proyecto es "public read/write
for all", la misma que usa la app desde el navegador — no hizo falta que
el usuario corra SQL a mano esta vez). Nota menor: Abril y Mayo de
Supplier Deliveries dieron el mismo valor exacto (60.6) en dos fuentes
independientes — no es error de carga, dos búsquedas distintas
coincidieron en el mismo número para los dos meses (diffusion index sin
cambio mes a mes, ocurre). Dos discrepancias chicas encontradas y
resueltas a favor del comunicado del propio mes (no el que lo cita como
comparación en el mes siguiente, que a veces trae una revisión menor):
Inventories dic-2025 (45.2 directo del reporte de diciembre vs. 45.7
citado en el de enero) y Business Activity dic-2025 (56.0 directo del
reporte de diciembre vs. 55.2 citado en el de enero).

**IMPORTANTE — sin auditar todavía**: el desfasaje se verificó y
confirmó SOLO para nov-2025 a jun-2026 (8 meses). No se revisó el resto
del histórico de `ism_manuf`/`ism_serv`, que arranca en 2015 — dado que
el patrón calzó exacto en los 8 meses probados, es razonable sospechar
que el mismo corrimiento existe más atrás en el tiempo, pero confirmarlo
mes por mes contra ISM para 10+ años de historia es un trabajo aparte,
grande, que no se hizo en esta sesión. Si el usuario nota algo raro en
ISM antes de nov-2025 (por ejemplo comparando el gráfico contra
tradingeconomics.com/united-states/ism-manufacturing-pmi), es candidato
a ser el mismo bug.

## Sesión 2-ago-2026: cinta interactiva, calendario de publicación, bugs mobile

Tres pedidos en un mismo mensaje.

### 1. MarqueeTicker interactivo con el mouse

Pedido explícito: "la cinta corrediza en el panel de control LA DE
TITULARES FIJADOS quiero que se interactiva con el mouse". Antes era una
animación CSS pura (`@keyframes marquee-scroll` + `transform:
translateX`) — imposible de leer o clickear un titular mientras se
movía sola.

Reescrito `MarqueeTicker.tsx` de punta a punta: el auto-scroll ahora es
un loop de `requestAnimationFrame` que mueve `scrollLeft` del
contenedor (no una animación CSS de `transform`), lo que permite que
conviva con interacción real:
- **Se pausa sola con el mouse encima** (`onMouseEnter`/`onMouseLeave`
  → estado `isHovered`, el loop de rAF no avanza `scrollLeft` mientras
  esté en `true`).
- **Se puede arrastrar con click + mover** (`onPointerDown/Move/Up`,
  con `setPointerCapture` para que el drag no se corte si el mouse sale
  del elemento) — el módulo manual sobre `scrollWidth/2` deja arrastrar
  hacia atrás del origen sin trabarse en `scrollLeft=0`.
- Después de soltar un drag, 1.5s de respiro antes de retomar el
  auto-scroll (si no, pelea contra el gesto que recién soltaste).
- Si fue un drag real (`moved=true`), se cancela el click del link de
  abajo al soltar — si no, arrastrar sobre un titular lo abriría en una
  pestaña nueva sin querer.
- Contenido duplicado ×2 igual que antes (loop sin salto), pero ahora
  el "reinicio" es `scrollLeft -= halfWidth` en vez de `translateX(0)`.
- CSS: `.marquee-track`/`@keyframes marquee-scroll` (ya no se usan) se
  reemplazaron por `.marquee-scroll-container` — solo oculta la
  scrollbar nativa (`scrollbar-width: none` + `::-webkit-scrollbar {
  display: none }`), el resto lo maneja JS.
- Respeta `prefers-reduced-motion` (si está activo, ni arranca el rAF —
  el usuario todavía puede arrastrar a mano, pero no hay auto-scroll).

### 2. Pestaña "Cuándo se publican" (calendario de referencia)

Pedido explícito con dos ejemplos concretos: "CPI se publica la tercera
semana del mes" y "PMIs preliminar 3era semana del mes y una o dos
semanas más el final". Nuevo componente `ReleaseScheduleTab.tsx` —
no navega a ningún lado, al pasar el mouse (o con foco por teclado,
`group-focus-within` para accesibilidad) muestra un panel con el patrón
habitual de publicación por tipo de indicador (Inflación, PMI, Empleo,
Crecimiento, Bancos centrales) — generalizado a partir de todo lo que se
investigó esta sesión sobre ISM/S&P Global/BusinessNZ/procure.ch/NBS.
Aclarado en el propio texto que es "patrón habitual, no fecha exacta"
para no sobre-prometer precisión por país.

**Por qué no quedó dentro de la fila de pestañas de navegación** (el
lugar más obvio, "una pestaña" literal): esa fila (`<nav
className="... overflow-x-auto ...">` en `Layout.tsx`) tiene
`overflow-x: auto` — por la spec de CSS Overflow, fijar overflow-x sin
fijar overflow-y explícito hace que el overflow-y computado TAMBIÉN
pase a ser `auto` (no quedaba `visible`). Un dropdown `position:
absolute` que cuelga hacia abajo de un hijo de ese `<nav>` se hubiera
cortado por ese overflow-y implícito — casi invisible, muy difícil de
debuggear después. Se puso en cambio en la fila de arriba del header
(al lado del badge de sync y el botón de tema), que no tiene overflow
restringido. Oculto en mobile (`hidden sm:block`) porque hover no
existe igual en touch — mostrarlo ahí solo iba a generar un botón sin
uso claro y sumar más presión al header ya apretado en mobile.

### 3. Bugs de mobile

Pedido: "revisa la version mobil, tiene un par de bugs en las letras,
has que se vea bien". Sin acceso a un navegador real del usuario —
Playwright en este sandbox no tiene salida directa a internet (ver
nota de `pw_check.mjs` más abajo), así que se probó levantando `npm run
dev` local y apuntando Playwright a `localhost` (eso sí funciona, no
sale del sandbox). Capturas en viewport iPhone 13 (390px) + una en
1400px para el hover de la pestaña nueva.

**Bug 1 — header: "USD" tapado detrás de las pastillas de divisa.**
La fila del header (`logo + {currency} + subtítulo` a la izquierda,
`pastillas + badge sync + botón tema` a la derecha) es un
`flex justify-between` sin wrap ni manejo de overflow — en 390px las 9
pastillas de divisa por sí solas ya no entran, y sin `overflow-x-auto`
ni `min-w-0` en los contenedores, el texto "USD" del lado izquierdo
quedaba literalmente por detrás de las pastillas en vez de que el
layout se ajustara. Fix: `{currency}` ahora oculto en mobile (`hidden
sm:inline` — igual que ya estaba el subtítulo; total, la pastilla
activa en el selector ya indica cuál es la divisa elegida), pastillas
envueltas en su propio `overflow-x-auto` con `shrink-0
whitespace-nowrap` en cada botón, y `min-w-0` en el contenedor derecho
para que pueda comprimirse en vez de desbordar.

**Bug 2 — tarjetas con subcomponentes: el badge "N subcomponentes" se
corta.** En `ChartCard.tsx`, la fila `título+descripción` /
`badges (frescura + N subcomponentes)` es un `flex items-start
justify-between` sin `flex-wrap` y sin `min-w-0` en el div del título.
Con el ancho angosto de mobile, el div del título no podía encogerse
más allá de su palabra más larga (`min-width: auto` por defecto en
flex), la fila total superaba el ancho disponible, y como el div de
badges tiene `shrink-0` (no se achica), el resultado era que el badge
"N subcomponentes ⤢" se cortaba visualmente contra el borde de la
tarjeta/pantalla — y de paso el título quedaba forzado a una columna
angosta, generando un hueco vertical enorme donde la descripción
envolvía en 6+ líneas cortas. Fix: `flex-wrap` en la fila +
`min-w-0` en el div del título — ahora en mobile los badges caen
prolijo a una segunda línea debajo del título en vez de desbordar.
Aplicado a las dos variantes (con y sin `subcomponentsControl`).

**Descartado como bug real, era comportamiento esperado**: la tabla de
Actualizar Datos "se corta" a la derecha en mobile — tiene
`overflow-x-auto` propio y de hecho SÍ scrollea (confirmado con
`el.scrollWidth > el.clientWidth` vía Playwright), solo que no tiene
ninguna pista visual de que hay más columnas para el costado. Se dejó
así — no es lo que el usuario reportó ("bugs en las letras"), y
agregarle una sombra/degradé de "hay más para el costado" es un pulido
aparte, no un bug.

**Nota técnica para la próxima sesión — Playwright sin salida a
internet en este sandbox**: `chromium.launch()` con la config default
tira `net::ERR_CONNECTION_RESET` contra CUALQUIER sitio externo (se
probó contra `example.com` también, mismo error) — ni pasándole
`proxy: { server: process.env.HTTPS_PROXY }` explícito se pudo hacer
andar. `curl` sí sale bien solo (recoge `HTTPS_PROXY` automático). Para
poder inspeccionar el sitio real con un navegador en esta sesión, hubo
que usar `curl` para bajar el bundle JS servido en producción y
`grep`/leer el contenido a mano (funcionó bien para confirmar si un fix
ya estaba deployado) — Playwright solo sirvió apuntado a `localhost`
(servidor local, no sale del sandbox).

## Sesión 2-ago-2026 (cont. 2): auditoría ISM completa, filas NZD, chequeo PMI julio

Continuación de la misma sesión (arrancó con "sigue con los pendientes
de la sesión anterior"), en la rama asignada del entorno
(`claude/lee-handoff-graphify-vs548t`, no la de producción). Se preguntó
al usuario dos cosas antes de tocar nada (`AskUserQuestion`): qué hacer
con las 2 filas NZD sin identificar, y cómo abordar la auditoría de ISM
(eligió "muestreo primero"). Los tres pendientes quedaron resueltos.

### 1. Filas NZD `nzd_pmi_manuf`/`nzd_pmi_serv` (2026-06-29, 50.3/50.2)

Al consultar `indicator_overrides` en vivo por REST (misma `anon key`
pública del handoff), **estas 2 filas ya no existían en producción** —
`migration_2026-08-01_pmi_dedup_2.sql` (escrita en la sesión anterior)
ya incluía su `delete`, aunque el resumen de cierre de esa sesión no lo
reflejó (quedó redactado como "sin resolver"). El usuario pidió además
investigar qué representaban antes de confirmar que no hacía falta
reponer nada: se buscó el valor 50.3 (manuf)/50.2 (serv) contra el
histórico real de BusinessNZ PMI/PSI — original y revisado — en 2024,
2025 y 2026 (incluyendo los meses con revisión, ej. abril/mayo 2026) y
no apareció ninguna coincidencia. Conclusión: no hay un dato real detrás
de esas dos filas — son casi seguro un artefacto de alguna carga previa
(no se pudo determinar la causa exacta), no un punto legítimo sin
cargar. No se repuso nada, y no hace falta ninguna acción en Supabase
(el delete ya está aplicado).

### 2. PMI final/headline de julio-2026 — todavía no publicado

Se verificó (WebSearch, fuentes primarias: S&P Global, au Jibun Bank,
prensa especializada) el estado de julio-2026 para las 6 economías con
reporte de dos vueltas + las 3 de publicación única que solo llegaban
hasta junio:

- **USD (S&P Global)**: flash de julio ya cargado y verificado exacto
  contra la fuente (`sp_pmi_manuf`=53.8, `sp_pmi_serv`=53.6, coincide
  con "US S&P Global Composite PMI... Services PMI rose to 53.6...
  Manufacturing PMI ticked down to 53.8"). El FINAL (normalmente 1er/3er
  día hábil del mes) todavía no salió al momento de este chequeo.
- **JPY (au Jibun Bank)**: flash ya cargado y verificado exacto
  (`jpy_pmi_manuf`=54.7, `jpy_pmi_serv`=51.9, coincide con "flash Japan
  Manufacturing PMI came in at 54.7... services sector PMI flash
  reading came in at 51.9"). Final pendiente, no publicado todavía.
- **AUD (Judo Bank)**: no re-verificado en detalle esta vuelta (ya
  auditado a fondo en la sesión anterior), mismo estado esperado: flash
  cargado, final pendiente.
- **CAD/NZD/CHF** (publicación única, sin flash): siguen solo hasta
  junio-2026 — correcto, su reporte de julio tampoco salió todavía.

**Por qué nada salió todavía**: 2-ago-2026 es domingo (1-ago cayó
sábado) — estos reportes se publican el 1er día hábil del mes (o el
3° para Servicios/Compuesto en algunos países), o sea recién a partir
del lunes 3-ago-2026 en adelante. No hay nada más para cargar hasta
entonces — **volver a chequear a partir del lunes/martes**.

### 3. Auditoría de ISM histórico — bug confirmado en TODA la serie desde 2015, corregido de punta a punta

El handoff anterior dejaba como sospecha sin confirmar que el bug de
corrimiento de 1 mes de `ism_manuf`/`ism_serv` (ya corregido para
nov-2025 a jun-2026) pudiera extenderse más atrás en el tiempo. Se
verificó una muestra de puntos de control bien separados en el tiempo
contra los comunicados oficiales de ISM (prnewswire.com):

- **2015 (inicio de la serie)**: el valor guardado bajo `2015-01-01`
  (55.5 manuf / 56.2 serv) resultó ser exactamente el dato real de
  **diciembre-2014** (confirmado: "PMI® at 55.5%; December Manufacturing
  ISM® Report" y "NMI® at 56.2%... December"), y `2015-02-01` (53.5
  manuf) el real de **enero-2015** ("PMI® at 53.5%; January...") — mismo
  patrón de corrimiento +1 mes.
- **Abril/mayo 2020 (piso de COVID, fácil de verificar por lo extremo
  del valor)**: el guardado bajo `2020-05-01` (41.5 manuf) resultó ser
  el real de **abril-2020** (confirmado: "PMI® at 41.5%; April 2020..."),
  y `2020-06-01` (43.1) el real de **mayo-2020** ("PMI® at 43.1%; May
  2020..." — "up 1.6 points from the April reading of 41.5"). Mismo
  patrón, exacto, 5 años después del primer punto de control.
- **Límite sep/oct-2025 (el borde justo antes de la corrección de la
  sesión anterior)**: el guardado bajo `2025-10-01` (49.1 manuf / 50.0
  serv) resultó ser el real de **septiembre-2025** (confirmado:
  "Manufacturing PMI® at 49.1%; September 2025..." / "Services PMI® at
  50%; September 2025...") — el corrimiento llegaba intacto hasta el
  último mes antes de donde empezó el fix de la sesión anterior.

Con dos puntos de control en extremos opuestos de 11 años (2015 y 2020)
más el borde 2025 coincidiendo exacto los tres, se confirmó que **el
bug afecta el 100% de la serie histórica pre-existente** (2015-01 a
2025-10 tal como estaba guardada), no un tramo acotado. Se le preguntó
al usuario si corregir todo de una — dijo que sí.

**Corrección aplicada** (`historical-series.json`, script Python
puntual, no quedó en el repo): para `ism_manuf` e `ism_serv` por
separado,
1. Se separaron las 130 entradas `2015-01` a `2025-10` (rango con el
   bug) de las 8 entradas `2025-11` a `2026-06` (ya corregidas en la
   sesión anterior, sin tocar).
2. Cada entrada del rango con bug se re-fechó un mes hacia atrás (el
   valor no cambia, solo la fecha) — ej. lo guardado en `2025-10-01`
   pasa a `2025-09-01`, `2015-01-01` pasa a `2014-12-01`.
3. Esto deja un hueco en `2025-10-01` (la fecha que antes tenía el dato
   de septiembre corrido) — se llenó con el dato REAL de **octubre-2025**
   buscado y verificado fresco contra prnewswire.com: Manufactura 48.7%
   ("Manufacturing PMI® at 48.7%; October 2025..."), Servicios 52.4%
   ("Services PMI® at 52.4%; October 2025...").
4. El punto más antiguo, que ahora queda fechado `2014-12-01` (55.5
   manuf / 56.2 serv), se mantuvo — es un dato real y verificado, no
   tiene sentido descartarlo solo porque el rango visible empezaba en
   2015.

Verificado antes de escribir: las 139 fechas de cada serie quedan
consecutivas sin huecos (`2014-12` a `2026-06`), y se confirmó a mano
que abr/may-2020 y sep/oct-2025 quedaron en el valor correcto post-fix.
`npm run build` (typecheck + vite build) en verde después del cambio.

**No se tocó Supabase** — `ism_manuf`/`ism_serv` no tienen ninguna fila
en `indicator_overrides` (se confirmó por REST antes de arrancar), todo
el histórico vive en `historical-series.json`, que es lo que se
corrigió.

**Actualización — ya en producción**: el usuario pidió explícitamente
"PUSHEALO A PRODUCCION" el mismo día. Se hizo fast-forward limpio de
`claude/lee-handoff-graphify-vs548t` (commit `36611b0`) a
`claude/macro-usd-web-dashboard-xm5ypk` — ambas ramas quedaron
sincronizadas al mismo commit, Vercel respondió 200 tras el push. No
queda ningún paso pendiente de este fix.

**Nota para la próxima sesión**: este fix cambia el gráfico histórico
completo de ISM Manufactura/Servicios (11+ años) — si el usuario nota
algo que antes "se veía distinto" en el histórico viejo de estas dos
series, es el efecto esperado de esta corrección, no un bug nuevo.

**De paso, el usuario preguntó cómo sigue la carga manual de ISM**: sin
cambios — ISM nunca tuvo API, se sigue cargando por "Actualizar Datos"
como siempre, y eso escribe únicamente en Supabase
(`indicator_overrides`, upsert por `indicator_id`+`date`) — el archivo
`historical-series.json` que se corrigió acá NO se vuelve a tocar por
una carga mensual normal, solo se editó esta vez porque era un error
del dato histórico ya sembrado en el código. Recordatorio ya
documentado en el proyecto pero vale repetirlo: cargar siempre con la
fecha de PERÍODO (`2026-07-01`), no la fecha de publicación.

**Además, se corrió `/graphify update .` sobre el repo** para que el
grafo de conocimiento (`graphify-out/`) refleje los cambios de esta
sesión (HANDOFF.md actualizado, componentes `.tsx` nuevos de la cinta/
calendario/mobile, el fix de `historical-series.json`) — 689 nodos/1254
edges/36 comunidades (antes 619/1144/36). Las 36 fotos de banqueros/
logos se dejaron sin re-procesar a pedido explícito del usuario (no
cambiaron visualmente y ya estaban en el grafo del build original) —
quedan marcadas como pendientes en el manifest de graphify para un
próximo `--update` si en algún momento se quiere completar. Pusheado a
la rama de esta sesión junto con un ajuste de `.gitignore` para que los
archivos de trabajo temporales de graphify (`.graphify_*`) no disparen
el stop hook de "hay cambios sin commitear" mientras el pipeline está
corriendo.
