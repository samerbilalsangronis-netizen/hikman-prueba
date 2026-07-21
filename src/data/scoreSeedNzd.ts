import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "DECISIONES" del Excel compartido (CAD/JPY/AUD/
// CHF/NZD), columna NZD (jul-2026). La fila "Tipos de Interés" de esa hoja
// no se usa — mismo motivo que CAD/AUD (datos corruptos, ver
// scoreSeedCad.ts); la tasa real vive en nzd_ocr_rate (sección Tasas), no
// en el score.
//
// El Excel usaba límites de valoración variables por fila (Máx 1, 2, 3 o
// 4), pero el <select> de ScorePanel solo tiene 5 opciones enteras: -2..2.
// Se redondea cada fila fuera de ese set a la escala ±2, siempre hacia
// afuera del cero (mismo criterio que CAD/EUR/AUD): Inflación 4 sobre
// Máx(4)/Mín(-4) → 2; PIB 1.5 sobre Máx(3)/Mín(-3) → 2. El TOTAL de la app
// no replica exacto el TOTAL del Excel (1.5) por este motivo — mismo
// trade-off documentado en scoreSeedCad.ts.
export const NZD_SCORE_SEED: ScoreRow[] = [
  { id: 'nzd_cpi', label: 'Inflación', valoracion: 2, weight: 'Máx(4) / Mín(-4)', currency: 'NZD' },
  { id: 'nzd_unemployment', label: 'Tasa de Desempleo', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'NZD' },
  { id: 'nzd_employment_change', label: 'Cambios en el Empleo', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'NZD' },
  { id: 'nzd_pmi_manuf', label: 'PMI Manufactura', valoracion: -2, weight: 'Máx(2) / Mín(-2)', currency: 'NZD' },
  { id: 'nzd_pmi_serv', label: 'PMI de Servicios', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'NZD' },
  { id: 'nzd_retail_sales', label: 'Ventas Minoristas', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'NZD' },
  { id: 'nzd_business_confidence', label: 'Confianza Empresarial', valoracion: 0, weight: 'Máx(1) / Mín(-1)', currency: 'NZD' },
  { id: 'nzd_consumer_confidence', label: 'Confianza del Consumidor', valoracion: -2, weight: 'Máx(2) / Mín(-2)', currency: 'NZD' },
  { id: 'nzd_gdp_yoy', label: 'PIB', valoracion: 2, weight: 'Máx(3) / Mín(-3)', currency: 'NZD' },
];
