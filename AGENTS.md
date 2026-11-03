# AGENTS.md — HIKMAN ENDÓGENO (Hikman Capital)

Guía general del proyecto para cualquier agente que trabaje en este repo
(Codex, Claude Code u otro). Está pensada para leerse ENTERA antes de tocar
nada. Describe qué es la app, cómo funciona la web, cómo está armado el
código, las reglas que no se pueden romper y cómo trabajar con el usuario.

- Esta guía = **el estado actual y las reglas**. Se mantiene al día.
- `HANDOFF.md` = **la bitácora histórica** sesión por sesión (≈5000 líneas,
  la más reciente arriba). Tiene el detalle fino de cada divisa, cada
  fuente de datos y cada bug ya resuelto. Consultarla por sección cuando
  se toque ese tema (índice al final de esta guía).
- Última revisión completa: **3-nov-2026**, sobre el commit `96c4483`.

---

## 0. Reglas críticas (leer sí o sí)

1. **NUNCA tocar la tabla `journal_entries` de Supabase** (ni `drop`, ni
   `alter`, ni leer/escribir desde la app). Es de OTRA app del usuario
   (TraderMind / "Bitácora Personal") que comparte el mismo proyecto de
   Supabase. El Cuaderno de Economía y el Informe Diario usan
   `hikman_journal_entries`. Un choque de nombres ya hizo perder datos.
   Antes de crear cualquier tabla nueva, usar un nombre que no pueda
   chocar (prefijo `hikman_` recomendado).
2. **Nunca inventar ni "redondear" datos económicos.** Cada número tiene
   que salir de una fuente real y verificarse contra lo que el usuario ve
   en su calendario económico (Investing / Trading Economics / Forex
   Factory), no solo contra "la API respondió 200". Si no hay fuente
   automática confiable, el indicador queda de carga manual.
3. **`api/*.ts` no puede importar nada de `src/`.** Vercel empaqueta cada
   función por separado y falla en runtime (`ERR_MODULE_NOT_FOUND`). Los
   mapeos de series están DUPLICADOS: `src/data/fredMappings.ts` (solo
   para la insignia en la UI) y cada `api/<divisa>-sync.ts` (el que
   sincroniza de verdad). Si se cambia uno, cambiar los dos.
4. **Tope de 12 Serverless Functions** (Vercel Hobby). Hoy hay 11 en
   `api/`. No crear archivos nuevos en `api/`: sumar la lógica a una
   función existente con `?action=` (patrón de
   `api/trading-alert-email.ts`) o dentro del sync que corresponda.
5. **Cambios de base de datos = un script `.sql` idempotente** en
   `supabase/` (`create table if not exists`, `add column if not exists`,
   `drop policy if exists` …) + reflejarlo en `supabase/schema.sql`. El
   agente NO tiene acceso a Supabase: el usuario lo corre a mano en el SQL
   Editor. Darle el link al archivo en GitHub y avisar que hay que
   correrlo. El código tiene que seguir funcionando si todavía no lo
   corrió (ver cómo `JournalContext.tsx` solo manda `week_board` cuando
   existe).
6. **No romper el guardado en silencio.** Siempre revisar el `{ error }`
   que devuelve supabase-js (no tira excepción) y mostrarlo en la UI. Un
   guardado que fallaba sin avisar es la causa de los datos perdidos de
   octubre-2026.
7. **No publicar a producción por cuenta propia.** Desarrollar en una rama
   propia, pushear, y que el usuario promueva la vista previa en Vercel
   (ver §8). Nunca force-push ni reescribir historia de ramas ajenas.
8. **No subir secretos nuevos al repo.** Las claves privadas van en las
   variables de entorno de Vercel (ver §6). (La anon key de Supabase es
   pública por diseño; la de FRED ya quedó escrita en `HANDOFF.md`.)
9. Orden de tarjetas: cada indicador de corto plazo (m/m o t/t) va
   seguido INMEDIATAMENTE de su a/a. El orden es el del array en
   `src/data/indicators*.ts`.
10. Responder y escribir en **español** (comentarios de código y mensajes
    de commit también, como el resto del repo).

---

## 1. Qué es esto

Dashboard web personal de un trader de divisas (Hikman Capital). Reemplazó
un sistema de Excels (uno por divisa + "HIKMAN CAPITAL SISTEMA 2.0.xlsx").
Tiene dos mitades:

- **Análisis macro fundamental** de 9 divisas — USD, EUR, GBP, CAD, AUD,
  NZD, JPY, CHF, CNY: indicadores con gráfico histórico, insignia de
  frescura (al día / revisar / desactualizado), insignia preliminar/final,
  score compuesto por divisa y perfiles de banqueros centrales.
- **Herramientas de trabajo diario**: Panel de Control (sesgo semanal por
  divisa, agenda, informe del mentor), Bitácora de Trading (cuentas,
  trades, ideas) y Cuaderno de Economía (hoja semanal de titulares).

La idea central: **que nunca pase inadvertido que un dato está viejo o mal
calculado.** De ahí las insignias de frescura y la obsesión con verificar
cada serie contra la fuente oficial.

- Producción: https://hikman-prueba.vercel.app (pestaña "HIKMAN ENDÓGENO")
- Repo: `samerbilalsangronis-netizen/hikman-prueba`
- Mentor del usuario: **Nufal Bakali** (aparece en "Informe Diario Nufal"
  y el Cuaderno está modelado sobre su cuaderno).

---

## 2. Cómo funciona la web (mapa para el usuario)

Navegación: **barra lateral fija** (`src/components/Sidebar.tsx`) con 5
entradas. El router es `HashRouter`: las URLs son `/#/ruta`.

### 2.1 📊 Panel de Control — `/#/panel-control` (`src/pages/PanelControl.tsx`)
- **Cinta de titulares** (`MarqueeTicker.tsx`): "HIKMAN CAPITAL" + los
  titulares fijados (`pinned`) desde Titulares.
- **Cuadro de Sesgo Semanal**: una tarjeta por divisa
  (`CurrencyBiasCompactCard.tsx`) con el gráfico del **histórico del
  sesgo** (escala Dovish −2 … Hawkish +2, color del sesgo actual), badge
  del nivel, progreso "Día X de 7" y botón **⟳ Actualizar** (archiva la
  semana en el historial y arranca una nueva). Click → modal con el editor
  completo (`CurrencyBiasCard.tsx`): nivel (Hawkish / Neutro Alcista /
  Neutro / Neutro Bajista / Dovish), resumen enriquecido, motivos con
  color, tasa y próxima reunión, historial con buscador por fecha.
- **Agenda Semanal** (`panel/WeeklyAgenda.tsx`): eventos de la semana,
  con recordatorio por correo (cron, ver §4.4).
- **Informe Diario Nufal (IA)** (`panel/MentorDailyReport.tsx`): una nota
  por día; el agente IA la resume en catalizadores / niveles clave /
  escenario. Los viernes un cron genera la síntesis semanal. Bóveda de
  semanas pasadas.
- **Informes Económicos** (`DocumentUploadList.tsx`): documentos/notas.

### 2.2 🧾 Bitácora de Trading — `/#/bitacora-trading`
Sub-pestañas: Dashboard General (incluye **Seguimiento de Idea
Operativa**, `trading/IdeaTracker.tsx`), Gestión de Cuentas (cuentas +
reglas de consistencia), Registrar Trade, Historial & Métricas. Al
registrar un trade puede mandar un correo de alerta. Migrado del Excel.

### 2.3 📓 Cuaderno de Economía — `/#/cuaderno-economia`
(`src/components/panel/EconomyNotebook.tsx`, página propia desde el
25-oct-2026, ya NO está en el Panel de Control.)
- **Una hoja por semana** ("Semana 19/10" + leyenda de impacto −/+), como
  el cuaderno de Nufal. Navegación ◀ ▶ y Bóveda (índice de semanas).
- **Titulares** escritos en el color de su impacto (escala de 6:
  rojo, naranja, naranja tenue, gris, verde claro, verde fuerte —
  `lib/journalColors.ts`). Se guardan SIEMPRE con la fecha de hoy (no hay
  selector de día); la marca del día ("MIÉRCOLES 21 OCT") aparece solo
  arriba del primer titular de ese día. En semanas pasadas no se escribe.
- Click en un titular → **ventana de contexto**: título e impacto
  editables, editor enriquecido (resaltar con color, negrita/cursiva/
  subrayado, mayús/minús/tipo título, stickers Hawkish/Dovish/…) y un
  lienzo con **imágenes movibles y redimensionables**.
- **Imágenes libres sobre la hoja semanal** (además de las de cada
  titular): botón, arrastrar o Ctrl+V. Lógica compartida en
  `panel/MovableImageLayer.tsx`.
- Columna derecha **Pre semana / Semana actual**
  (`panel/WeekBiasSidebar.tsx`): divisas ordenadas por sesgo, calculado
  del Cuadro de Sesgo Semanal (no se carga a mano).

### 2.4 🏛️ Análisis Macro Fundamental — `/#/` y sub-rutas
Selector de **divisa** en el header (`CurrencyContext`); las mismas
pestañas cambian de contenido según la divisa. La sub-navegación
(`navFor` en `Layout.tsx`) **oculta sola** las secciones sin indicadores
para esa divisa.

| Ruta | Página | Qué muestra |
|---|---|---|
| `/` | `Dashboard.tsx` | Resumen: score compuesto (valoración −2..+2 por fila, `ScorePanel.tsx`) + secciones |
| `/titulares` | `Titulares.tsx` | Noticias por divisa (Finnhub + carga manual), traducidas al español, con impacto, fijar a la cinta, asignar a un sesgo |
| `/tasas` | `Tasas.tsx` | Tasa del banco central, bonos, balance; USD agrega **FOMC Watch** (probabilidades por reunión) |
| `/inflacion` | `Inflacion.tsx` | CPI, Core, PPI… |
| `/empleo` | `Empleo.tsx` | NFP, desempleo, salarios… |
| `/crecimiento` | `Crecimiento.tsx` | PIB (con desglose por componente), PMI (acordeón de subcomponentes), ventas minoristas… |
| `/confianza` | `Sentimiento.tsx` | Encuestas de confianza |
| `/vivienda` | `Vivienda.tsx` | **Sector Inmobiliario — solo USD** (17 indicadores automáticos) |
| `/alemania`, `/francia` | `CountryPage.tsx` | Desglose de DE/FR (solo EUR) |
| `/banqueros` | `Banqueros.tsx` | Miembros de cada banco central, postura, declaraciones (no hay para CNY) |
| `/actualizar` | `Actualizar.tsx` | **Carga manual** del último dato de cualquier indicador (valor, etapa preliminar/final, fecha de publicación) + previsión; exportar JSON |

Cada tarjeta (`ChartCard.tsx`) muestra el último valor, el gráfico
(Recharts), la insignia de frescura (`lib/freshness.ts`, umbrales por
frecuencia + `lagDays` opcional), y abre un modal con el histórico
completo (`HistoryModal.tsx`) o subcomponentes (`SubcomponentModal.tsx`).
En el header hay además la pestaña **"Cuándo se publican"**
(`ReleaseScheduleTab.tsx`) y el toggle de tema claro/oscuro.

---

## 3. Stack y arquitectura

**React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Recharts 3 + React
Router (HashRouter) + Supabase (Postgres) + Vercel (frontend estático +
Serverless Functions en `api/`) + GitHub Actions (crons).** Lint: oxlint.
No hay suite de tests.

### 3.1 Providers (`src/App.tsx`)
`CurrencyProvider` → `MacroDataProvider` → `TradingJournalProvider` →
`JournalProvider` → `CalendarEventsProvider` → `HashRouter`.

- `data/MacroDataContext.tsx` (el más grande): series de indicadores,
  overrides, previsiones, score, FOMC watch, banqueros, titulares, sesgos,
  informes. Expone `getSeries(id)`, `syncMode` (`'cloud'` | local), etc.
- `data/TradingJournalContext.tsx`: cuentas, reglas, trades, ideas.
- `data/JournalContext.tsx`: Cuaderno + Informe Diario (tabla
  `hikman_journal_entries`, kinds `'economia'` / `'mentoria'`) y
  síntesis semanales. Calcula los guardados desde un `entriesRef`
  sincrónico y expone `saveError`.
- `data/CalendarEventsContext.tsx`: Agenda Semanal.

**Patrón de persistencia de todos los contextos:** Supabase es la fuente
de verdad si `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` están
configuradas (`lib/supabaseClient.ts`, `supabaseEnabled`); si no, todo se
guarda en `localStorage` ("Guardado local" en el header). En desarrollo
local sin `.env` la app corre en modo local — sirve para probar UI, no la
sincronización.

### 3.2 Cómo llega un dato a una tarjeta
1. **Semilla histórica**: `src/data/historical-series.json` (todas las
   divisas mezcladas en un objeto `{ indicatorId: [[fecha, valor], …] }`).
2. **Overrides**: tabla `indicator_overrides` (`indicator_id`, `date`,
   `value`, `stage`, `published_at`) — la escriben los syncs automáticos y
   la carga manual de Actualizar. Se pagina con `fetchAllRows()` (PostgREST
   corta en 1000 filas sin avisar).
3. `getSeries(id)` mezcla semilla + overrides (el override gana por fecha).
4. Metadatos de cada indicador: `src/data/indicators*.ts`
   (`IndicatorMeta`: `id`, `section`, `currency`, `format`, `frequency`,
   `releaseStage`, `lagDays`, `country`, subcomponentes…). Tipos en
   `src/types.ts` (`Section`, `Format`, `Currency`, …).

### 3.3 Multi-divisa (patrón fijo)
- Un solo `INDICATORS[]` (`data/indicators.ts` concatena todas las
  divisas). Ids con prefijo por divisa (`eur_cpi`, `gbp_cpi`, …; USD sin
  prefijo). **Nunca reutilizar un id de otra divisa.** Las tablas no
  tienen columna `currency`: la separación es por prefijo.
- Secciones (`Section`): `score`, `tasas`, `inflacion`, `empleo`,
  `confianza`, `crecimiento`, `vivienda`. Una divisa no necesita todas
  (CNY solo tiene inflación + crecimiento, sin score ni banqueros, a
  pedido del usuario). `SECTION_LABELS` es por divisa.
- PMI va en `crecimiento`; encuestas de confianza en `confianza`.
- Score: `data/scoreSeed*.ts` (no existe para CNY). El `<select>` de
  `ScorePanel` solo acepta enteros −2..2: reescalar al sembrar.
- Banqueros: `data/centralBankers.ts`, `bankersForCurrency()`. Fotos:
  Wikimedia Commons o autohospedadas en `public/bankers/`.

---

## 4. Backend: funciones, fuentes y crons

### 4.1 Funciones serverless (`api/`, 11 de 12 posibles)
Cada una es autocontenida (ver regla 3) y escribe en Supabase.

| Archivo | Qué hace | Fuente |
|---|---|---|
| `fred-sync.ts` | USD (incluye Sector Inmobiliario; NAHB y Pending Home Sales vía export CSV de mql5) | FRED API (+ mql5) |
| `eur-sync.ts` | EUR (+ DE/FR, HICP flash/final, PIB por componente) | FRED + Eurostat SDMX |
| `gbp-sync.ts` | GBP (poco: la API de la ONS está congelada) | BoE IADB + FRED |
| `cad-sync.ts` | CAD | StatCan WDS + Bank of Canada Valet |
| `aud-sync.ts` | AUD | ABS Data API (SDMX) + CSV del RBA |
| `nzd-sync.ts` | NZD (la menos automatizada) | CSV de Stats NZ |
| `jpy-sync.ts` | JPY | e-Stat + CSV del BOJ + Aduanas |
| `chf-sync.ts` | CHF | SNB Data Portal + SECO + KOF |
| `cny-sync.ts` | CNY (100% automático, pero el agregador se atrasa) | chinadata.live (no oficial) |
| `headlines-sync.ts` | Titulares + traducción (`?backfill=1`). Ya NO trae el calendario de Forex Factory (se sacó a pedido del usuario: los datos programados van en Actualizar, no en Titulares) | Finnhub + MyMemory (traducción) |
| `trading-alert-email.ts` | Sin `action`: correo de la Bitácora de Trading. `?action=mentor-analyze` / `mentor-synthesize`: agente IA del Informe Diario. `?action=calendar-reminder`: recordatorios de la Agenda | Gmail SMTP (nodemailer) + Claude o Gemini |

Las funciones solo corren en Vercel (o `vercel dev`); `npm run dev` no
sirve `/api`. Probar en producción: `curl -X POST
https://hikman-prueba.vercel.app/api/fred-sync`.

### 4.2 Crons (`.github/workflows/`, no Vercel Cron: Hobby solo permite 1/día)
- `sync-currencies.yml` — las 9 divisas, `7,37 * * * *` (cada 30 min),
  un paso por divisa con `--max-time 90`.
- `sync-titulares.yml` — titulares + traducción cada 10 min.
- `sync-calendar-reminders.yml` — recordatorios de agenda cada 15 min.
- `sync-mentor-weekly.yml` — síntesis semanal, viernes 22:00 UTC.

### 4.3 Fuentes de datos: lo esencial
Detalle completo (endpoints, códigos de serie, convenciones SA/NSA,
qué definición de "core" usa cada país) en `HANDOFF.md` → "Decisiones
técnicas importantes", "Lecciones NZD/JPY/CHF/CNY" y "Cómo verificar
cosas". Lecciones que se repiten:
- Que una API responda con datos NO prueba que esté viva: mirar la fecha
  del último punto (ONS, Retail Trade de ABS, Valet del BoC se quedaron
  atrás sin error).
- Muchos países publican dos series válidas del "mismo" dato (SA/NSA,
  core con distinta definición, CPI trimestral y mensual en paralelo):
  usar la que muestra la referencia del usuario.
- Si el usuario avisa que un dato está viejo, revisar TODOS los
  indicadores automáticos de esa divisa, no solo el que mencionó.

### 4.4 Correo e IA
- Correo: Gmail SMTP con contraseña de aplicación. Sin las variables, los
  endpoints responden 200 sin mandar nada.
- IA del mentor: Claude si hay `ANTHROPIC_API_KEY` (modelo
  `ANTHROPIC_MODEL`), si no Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`).

---

## 5. Supabase

Proyecto "HIKMAN ENDÓGENO" (URL y anon key en las variables de Vercel;
ver también `HANDOFF.md` → "Dónde vive todo"). DDL completo en
`supabase/schema.sql`; los demás `.sql` de `supabase/` son migraciones o
cargas puntuales ya hechas (o pendientes, ver §10). RLS en todas las
tablas: `using (true) with check (true)` (app personal, sin login).

| Tabla | Para qué |
|---|---|
| `indicator_overrides` | Valores de indicadores (sync + carga manual). PK (`indicator_id`, `date`) |
| `indicator_forecasts` | Previsión manual por indicador |
| `score_overrides` | Valoración −2..2 de cada fila del score |
| `fomc_watch` | Probabilidades por reunión FOMC (USD) |
| `banker_statements`, `central_bank_notes` | Banqueros: declaraciones/postura y notas por banco |
| `headlines` | Titulares (impacto, tags, `pinned`, `bias_currency`, `title_es`) |
| `currency_bias`, `currency_bias_history`, `currency_bias_reasons` | Sesgo semanal por divisa, semanas archivadas y motivos |
| `reports`, `mentor_notes` | Informes económicos / notas del mentor (archivos en el bucket de Storage `documents`) |
| `trading_accounts`, `trading_account_rules`, `trades`, `trade_ideas` | Bitácora de Trading |
| `hikman_journal_entries` | Cuaderno (`kind='economia'`: `headlines` jsonb + `week_board` jsonb en la fila del lunes) e Informe Diario (`kind='mentoria'`: `text`, `ai_analysis`). Único por (`kind`, `entry_date`) |
| `mentor_weekly_syntheses` | Síntesis semanal del Informe Diario |
| `calendar_events` | Agenda Semanal |
| ~~`journal_entries`~~ | **NO ES NUESTRA — TraderMind. No tocar.** |

Imágenes del Cuaderno/Informe: bucket `documents`, carpeta `journal/`.

---

## 6. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Usada por |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Frontend y todas las funciones |
| `FRED_API_KEY` | `fred-sync`, `eur-sync`, `gbp-sync` |
| `FINNHUB_API_KEY` | `headlines-sync` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Correos |
| `TRADING_ALERT_EMAIL`, `CALENDAR_REMINDER_EMAIL` | Destinatarios (separados por coma) |
| `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`) o `GEMINI_API_KEY` (+ `GEMINI_MODEL`) | Agente IA del Informe Diario |

Plantilla local: `.env.example` (copiar a `.env.local`).

---

## 7. Recetas para cambios comunes

- **Agregar un indicador**: meta en `src/data/indicators<Divisa>.ts`
  (al lado de su par m/m ↔ a/a) → si es automático, mapeo en el
  `api/<divisa>-sync.ts` Y en `src/data/fredMappings.ts` → semilla
  histórica en `historical-series.json` calculada con la MISMA
  transformación que el sync → verificar el último valor contra la
  referencia del usuario.
- **Agregar una sección**: valor nuevo en `Section` (`types.ts`) +
  `SECTION_LABELS` + página en `src/pages/` + `<Route>` en `App.tsx` +
  entrada en `navFor` (`Layout.tsx`) + `MACRO_PATHS` (`Sidebar.tsx`).
  Patrón: `Vivienda.tsx`.
- **Agregar una página de la barra lateral**: `ITEMS` en `Sidebar.tsx`,
  `<Route>` en `App.tsx` y el título del header en `Layout.tsx`. Patrón:
  `CuadernoEconomia.tsx`.
- **Cambio de esquema**: ver regla 5.
- **Estilo visual**: colores por tokens CSS en `src/index.css` (`:root` =
  tema claro, `[data-theme='dark']` y `prefers-color-scheme` = oscuro).
  Usar `var(--surface-1)`, `var(--text-primary)`, `var(--border)`, etc.
  Tocar el tema claro sin romper el oscuro. Modales: contenedor `fixed
  inset-0 flex overflow-y-auto` + hijo `m-auto` (NO `items-center`, rompe
  el scroll en contenido largo).
- **Paletas que ya existen**: sesgo de 5 niveles (`lib/bias.ts`:
  `BIAS_LEVELS`, `BIAS_COLORS`, `BIAS_SCORE`), impacto de 6 colores del
  Cuaderno (`lib/journalColors.ts`), impacto de titulares alto/medio/bajo
  (`lib/impact.ts`).

---

## 8. Verificar, ramas y deploy

### 8.1 Antes de pushear
```bash
npm ci                 # si no hay node_modules
npx tsc -b             # typecheck (lo mismo que corre el build)
npm run lint           # oxlint (hay warnings viejos "only-export-components": se ignoran)
npm run build          # build de producción
# Typecheck de api/ (Vercel las compila aparte): ver el tsconfig temporal
# en HANDOFF.md → "Cómo verificar cosas".
```
Para UI: `npx vite --port 5199` y navegar a
`http://localhost:5199/#/<ruta>` (Playwright/Chromium sirve; sin `.env`
corre en modo local, se pueden sembrar datos en `localStorage`, claves
`journal:entries:v1`, `macro-dashboard:bias:v1`, …). Probar tema claro y
oscuro, y ancho de celular (~390px).

### 8.2 Ramas y producción (estado real, nov-2026)
- Cada sesión de agente trabaja en **su propia rama** (Claude usa
  `claude/<nombre>`; Codex debería usar `codex/<nombre>`). Antes de
  empezar: `git fetch origin` y partir de lo último.
- Vercel crea una **vista previa** por cada push. **Producción se
  actualiza a mano**: el usuario entra a Vercel → Deployments → ⋯ de la
  vista previa → **Promote to Production** (NO "Redeploy", que vuelve a
  publicar lo mismo). Confirmar qué está en vivo bajando el bundle de
  `https://hikman-prueba.vercel.app` y buscando un texto del cambio.
- **Rama principal: `claude/macro-usd-web-dashboard-xm5ypk`** (la rama
  por defecto del repo, la que abre Codex). Desde el 3-nov-2026 tiene
  TODO lo último (sincronizada con `claude/pensive-einstein-miiefg`,
  `79423d7`). Las ramas de trabajo nuevas salen de acá, y lo terminado
  se integra acá con merge (sin reescribir historia). En producción el
  25-oct estaba `75a83b1`; los cambios del Cuaderno de esa fecha se
  publican cuando el usuario promueve la vista previa (confirmar).
- Hay muchas ramas `claude/*` viejas de sesiones anteriores: no asumir
  nada sin `git log`.

### 8.3 Coordinación entre agentes (Codex + Claude en el mismo repo)
- Siempre `git fetch` + revisar `git log --all --oneline -15` al empezar:
  otro agente pudo haber cambiado cosas.
- Al terminar una tarea: commit descriptivo en español, push a la rama
  propia, y **actualizar esta guía si cambió algo estructural** (rutas,
  tablas, funciones, reglas) + agregar una entrada arriba de todo en
  `HANDOFF.md` con lo hecho, lo pendiente y los `.sql` que el usuario
  tiene que correr.

---

## 9. Cómo trabajar con el usuario

- Habla español (a veces en mayúsculas, a veces por voz con errores de
  transcripción). Respuestas cortas, directas, accionables.
- **Principiante en infraestructura**: cualquier paso en Supabase,
  Vercel o GitHub necesita instrucciones tipo "entrá acá, hacé clic en
  esto, pegá esto", y links directos a los archivos. SQL siempre
  completo para copiar y pegar, nunca fragmentos.
- **Muy exigente con la exactitud de los datos.** Cuando dice que un
  número no coincide, casi siempre es un problema real de convención:
  investigar a fondo, no re-verificar lo mismo.
- Suele mandar capturas de pantalla para explicar lo que quiere o un
  error. Reportarle con hechos concretos (qué se probó, qué valores).
- Pide cambios de diseño con referencias (fotos del cuaderno de Nufal,
  mockups): seguirlas de cerca. Si un pedido es ambiguo, preguntar antes
  de implementar.
- No borrar funcionalidad que no pidió sacar; si algo queda redundante,
  avisarle.

---

## 10. Estado actual y pendientes (3-nov-2026)

- **En curso**: confirmar que `96c4483` (Cuaderno como página propia,
  hoja semanal, columna Pre semana / Semana actual) quedó en producción.
- **`.sql` que el usuario dijo haber corrido**:
  `hikman_journal_entries_2026-10-11.sql`, `hikman_journal_week_board_2026-10-25.sql`.
- **Commits perdidos de `claude/handoff-continuacion-xvvz4b`** (7, de
  `d2f07b4` a `1ce9140`: Groq / OpenRouter / xAI como proveedores del
  mentor, Banqueros en la barra lateral, Bóveda tipo libro, capturas con
  posición libre). Estuvieron en producción 5–11-oct y se perdieron. El
  usuario eligió dejarlo para después. Al reconciliar, el Cuaderno base es
  el actual (`hikman_journal_entries`).
- **Datos perdidos**: lo escrito en el Cuaderno y el Informe Diario antes
  del 11-oct-2026 nunca llegó a Supabase (choque con `journal_entries`).
  No es recuperable; se ofreció recargarlo como titulares si el usuario
  tiene capturas.
- **Sin implementar a propósito**: bloque MPD / MPB / Crudo / VIX bajo la
  "Pre semana" del Cuaderno (el usuario no lo pidió explícito; preguntar
  qué significan MPD/MPB).
- Sector Inmobiliario solo existe para USD.
- Pendientes viejos sin confirmar (ver `HANDOFF.md`, sección del 4-oct):
  claves de IA en Vercel, varios `.sql` de agosto/septiembre, la
  interpretación de "fondos negros" en modo claro.

---

## 11. Índice de `HANDOFF.md` (dónde buscar detalle)

| Tema | Sección en `HANDOFF.md` |
|---|---|
| Última actividad | las primeras secciones (más reciente arriba) |
| Ramas y producción | "Arrancar por acá: ramas y producción (21-oct-2026)" |
| Sector Inmobiliario | "Sesión 21-oct-2026: Sector Inmobiliario" |
| Cuaderno, choque con TraderMind, gráfico de sesgo | "Estado al cierre de la sesión del 11/21-oct-2026" y "Sesión 25-oct-2026" |
| Estructura de carpetas detallada | "Stack técnico" |
| Patrón multi-divisa y sourcing | "Arquitectura multi-divisa" |
| Indicadores por divisa y su fuente | "Indicadores actuales por divisa" |
| Banqueros | "Sección de Banqueros Centrales" |
| Endpoints, convenciones, bugs resueltos | "Decisiones técnicas importantes", "Lecciones NZD/JPY/CHF/CNY" |
| Titulares, logo, Panel, migración del Excel | secciones del 31-jul-2026 |
| Gaps conocidos | "Gaps conocidos" |
| Comandos de verificación por fuente | "Cómo verificar cosas" |
| Preferencias del usuario | "Estilo de trabajo esperado por el usuario" |
