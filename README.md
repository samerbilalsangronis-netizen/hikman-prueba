# USD Macro — Seguimiento Fundamental

Dashboard web de seguimiento macroeconómico del dólar estadounidense, construido a partir de un
Excel de análisis fundamental. Reemplaza las hojas y gráficos del Excel con tarjetas interactivas
que muestran, para cada indicador, su último valor, su variación y una **insignia de frescura**
(al día / revisar / desactualizado) para que nunca vuelva a pasar desapercibido que un dato lleva
meses o años sin actualizarse.

Primera pieza de un panel macro más grande: el plan es sumar más adelante EUR, GBP, NZD, AUD,
CHF, JPY y CAD siguiendo el mismo patrón (indicadores + score + frescura) una vez que el USD esté
sólido.

## Secciones (v1 — núcleo)

- **Resumen** — score compuesto USD (valoración manual −2/+2 por indicador) + indicadores clave.
- **Tasas y Fed** — tasa de referencia, bono del Tesoro a 10 años, M2, balance de la Fed, PIB.
- **Inflación** — CPI, Core CPI, PPI, Core PPI.
- **Empleo** — NFP, tasa de desempleo, salarios, JOLTS, ADP.
- **ISM / Sentimiento** — PMI Manufactura y Servicios.
- **Actualizar Datos** — panel para cargar manualmente el último dato de cada indicador (como en
  el Excel, pero versionado), botón para sincronizar automáticamente desde FRED, y exportar el
  dataset combinado a JSON.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción (tsc -b && vite build)
npm run preview  # sirve el build de dist/
```

## Datos y persistencia

Los datos históricos viven en `src/data/historical-series.json` (extraídos del Excel original,
fuentes: FRED, BLS, ISM). Los metadatos de cada indicador (etiqueta, unidad, frecuencia esperada,
fuente) están en `src/data/indicators.ts`.

Las ediciones hechas desde "Actualizar Datos" (nuevos puntos y valoraciones del score) se guardan
en **Supabase** si el proyecto tiene configuradas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
(ver `supabase/schema.sql` para las tablas). Sin esas variables, la app funciona igual pero guarda
todo en `localStorage` del navegador.

## Sincronización automática con FRED

El botón "Sincronizar con FRED" en `Actualizar Datos` llama a la función serverless
`api/fred-sync.ts`, que trae el último dato de cada indicador cubierto directamente desde la API
de [FRED](https://fred.stlouisfed.org/) (Reserva Federal de St. Louis) y lo guarda en Supabase. El
mapeo de series está en `src/data/fredMappings.ts`. Cubre: tasa de la Fed, bono a 10 años, M2,
balance de la Fed, PIB, CPI, Core CPI, PPI, Core PPI, NFP, desempleo, salarios y JOLTS. ISM,
Michigan, Conference Board y ADP no tienen API pública gratuita, así que se siguen cargando a mano.

Requiere la variable de entorno `FRED_API_KEY` (server-side, sin prefijo `VITE_` para que nunca se
exponga al navegador) — se obtiene gratis en
[fredaccount.stlouisfed.org/apikeys](https://fredaccount.stlouisfed.org/apikeys). Esta función solo
corre en Vercel (o con `vercel dev`); no funciona con `npm run dev` porque Vite no sirve `/api`.

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + Recharts + React Router + Supabase + funciones
serverless de Vercel.
