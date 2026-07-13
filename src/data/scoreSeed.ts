import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "Resumen USD" del Excel original (jul-2026).
// La "Valoración" es un juicio del analista (-2 a +2) y se edita a mano
// desde la página "Actualizar Datos", igual que en el Excel.
export const SCORE_SEED: ScoreRow[] = [
  { id: 'ism_manuf', label: 'ISM Manufactura', valoracion: 2, weight: 'Máx(2) / Mín(-2)' },
  { id: 'ism_serv', label: 'ISM Servicios', valoracion: 1, weight: 'Máx(2) / Mín(-2)' },
  { id: 'jolts', label: 'JOLTS (M)', valoracion: 0, weight: 'Informativo' },
  { id: 'adp', label: 'ADP', valoracion: 0, weight: 'Informativo' },
  { id: 'nfp', label: 'NFP', valoracion: -1, weight: 'Máx(2) / Mín(-2)' },
  { id: 'unemployment', label: 'Tasa de Desempleo', valoracion: 1, weight: 'Máx(2) / Mín(-2)' },
  { id: 'wage_pct', label: '% Salarial', valoracion: 0, weight: 'Máx(2) / Mín(-2)' },
  { id: 'cpi', label: 'CPI', valoracion: 0, weight: 'Máx(2) / Mín(-2)' },
  { id: 'core_cpi', label: 'Core CPI', valoracion: 0, weight: 'Informativo' },
  { id: 'ppi', label: 'PPI', valoracion: 1, weight: 'Máx(2) / Mín(-2)' },
  { id: 'core_ppi', label: 'Core PPI', valoracion: 0, weight: 'Informativo' },
  { id: 'retail_sales', label: 'Retail Sales', valoracion: 0, weight: 'Máx(2) / Mín(-2)' },
  { id: 'core_retail_sales', label: 'Core Retail Sales', valoracion: 0, weight: 'Informativo' },
  { id: 'uom', label: 'Sentimiento U. Michigan', valoracion: -1, weight: 'Máx(2) / Mín(-2)' },
  { id: 'cb', label: 'Confianza Consumidor (CB)', valoracion: 0, weight: 'Máx(2) / Mín(-2)' },
];
