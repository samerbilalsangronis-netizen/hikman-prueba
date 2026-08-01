import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "DECISIONES" del Excel compartido (CAD/JPY/AUD/
// CHF/NZD), columna JPY (jul-2026). La fila "Tipos de Interés" de esa hoja
// no se usa — mismo motivo que CAD/AUD/NZD (datos corruptos, ver
// scoreSeedCad.ts); la tasa real vive en jpy_boj_rate (sección Tasas), no
// en el score.
//
// A diferencia de CAD/AUD/NZD, todas las valoraciones de la columna JPY ya
// caen dentro del rango ±2 del <select> de ScorePanel — no hace falta
// redondear/reescalar ninguna fila. El TOTAL de la app (4) sí coincide con
// el TOTAL del Excel para esta divisa.
export const JPY_SCORE_SEED: ScoreRow[] = [
  { id: 'jpy_cpi', label: 'Inflación', valoracion: -2, weight: 'Máx(4) / Mín(-4)', currency: 'JPY' },
  { id: 'jpy_unemployment', label: 'Tasa de Desempleo', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'JPY' },
  { id: 'jpy_employment_change', label: 'Cambios en el Empleo', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'JPY' },
  { id: 'jpy_pmi_manuf', label: 'PMI Manufactura', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'JPY' },
  { id: 'jpy_pmi_serv', label: 'PMI de Servicios', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'JPY' },
  { id: 'jpy_retail_sales', label: 'Ventas Minoristas', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'JPY' },
  { id: 'jpy_business_confidence', label: 'Confianza Empresarial', valoracion: 1, weight: 'Máx(1) / Mín(-1)', currency: 'JPY' },
  { id: 'jpy_consumer_confidence', label: 'Confianza de los Hogares', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'JPY' },
  { id: 'jpy_gdp_yoy', label: 'PIB', valoracion: 0, weight: 'Máx(3) / Mín(-3)', currency: 'JPY' },
];
