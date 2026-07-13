// Mapeo entre nuestros indicadores y series de FRED (Federal Reserve Economic Data).
// "transform" indica cómo pasar del dato crudo de FRED al valor que guardamos:
//   level_pct   -> el valor de FRED ya es un % (ej. 5.33) -> se guarda como fracción (0.0533)
//   level       -> el valor de FRED se guarda tal cual
//   level_div1000 -> el valor de FRED se guarda dividido entre 1000 (miles -> millones)
//   pct_change  -> variación % respecto a la observación anterior (para índices de nivel como CPI)
//   diff_x1000  -> diferencia respecto a la observación anterior, en miles de personas (NFP)
export type FredTransform = 'level_pct' | 'level' | 'level_div1000' | 'pct_change' | 'diff_x1000';

export interface FredMapping {
  indicatorId: string;
  seriesId: string;
  transform: FredTransform;
}

export const FRED_MAPPINGS: FredMapping[] = [
  { indicatorId: 'fed_funds_rate', seriesId: 'FEDFUNDS', transform: 'level_pct' },
  { indicatorId: 't10y', seriesId: 'WGS10YR', transform: 'level_pct' },
  { indicatorId: 'm2_value', seriesId: 'WM2NS', transform: 'level' },
  { indicatorId: 'gdp_qoq', seriesId: 'A191RL1Q225SBEA', transform: 'level_pct' },
  { indicatorId: 'cpi', seriesId: 'CPIAUCSL', transform: 'pct_change' },
  { indicatorId: 'core_cpi', seriesId: 'CPILFESL', transform: 'pct_change' },
  // PPIFGS/PPILFE (las series "clásicas") fueron descontinuadas por BLS/FRED
  // en dic-2015. PPIFIS/PPIFES son su continuación bajo la metodología
  // "Final Demand" vigente.
  { indicatorId: 'ppi', seriesId: 'PPIFIS', transform: 'pct_change' },
  { indicatorId: 'core_ppi', seriesId: 'PPIFES', transform: 'pct_change' },
  { indicatorId: 'nfp', seriesId: 'PAYEMS', transform: 'diff_x1000' },
  { indicatorId: 'unemployment', seriesId: 'UNRATE', transform: 'level_pct' },
  { indicatorId: 'wage_pct', seriesId: 'CES0500000003', transform: 'pct_change' },
  { indicatorId: 'jolts', seriesId: 'JTSJOL', transform: 'level_div1000' },
];

// Balance de la Fed como % del PIB: combina dos series de FRED (no encaja en el
// mapeo genérico de arriba porque necesita dividir una entre la otra).
export const CBBS_MAPPING = {
  indicatorId: 'cbbs_pct_gdp',
  balanceSheetSeriesId: 'WALCL', // millones de USD, semanal
  gdpSeriesId: 'GDP', // miles de millones de USD nominal, trimestral
};
