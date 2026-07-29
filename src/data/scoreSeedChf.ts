import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "DECISIONES" del Excel compartido (CAD/JPY/AUD/
// CHF/NZD), columna CHF (jul-2026). La fila "Tipos de Interés" de esa hoja
// no se usa — mismo motivo que CAD/AUD/NZD/JPY (datos corruptos, ver
// scoreSeedCad.ts lección #12); la tasa real vive en chf_snb_rate (sección
// Tasas), no en el score.
//
// Solo una fila queda fuera del rango ±2 del <select> de ScorePanel —
// Confianza Empresarial (0.5) — se redondea hacia afuera del cero a 1,
// mismo criterio que AUD/NZD (ver lección #3 en HANDOFF.md). El resto ya
// cae dentro del rango, no hace falta reescalar nada más.
export const CHF_SCORE_SEED: ScoreRow[] = [
  { id: 'chf_cpi', label: 'Inflación', valoracion: -2, weight: 'Máx(4) / Mín(-4)', currency: 'CHF' },
  { id: 'chf_unemployment', label: 'Tasa de Desempleo', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'CHF' },
  { id: 'chf_employment_change', label: 'Cambios en el Empleo', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'CHF' },
  { id: 'chf_pmi_manuf', label: 'PMI Manufactura', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'CHF' },
  { id: 'chf_pmi_serv', label: 'PMI de Servicios', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'CHF' },
  { id: 'chf_retail_sales', label: 'Ventas Minoristas', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'CHF' },
  { id: 'chf_business_confidence', label: 'Confianza Empresarial', valoracion: 1, weight: 'Máx(1) / Mín(-1)', currency: 'CHF' },
  { id: 'chf_consumer_confidence', label: 'Confianza del Consumidor', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'CHF' },
  { id: 'chf_gdp_yoy', label: 'PIB', valoracion: 0, weight: 'Máx(3) / Mín(-3)', currency: 'CHF' },
];
