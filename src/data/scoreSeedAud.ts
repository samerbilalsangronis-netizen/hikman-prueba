import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "DECISIONES" del Excel compartido (CAD/JPY/AUD/
// CHF/NZD), columna AUD (jul-2026). La fila "Interest Rate" de esa hoja no
// se usa — mismo motivo que CAD/NZD (datos corruptos, ver scoreSeedCad.ts);
// la tasa real vive en aud_rba_rate (sección Tasas), no en el score.
//
// El Excel usaba límites de valoración variables por fila (Máx 1, 2 o 3),
// pero el <select> de ScorePanel solo tiene 5 opciones enteras: -2..2. Se
// redondea cada fila fuera de ese set a la escala ±2 (mismo criterio que
// CAD/EUR): Confianza Empresarial -0.5 sobre Máx(1)/Mín(-1) → -1
// (redondeado hacia afuera del cero); PIB 1.5 sobre Máx(3)/Mín(-3) → 2
// (redondeado hacia afuera del cero). El TOTAL de la app no replica exacto
// el TOTAL del Excel por este motivo — mismo trade-off documentado en
// scoreSeedCad.ts.
export const AUD_SCORE_SEED: ScoreRow[] = [
  { id: 'aud_cpi', label: 'Inflación', valoracion: 2, weight: 'Máx(4) / Mín(-4)', currency: 'AUD' },
  { id: 'aud_unemployment', label: 'Tasa de Desempleo', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'AUD' },
  { id: 'aud_employment_change', label: 'Cambios en el Empleo', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'AUD' },
  { id: 'aud_pmi_manuf', label: 'PMI Manufactura', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'AUD' },
  { id: 'aud_pmi_serv', label: 'PMI de Servicios', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'AUD' },
  { id: 'aud_retail_sales', label: 'Ventas Minoristas', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'AUD' },
  { id: 'aud_business_confidence', label: 'Confianza Empresarial', valoracion: -1, weight: 'Máx(1) / Mín(-1)', currency: 'AUD' },
  { id: 'aud_consumer_confidence', label: 'Confianza del Consumidor', valoracion: -2, weight: 'Máx(2) / Mín(-2)', currency: 'AUD' },
  { id: 'aud_gdp_yoy', label: 'PIB', valoracion: 2, weight: 'Máx(3) / Mín(-3)', currency: 'AUD' },
];
