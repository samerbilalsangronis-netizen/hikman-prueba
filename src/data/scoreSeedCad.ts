import type { ScoreRow } from '../types';

// Semilla tomada de la hoja "DECISIONES" del Excel compartido (CAD/JPY/AUD/
// CHF/NZD), columna CAD (jul-2026). La fila "Tipos de Interés" de esa hoja
// no se usa — tenía datos claramente corruptos (22.5, un valor que nunca fue
// la tasa del BoC en ningún momento reciente); la tasa real vive en
// cad_boc_rate (sección Tasas), no forma parte del score, igual que en
// USD/EUR/GBP.
//
// El Excel usaba límites de valoración variables por fila (Máx 1, 2, 3 o 4),
// pero el <select> de ScorePanel solo tiene 5 opciones enteras: -2..2 (ver
// ScorePanel.tsx). Un valor fuera de ese set (ej. -3, o 0.5) no matchea
// ninguna <option> y el dropdown se ve mal (aunque el TOTAL sí sume el
// número real) — bug encontrado en la captura de verificación de esta
// sesión. Se redondea/reescala cada fila fuera de rango a la escala ±2,
// mismo criterio que ya usa EUR (ver scoreSeedEur.ts): PIB -3 sobre
// Máx(3)/Mín(-3) → -2 (reescalado proporcional); Confianza Empresarial 0.5
// sobre Máx(1)/Mín(-1) → 1 (redondeado hacia afuera del cero, como hizo EUR
// con su -0.5 → -1). El TOTAL de la app ya no replica exacto el TOTAL del
// Excel por este motivo — mismo trade-off que EUR, documentado ahí también.
export const CAD_SCORE_SEED: ScoreRow[] = [
  { id: 'cad_cpi', label: 'Inflación', valoracion: 2, weight: 'Máx(4) / Mín(-4)', currency: 'CAD' },
  { id: 'cad_unemployment', label: 'Tasa de Desempleo', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'CAD' },
  { id: 'cad_employment_change', label: 'Cambios en el Empleo', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'CAD' },
  { id: 'cad_pmi_manuf', label: 'PMI Manufactura', valoracion: 2, weight: 'Máx(2) / Mín(-2)', currency: 'CAD' },
  { id: 'cad_pmi_serv', label: 'PMI de Servicios', valoracion: -1, weight: 'Máx(2) / Mín(-2)', currency: 'CAD' },
  { id: 'cad_retail_sales', label: 'Ventas Minoristas', valoracion: 1, weight: 'Máx(2) / Mín(-2)', currency: 'CAD' },
  { id: 'cad_business_confidence', label: 'Confianza Empresarial', valoracion: 1, weight: 'Máx(1) / Mín(-1)', currency: 'CAD' },
  { id: 'cad_consumer_confidence', label: 'Confianza del Consumidor', valoracion: 0, weight: 'Máx(2) / Mín(-2)', currency: 'CAD' },
  { id: 'cad_gdp_yoy', label: 'PIB', valoracion: -2, weight: 'Máx(3) / Mín(-3)', currency: 'CAD' },
];
