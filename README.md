# HIKMAN ENDÓGENO — Dashboard Macro Multi-Divisa

Dashboard web de seguimiento macroeconómico para **9 divisas** (USD, EUR, GBP, CAD, AUD, NZD,
JPY, CHF, CNY), construido originalmente a partir de un Excel de análisis fundamental de USD y
extendido divisa por divisa siguiendo el mismo patrón: indicadores + score compuesto + insignia
de frescura (al día / revisar / desactualizado) + insignia preliminar/final para indicadores que
publican el mismo dato en dos vueltas.

## Secciones

- **Panel de Control** (`/panel-control`) — sesgo compuesto por divisa (Currency Bias), ticker de
  titulares y feed de noticias traducidas.
- **Resumen** (`/`) — score compuesto por divisa (valoración manual −2/+2 por indicador) + indicadores clave.
- **Tasas y Fed** (`/tasas`) — tasa de referencia del banco central, bonos, balance, agregados monetarios.
- **Inflación** (`/inflacion`) — CPI, Core CPI, PPI, Core PPI (o equivalentes locales por divisa).
- **Empleo** (`/empleo`) — nómina no agrícola, desempleo, salarios, JOLTS, ADP (según disponibilidad por divisa).
- **Confianza / Sentimiento** (`/confianza`) — PMI Manufactura y Servicios, encuestas de confianza.
- **Crecimiento** (`/crecimiento`) — PIB y desglose por componente (Consumo/Inversión/Gasto
  Público/Exportaciones Netas) donde la fuente lo publica automatizado.
- **Alemania / Francia** (`/alemania`, `/francia`) — desglose de indicadores clave de las dos
  mayores economías de la eurozona.
- **Banqueros** (`/banqueros`) — perfiles de los responsables de política monetaria de los 9 bancos centrales.
- **Titulares** (`/titulares`) — noticias de mercado relevantes por divisa, traducidas automáticamente.
- **Renta Variable** (`/renta-variable`) — cotizaciones de referencia por divisa.
- **Actualizar Datos** (`/actualizar`) — panel para cargar manualmente el último dato de un
  indicador (para las fuentes sin API pública) y exportar el dataset combinado a JSON.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción (tsc -b && vite build)
npm run preview  # sirve el build de dist/
```

## Datos y persistencia

Los datos históricos por divisa viven en `src/data/` (indicadores, score, banqueros, equities).
Las ediciones hechas desde "Actualizar Datos" se guardan en **Supabase** si el proyecto tiene
configuradas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `supabase/schema.sql` para las
tablas). Sin esas variables, la app funciona igual pero guarda todo en `localStorage` del navegador.

## Sincronización automática

Cada divisa tiene su propia función serverless de sincronización (`api/<divisa>-sync.ts`) que trae
los últimos datos directo de la fuente oficial correspondiente (FRED, Eurostat, BoE, StatCan/BoC,
ABS/RBA, Stats NZ, e-Stat/BOJ, SNB/SECO/KOF, chinadata.live) y los guarda en Supabase. El mapeo de
series por divisa está en `src/data/fredMappings.ts` y en cada `api/<divisa>-sync.ts`.

**Ya no hay botón manual de sincronización.** Vercel Hobby (plan gratis) no permite cron jobs más
frecuentes que una vez al día, así que la automatización corre vía **GitHub Actions**
(`.github/workflows/sync-currencies.yml`, cada 30 minutos, las 9 divisas en pasos independientes)
más una rutina de respaldo por hora como red de seguridad. Los titulares y su traducción se
sincronizan aparte (`.github/workflows/sync-titulares.yml`).

Cada función de sync requiere las variables de entorno correspondientes a su fuente (ver cada
archivo `api/*-sync.ts`) y solo corre en Vercel (o con `vercel dev`); no funciona con `npm run dev`
porque Vite no sirve `/api`.

Cobertura real de automatización, quirks por fuente y decisiones de diseño: ver `HANDOFF.md`.

## Mapa de conocimiento (Graphify)

El repo tiene un grafo de conocimiento generado con [Graphify](https://graphify.com) en
`graphify-out/` (`graph.html` interactivo, `GRAPH_REPORT.md`, `graph.json` consultable). Útil para
entender rápido cómo se conectan los 9 pipelines de sync, los componentes de UI y las decisiones
documentadas en `HANDOFF.md`. Ver la skill `/graphify` en Claude Code para consultarlo o
actualizarlo (`/graphify . --update` tras cambios).

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + Recharts + React Router + Supabase + funciones
serverless de Vercel.
