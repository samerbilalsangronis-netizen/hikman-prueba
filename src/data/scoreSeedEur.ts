import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "Resumen EUR" del Excel (jul-2026). El Excel usaba
// límites de valoración variables por fila (Máx 1, 2 o 4 según el indicador);
// ScorePanel asume ±2 uniforme para todas las filas contadas (igual que ya
// hace con USD) — simplificación deliberada, no una réplica exacta de los
// pesos del Excel.
export const EUR_SCORE_SEED: ScoreRow[] = [
  { id: 'eur_pmi_manuf_flash', label: 'PMI Manufactura (Flash)', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_pmi_serv_flash', label: 'PMI Servicios (Flash)', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_unemployment', label: 'Tasa de Desempleo', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_wage_yoy', label: '% Salario Eurozona', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_labor_cost_yoy', label: 'Coste Laboral Eurozona', valoracion: 0, weight: 'Informativo', currency: 'EUR' },
  { id: 'eur_cpi', label: 'HICP', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_core_cpi', label: 'Core HICP', valoracion: 0, weight: 'Informativo', currency: 'EUR' },
  { id: 'eur_cpi_yoy', label: 'HICP a/a', valoracion: 0, weight: 'Informativo', currency: 'EUR' },
  { id: 'eur_core_cpi_yoy', label: 'Core HICP a/a', valoracion: 0, weight: 'Informativo', currency: 'EUR' },
  { id: 'eur_retail_sales', label: 'Retail Sales', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_retail_sales_yoy', label: 'Retail Sales YoY', valoracion: 0, weight: 'Informativo', currency: 'EUR' },
  // Excel: -1, Máx(1)/Mín(-1). Redondeado a la escala ±2 que usa el ScorePanel.
  { id: 'eur_consumer_confidence', label: 'Consumer Confidence', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  // Excel: -0.5, Máx(1)/Mín(-1). Redondeado a -1 sobre la escala ±2.
  { id: 'eur_business_confidence', label: 'Business Confidence', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_zew_sentiment', label: 'ZEW Economic Sentiment', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
  { id: 'eur_industrial_production', label: 'Producción Industrial', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'EUR' },
];
