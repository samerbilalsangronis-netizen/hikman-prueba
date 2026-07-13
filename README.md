# USD Macro — Seguimiento Fundamental

Dashboard web de seguimiento macroeconómico del dólar estadounidense, construido a partir de un
Excel de análisis fundamental. Reemplaza las hojas y gráficos del Excel con tarjetas interactivas
que muestran, para cada indicador, su último valor, su variación y una **insignia de frescura**
(al día / revisar / desactualizado) para que nunca vuelva a pasar desapercibido que un dato lleva
meses o años sin actualizarse.

## Secciones (v1 — núcleo)

- **Resumen** — score compuesto USD (valoración manual −2/+2 por indicador) + indicadores clave.
- **Tasas y Fed** — tasa de referencia, bono del Tesoro a 10 años, M2, balance de la Fed, PIB.
- **Inflación** — CPI, Core CPI, PPI, Core PPI.
- **Empleo** — NFP, tasa de desempleo, salarios, JOLTS, ADP.
- **ISM / Sentimiento** — PMI Manufactura y Servicios.
- **Actualizar Datos** — panel para cargar manualmente el último dato de cada indicador (como en
  el Excel, pero versionado). El botón "Exportar JSON" descarga el dataset combinado para
  reemplazar `src/data/historical-series.json` y dejar los cambios fijos para todos.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción (tsc -b && vite build)
npm run preview  # sirve el build de dist/
```

## Datos

Los datos históricos viven en `src/data/historical-series.json` (extraídos del Excel original,
fuentes: FRED, BLS, ISM). Los metadatos de cada indicador (etiqueta, unidad, frecuencia esperada,
fuente) están en `src/data/indicators.ts`. Las ediciones hechas desde "Actualizar Datos" se
guardan en `localStorage` del navegador hasta que se exportan y se comitean al repositorio.

## Stack

React + TypeScript + Vite + Tailwind CSS v4 + Recharts + React Router.
