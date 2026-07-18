import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "Resumen GBP" del Excel (jul-2026). Mismo patrón
// que EUR: el Excel usaba límites de valoración variables por fila (Máx 1,
// 2 o 4), ScorePanel asume ±2 uniforme.
export const GBP_SCORE_SEED: ScoreRow[] = [
  { id: 'gbp_pmi_manuf_flash', label: 'PMI Manufactura', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
  { id: 'gbp_pmi_serv_flash', label: 'PMI Servicios', valoracion: -2, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
  { id: 'gbp_ccc', label: 'CCC', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
  { id: 'gbp_unemployment', label: 'Tasa de Desempleo', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
  { id: 'gbp_wage_incl_bonus_yoy', label: '% Salario + Bonus', valoracion: 0, weight: 'Informativo', currency: 'GBP' },
  { id: 'gbp_wage_excl_bonus_yoy', label: '% Salario - Bonus', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
  { id: 'gbp_cpi', label: 'CPI', valoracion: 0, weight: 'Máx(4) / Mín(-4)', currency: 'GBP' },
  { id: 'gbp_core_cpi', label: 'Core CPI', valoracion: 0, weight: 'Informativo', currency: 'GBP' },
  { id: 'gbp_cpi_yoy', label: 'CPI a/a', valoracion: 0, weight: 'Informativo', currency: 'GBP' },
  { id: 'gbp_core_cpi_yoy', label: 'Core CPI a/a', valoracion: 0, weight: 'Informativo', currency: 'GBP' },
  { id: 'gbp_retail_sales', label: 'Retail Sales', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
  { id: 'gbp_core_retail_sales', label: 'Core Retail Sales', valoracion: 0, weight: 'Informativo', currency: 'GBP' },
  { id: 'gbp_productivity', label: 'Productividad', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
  { id: 'gbp_consumer_confidence', label: 'Consumer Confidence (GfK)', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'GBP' },
];
