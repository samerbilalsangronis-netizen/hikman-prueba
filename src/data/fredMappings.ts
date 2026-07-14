// Mapeo entre nuestros indicadores y series de FRED (Federal Reserve Economic Data).
// "transform" indica cómo pasar del dato crudo de FRED al valor que guardamos:
//   level_pct   -> el valor de FRED ya es un % (ej. 5.33) -> se guarda como fracción (0.0533)
//   level       -> el valor de FRED se guarda tal cual
//   level_div1000 -> el valor de FRED se guarda dividido entre 1000 (miles -> millones)
//   pct_change  -> variación % respecto al mes anterior (para índices de nivel como CPI)
//   pct_change_yoy -> variación % respecto al mismo mes del año anterior
//   diff_x1000  -> diferencia respecto a la observación anterior, en miles de personas (NFP)
export type FredTransform = 'level_pct' | 'level' | 'level_div1000' | 'pct_change' | 'pct_change_yoy' | 'diff_x1000';

export interface FredMapping {
  indicatorId: string;
  seriesId: string;
  transform: FredTransform;
}

export const FRED_MAPPINGS: FredMapping[] = [
  // DFEDTARU = límite superior del rango objetivo del FOMC (lo que reportan
  // medios/Investing.com como "la tasa de la Fed"). FEDFUNDS (tasa efectiva
  // promedio mensual) es distinta y normalmente queda cerca del punto medio
  // del rango, no del límite superior.
  { indicatorId: 'fed_funds_rate', seriesId: 'DFEDTARU', transform: 'level_pct' },
  { indicatorId: 't10y', seriesId: 'WGS10YR', transform: 'level_pct' },
  { indicatorId: 'gdp_qoq', seriesId: 'A191RL1Q225SBEA', transform: 'level_pct' },
  { indicatorId: 'cpi', seriesId: 'CPIAUCSL', transform: 'pct_change' },
  { indicatorId: 'core_cpi', seriesId: 'CPILFESL', transform: 'pct_change' },
  // PPIFGS/PPILFE (las series "clásicas") fueron descontinuadas por BLS/FRED
  // en dic-2015. PPIFIS/PPIFES son su continuación bajo la metodología
  // "Final Demand" vigente.
  { indicatorId: 'ppi', seriesId: 'PPIFIS', transform: 'pct_change' },
  { indicatorId: 'core_ppi', seriesId: 'PPIFES', transform: 'pct_change' },
  // a/a usa las series SIN ajuste estacional (NSA): así calcula BLS/prensa
  // el interanual — usar la serie ajustada da un número distinto.
  { indicatorId: 'cpi_yoy', seriesId: 'CPIAUCNS', transform: 'pct_change_yoy' },
  { indicatorId: 'core_cpi_yoy', seriesId: 'CPILFENS', transform: 'pct_change_yoy' },
  { indicatorId: 'ppi_yoy', seriesId: 'PPIFID', transform: 'pct_change_yoy' },
  { indicatorId: 'core_ppi_yoy', seriesId: 'PPICOR', transform: 'pct_change_yoy' },
  { indicatorId: 'nfp', seriesId: 'PAYEMS', transform: 'diff_x1000' },
  { indicatorId: 'unemployment', seriesId: 'UNRATE', transform: 'level_pct' },
  { indicatorId: 'wage_pct', seriesId: 'CES0500000003', transform: 'pct_change' },
  { indicatorId: 'jolts', seriesId: 'JTSJOL', transform: 'level_div1000' },
  // Crecimiento
  // A diferencia de CPI/PPI (BLS usa NSA para el a/a), Census y la Fed
  // calculan el interanual de ventas minoristas y producción industrial
  // con la serie AJUSTADA (SA) — verificado contra el dato real: con NSA
  // daba 5.25%/1.63%, con SA da 6.88%/1.67%, que es lo que coincide con la
  // fuente oficial. Cada agencia tiene su propia convención, no es universal.
  { indicatorId: 'gdp_deflator', seriesId: 'A191RI1Q225SBEA', transform: 'level_pct' },
  { indicatorId: 'retail_sales', seriesId: 'RSAFS', transform: 'pct_change' },
  { indicatorId: 'retail_sales_yoy', seriesId: 'RSAFS', transform: 'pct_change_yoy' },
  { indicatorId: 'core_retail_sales', seriesId: 'RSFSXMV', transform: 'pct_change' },
  { indicatorId: 'industrial_production', seriesId: 'INDPRO', transform: 'pct_change' },
  { indicatorId: 'industrial_production_yoy', seriesId: 'INDPRO', transform: 'pct_change_yoy' },
  { indicatorId: 'trade_balance', seriesId: 'BOPGSTB', transform: 'level' },
  { indicatorId: 'empire_state', seriesId: 'GACDISA066MSFRBNY', transform: 'level' },
];

// Balance de la Fed como % del PIB: combina dos series de FRED (no encaja en el
// mapeo genérico de arriba porque necesita dividir una entre la otra).
export const CBBS_MAPPING = {
  indicatorId: 'cbbs_pct_gdp',
  balanceSheetSeriesId: 'WALCL', // millones de USD, semanal
  gdpSeriesId: 'GDP', // miles de millones de USD nominal, trimestral
};
