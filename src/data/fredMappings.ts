// Mapeo entre nuestros indicadores y series de FRED (Federal Reserve Economic Data).
// "transform" indica cómo pasar del dato crudo de FRED al valor que guardamos:
//   level_pct   -> el valor de FRED ya es un % (ej. 5.33) -> se guarda como fracción (0.0533)
//   level       -> el valor de FRED se guarda tal cual
//   level_div1000 -> el valor de FRED se guarda dividido entre 1000 (miles -> millones)
//   pct_change  -> variación % respecto al mes anterior (para índices de nivel como CPI)
//   pct_change_yoy -> variación % respecto al mismo mes del año anterior
//   diff_x1000  -> diferencia respecto a la observación anterior, en miles de personas (NFP)
export type FredTransform =
  | 'level_pct'
  | 'level'
  | 'level_div1000'
  | 'pct_change'
  | 'pct_change_yoy'
  | 'pct_change_quarter'
  | 'diff_x1000';

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
  { indicatorId: 'pce', seriesId: 'PCEPI', transform: 'pct_change' },
  { indicatorId: 'pce_yoy', seriesId: 'PCEPI', transform: 'pct_change_yoy' },
  { indicatorId: 'core_pce', seriesId: 'PCEPILFE', transform: 'pct_change' },
  { indicatorId: 'core_pce_yoy', seriesId: 'PCEPILFE', transform: 'pct_change_yoy' },
  { indicatorId: 'personal_income', seriesId: 'PI', transform: 'pct_change' },
  { indicatorId: 'personal_spending', seriesId: 'PCE', transform: 'pct_change' },
  { indicatorId: 'nfp', seriesId: 'PAYEMS', transform: 'diff_x1000' },
  { indicatorId: 'unemployment', seriesId: 'UNRATE', transform: 'level_pct' },
  { indicatorId: 'wage_pct', seriesId: 'CES0500000003', transform: 'pct_change' },
  { indicatorId: 'wage_pct_yoy', seriesId: 'CES0500000003', transform: 'pct_change_yoy' },
  { indicatorId: 'eci_qoq', seriesId: 'ECIALLCIV', transform: 'pct_change_quarter' },
  { indicatorId: 'eci_yoy', seriesId: 'CIU1010000000000I', transform: 'pct_change_yoy' },
  { indicatorId: 'jolts', seriesId: 'JTSJOL', transform: 'level_div1000' },
  { indicatorId: 'initial_claims', seriesId: 'ICSA', transform: 'level' },
  { indicatorId: 'continuing_claims', seriesId: 'CCSA', transform: 'level' },
  // Confianza / Sentimiento
  { indicatorId: 'uom', seriesId: 'UMCSENT', transform: 'level' },
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

// EUR — igual patrón que arriba, pero FRED republica estas series desde el
// BCE/Eurostat (no son series propias de FRED). El desempleo de EUR NO está
// acá: FRED la tiene discontinuada desde 2023, se sincroniza directo desde
// Eurostat (ver api/eur-sync.ts).
//
// HICP (CPI/core CPI de Eurozona/Alemania/Francia, m/m y a/a) se movió a
// Eurostat prc_hicp_fpd (ver EUR_HICP_FPD_INDICATOR_IDS) — ya NO vía FRED.
// Solo quedan acá las tasas del BCE y el PIB.
export const EUR_FRED_MAPPINGS: FredMapping[] = [
  { indicatorId: 'eur_ecb_deposit_rate', seriesId: 'ECBDFR', transform: 'level_pct' },
  { indicatorId: 'eur_ecb_refi_rate', seriesId: 'ECBMRRFR', transform: 'level_pct' },
  { indicatorId: 'eur_ecb_marginal_rate', seriesId: 'ECBMLFR', transform: 'level_pct' },
  // PIB trimestral (nivel, millones de euros encadenados 2010). Eurostat
  // reporta la variación trimestral SIN anualizar (a diferencia de BEA/EE.UU.)
  // — se computa como pct_change de 3 meses en vez de 1.
  { indicatorId: 'eur_gdp_qoq', seriesId: 'CLVMNACSCAB1GQEA19', transform: 'pct_change_quarter' },
  { indicatorId: 'eur_gdp_yoy', seriesId: 'CLVMNACSCAB1GQEA19', transform: 'pct_change_yoy' },
];

// Único indicador EUR sincronizado desde Eurostat une_rt_m (desempleo).
export const EUR_EUROSTAT_INDICATOR_ID = 'eur_unemployment';

// HICP de Eurozona/Alemania/Francia — Eurostat prc_hicp_fpd ("first released
// data"), que separa la vuelta flash (FLS, ~1 semana tras cerrar el mes) de
// la final (FIN, ~2-3 semanas después) con la tasa m/m y a/a YA CALCULADA.
// Se guarda con la fecha del PERÍODO (no la de publicación), así que el
// upsert (indicator_id, date) pisa el valor flash con el final apenas
// Eurostat lo publica, en la misma fila, sin intervención manual — ver
// api/eur-sync.ts para el detalle de la mezcla FIN>FLS por período.
export const EUR_HICP_FPD_INDICATOR_IDS = [
  'eur_cpi',
  'eur_cpi_yoy',
  'eur_core_cpi',
  'eur_core_cpi_yoy',
  'eur_de_hicp_mom',
  'eur_de_hicp_yoy',
  'eur_fr_hicp_mom',
  'eur_fr_hicp_yoy',
];

// GBP — a diferencia de USD/EUR, casi todo queda manual (ver indicatorsGbp.ts:
// la API de ONS está congelada/desactualizada). La Bank Rate se sincroniza
// vía el IADB del BoE (no FRED); la Balanza Comercial sí está disponible en
// FRED con datos vivos (XTNTVA01GBM664S, republicada desde ONS) — ambas se
// sincronizan desde api/gbp-sync.ts.
export const GBP_BOE_INDICATOR_ID = 'gbp_boe_rate';
export const GBP_TRADE_BALANCE_INDICATOR_ID = 'gbp_trade_balance';

// CAD — se sincroniza desde StatCan (Web Data Service) + Bank of Canada
// Valet, no FRED (los derivados de FRED para Canadá están desactualizados o
// discontinuados — verificado). PMI y encuestas de confianza quedan
// manuales (sin API pública), igual que en el resto de las divisas.
export const CAD_AUTO_INDICATOR_IDS = [
  'cad_boc_rate',
  'cad_cpi',
  'cad_core_cpi',
  'cad_cpi_yoy',
  'cad_core_cpi_yoy',
  'cad_cpi_median',
  'cad_cpi_trim',
  'cad_unemployment',
  'cad_employment_change',
  'cad_retail_sales',
  'cad_retail_sales_yoy',
  'cad_gdp_mom',
  'cad_gdp_yoy',
  'cad_trade_balance',
];

// AUD — se sincroniza desde la ABS Data API (SDMX, sin key) + CSV público
// del RBA, no FRED (FRED no republica la mayoría de estas series para
// Australia). PMI y encuestas de confianza (privados, sin API gratis)
// quedan manuales, igual que en el resto de las divisas.
export const AUD_AUTO_INDICATOR_IDS = [
  'aud_rba_rate',
  'aud_cpi',
  'aud_cpi_yoy',
  'aud_core_cpi',
  'aud_core_cpi_yoy',
  'aud_weighted_median',
  'aud_weighted_median_yoy',
  'aud_ppi_qoq',
  'aud_ppi_yoy',
  'aud_unemployment',
  'aud_employment_change',
  'aud_retail_sales',
  'aud_retail_sales_yoy',
  'aud_gdp_qoq',
  'aud_gdp_yoy',
  'aud_trade_balance',
];

// NZD — se sincroniza desde CSV públicos de Stats NZ (sin key), no FRED. El
// RBNZ está bloqueado para fetch automatizado (Cloudflare devuelve 403 en
// todo el dominio) — OCR queda manual. Desempleo/Empleo (HLFS, ZIP de
// ~400MB sin comprimir) y Balanza Comercial (solo XLSX) también quedan
// manuales — ver indicatorsNzd.ts para el detalle de cada decisión.
export const NZD_AUTO_INDICATOR_IDS = ['nzd_cpi', 'nzd_cpi_yoy', 'nzd_gdp_qoq', 'nzd_gdp_yoy', 'nzd_retail_sales', 'nzd_retail_sales_yoy'];

// JPY — se sincroniza desde el e-Stat Dashboard API (dashboard.e-stat.go.jp,
// sin key — distinta de la API principal de e-Stat, que sí exige un appId
// registrado), el CSV público del BOJ (stat-search.boj.or.jp, no bloqueado
// a diferencia de rbnz.govt.nz) y el CSV de Aduanas de Japón
// (customs.go.jp). PMI, Tankan y confianza del consumidor quedan
// manuales — ver indicatorsJpy.ts para el detalle de cada decisión.
export const JPY_AUTO_INDICATOR_IDS = [
  'jpy_boj_rate',
  'jpy_cpi',
  'jpy_cpi_yoy',
  'jpy_core_cpi',
  'jpy_core_cpi_yoy',
  'jpy_tokyo_cpi_yoy',
  'jpy_tokyo_core_cpi_yoy',
  'jpy_unemployment',
  'jpy_employment_change',
  'jpy_retail_sales',
  'jpy_retail_sales_yoy',
  'jpy_gdp_qoq',
  'jpy_gdp_yoy',
  'jpy_trade_balance',
];

// CHF — se sincroniza desde el SNB Data Portal (data.snb.ch, sin key) y
// dos feeds CSV de SECO expuestos vía scheduler.swissdatas.ch (encontrados
// raspando el HTML de las páginas públicas de seco.admin.ch, no
// documentados formalmente) + la API pública v2 del KOF (ETH Zúrich) para
// el Business Confidence. Desempleo, Cambios en el Empleo, Ventas
// Minoristas, PMI y la Balanza Comercial mensual quedan manuales — ver
// indicatorsChf.ts para el detalle de cada decisión.
// CNY — se sincroniza desde chinadata.live, un agregador de terceros que
// republica datos de la NBS/GACC vía JSON sin key. La API oficial de la
// NBS (data.stats.gov.cn) bloquea con un WAF cualquier IP no china (403
// "UrlACL", verificado con curl real) — no se pudo usar directamente. Las
// 13 series están automatizadas (no hay ninguna manual para esta divisa) —
// ver indicatorsCny.ts para el detalle de cada una.
export const CNY_AUTO_INDICATOR_IDS = [
  'cny_cpi',
  'cny_cpi_yoy',
  'cny_ppi',
  'cny_ppi_yoy',
  'cny_retail_sales_yoy',
  'cny_industrial_output_yoy',
  'cny_fixed_asset_investment',
  'cny_pmi_manuf',
  'cny_pmi_non_manuf',
  'cny_pmi_composite',
  'cny_gdp_qoq',
  'cny_gdp_yoy',
  'cny_trade_balance',
];

export const CHF_AUTO_INDICATOR_IDS = [
  'chf_snb_rate',
  'chf_cpi',
  'chf_cpi_yoy',
  'chf_core_cpi',
  'chf_core_cpi_yoy',
  'chf_business_confidence',
  'chf_consumer_confidence',
  'chf_gdp_qoq',
  'chf_gdp_yoy',
];
