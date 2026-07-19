import type { IndicatorMeta } from '../types';

// Indicadores de AUD. Mismo criterio que CAD: la hoja "AUD" del Excel
// compartido (CAD/JPY/AUD/CHF/NZD) solo traía un snapshot puntual
// (Reciente/Anterior/Más Alto/Más Bajo) con datos de 2025 sin serie
// histórica utilizable — se usó solo para identificar QUÉ indicadores
// importan y los pesos del score (hoja DECISIONES); histórico y valor
// actual se reconstruyeron desde cero desde RBA + ABS, verificando cada
// serie contra el comunicado oficial Y contra lo que reportan agregadores
// (Trading Economics/prensa) antes de automatizar.
//
// Lecciones de esta divisa:
//
// 1. ABS discontinuó "Retail Trade, Australia" tras jun-2025 — el
//    reemplazo oficial es el "Monthly Household Spending Indicator"
//    (Business Indicators, Australia). Se usa MHSI en aud_retail_sales*
//    (mismo rol que "ventas minoristas" en el resto de las divisas, aunque
//    el nombre oficial de la fuente sea otro).
//
// 2. El "Core CPI" de referencia para Australia es el Trimmed Mean (media
//    recortada) — la medida de inflación subyacente que el propio RBA
//    destaca en sus comunicados y que usan los agregadores, no un "CPI ex
//    alimentos y energía" genérico (Australia ni siquiera publica esa
//    definición como serie estándar).
//
// 3. Australia migró de un CPI trimestral a un CPI mensual COMPLETO recién
//    en nov-2025. La serie mensual nueva (que sí matchea contra prensa:
//    4.6% a/a marzo-2026, 4.0% a/a mayo-2026 — verificado) NO es una
//    resampleada de la serie trimestral histórica: encadenar el índice
//    trimestral legado da un a/a de ~4.1% para el mismo trimestre, no
//    4.6% — un quiebre real de metodología, no redondeo. Por eso
//    aud_cpi/aud_cpi_yoy/aud_core_cpi/aud_core_cpi_yoy tienen historia
//    corta (desde 2024-05 m/m, desde 2025-04 a/a) en vez de los 15-20 años
//    del resto de las divisas — empalmar la serie trimestral vieja habría
//    sido más historia pero un dato falso.
//
// 4. La Balanza Comercial (ABS "International Trade in Goods", dataflow
//    ITGS) es solo bienes (no bienes+servicios) — mismo alcance que GBP.
export const AUD_INDICATORS: IndicatorMeta[] = [
  // Tasas / RBA — una sola tasa (cash rate target), como la Fed/BoE/BoC.
  {
    id: 'aud_rba_rate',
    label: 'Cash Rate del RBA',
    shortLabel: 'RBA Rate',
    section: 'tasas',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'area',
    currency: 'AUD',
    source: 'Reserve Bank of Australia (tabla F1.1, serie FIRMMCRT)',
    sourceUrl: 'https://www.rba.gov.au/statistics/cash-rate/',
    goodDirection: 'neutral',
    description: 'Tasa objetivo de efectivo (cash rate target) del RBA — su tasa de referencia.',
  },
  // Inflación — CPI mensual completo (metodología nueva desde nov-2025).
  {
    id: 'aud_cpi',
    label: 'CPI (Inflación al Consumidor, m/m)',
    shortLabel: 'CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (CPI mensual, serie Original)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Variación mensual del CPI de Australia (serie Original, sin desestacionalizar). Verificado: -0.7% para mayo-2026.',
  },
  {
    id: 'aud_core_cpi',
    label: 'Core CPI — Trimmed Mean (m/m)',
    shortLabel: 'Core CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Trimmed Mean, desestacionalizado)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Media recortada (Trimmed Mean) — la medida de inflación subyacente que prioriza el RBA, no "CPI ex alimentos y energía". Verificado: 0.4% m/m para mayo-2026.',
  },
  {
    id: 'aud_cpi_yoy',
    label: 'CPI Interanual (a/a)',
    shortLabel: 'CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (CPI mensual, serie Original)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Variación del CPI respecto al mismo mes del año anterior. Verificado: 4.0% para mayo-2026 (bajando de 4.2% en abril).',
  },
  {
    id: 'aud_core_cpi_yoy',
    label: 'Core CPI Interanual — Trimmed Mean (a/a)',
    shortLabel: 'Core CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Trimmed Mean, desestacionalizado)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Trimmed Mean respecto al mismo mes del año anterior — la medida de inflación subyacente que más mira el RBA. Verificado: 3.6% para mayo-2026.',
  },
  // Empleo
  {
    id: 'aud_unemployment',
    label: 'Tasa de Desempleo',
    shortLabel: 'Desempleo',
    section: 'empleo',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Labour Force Survey, desestacionalizado)',
    sourceUrl: 'https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release',
    goodDirection: 'down',
    description: 'Tasa de desempleo de Australia, serie desestacionalizada. Verificado: 4.4% para mayo-2026.',
  },
  {
    id: 'aud_employment_change',
    label: 'Cambios en el Empleo',
    shortLabel: 'Empleo',
    section: 'empleo',
    format: 'thousands',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Labour Force Survey, desestacionalizado)',
    sourceUrl: 'https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release',
    goodDirection: 'up',
    description: 'Variación mensual del empleo total, en miles de personas. Verificado: +40.3k para mayo-2026.',
  },
  // Confianza — sin API pública (encuestas privadas, NAB / Westpac-Melbourne
  // Institute), igual que el resto de las divisas.
  {
    id: 'aud_business_confidence',
    label: 'Confianza Empresarial',
    shortLabel: 'Conf. Empresarial',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'NAB Business Survey',
    sourceUrl: 'https://business.nab.com.au/category/nab-monthly-business-survey/',
    goodDirection: 'up',
    description: 'Encuesta de confianza empresarial de NAB. Sin API pública — carga manual.',
  },
  {
    id: 'aud_consumer_confidence',
    label: 'Confianza del Consumidor',
    shortLabel: 'Conf. Consumidor',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'Westpac-Melbourne Institute',
    sourceUrl: 'https://www.westpaciq.com.au/economics/category/consumer-sentiment',
    goodDirection: 'up',
    description: 'Índice de sentimiento del consumidor Westpac-Melbourne Institute. Sin API pública — carga manual.',
  },
  // Crecimiento — PMI van acá (actividad, no confianza pura).
  {
    id: 'aud_pmi_manuf',
    label: 'PMI Manufactura',
    shortLabel: 'PMI Manuf.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'PMI manufacturero de Australia. >50 = expansión, <50 = contracción. Sin API pública — carga manual.',
  },
  {
    id: 'aud_pmi_serv',
    label: 'PMI Servicios',
    shortLabel: 'PMI Serv.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'PMI de servicios de Australia. Sin API pública — carga manual.',
  },
  {
    id: 'aud_retail_sales',
    label: 'Ventas Minoristas (m/m)',
    shortLabel: 'Ventas Min.',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'ABS Monthly Household Spending Indicator (sucesor de Retail Trade, discontinuada jun-2025)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/finance/monthly-household-spending-indicator/latest-release',
    goodDirection: 'up',
    description: 'Variación mensual del gasto de los hogares — reemplazo oficial de "Retail Trade" desde jul-2025. Verificado: +1.3% para mayo-2026.',
  },
  {
    id: 'aud_retail_sales_yoy',
    label: 'Ventas Minoristas Interanual (a/a)',
    shortLabel: 'Ventas Min. a/a',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'ABS Monthly Household Spending Indicator',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/finance/monthly-household-spending-indicator/latest-release',
    goodDirection: 'up',
    description: 'Gasto de los hogares respecto al mismo mes del año anterior. Verificado: +5.5% para mayo-2026.',
  },
  {
    id: 'aud_gdp_qoq',
    label: 'PIB Trimestral (t/t)',
    shortLabel: 'PIB t/t',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (National Accounts)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release',
    goodDirection: 'up',
    description: 'Crecimiento del PIB real, variación trimestral SIN anualizar (a diferencia de EE.UU.). Verificado: +0.3% para el primer trimestre de 2026.',
  },
  {
    id: 'aud_gdp_yoy',
    label: 'PIB Interanual (a/a)',
    shortLabel: 'PIB a/a',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (National Accounts)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release',
    goodDirection: 'up',
    description: 'PIB real respecto al mismo trimestre del año anterior — la cifra de "PIB" usada en el score. Verificado: +2.5% para el primer trimestre de 2026.',
  },
  {
    id: 'aud_trade_balance',
    label: 'Balanza Comercial',
    shortLabel: 'Balanza Com.',
    section: 'crecimiento',
    format: 'trade',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (International Trade in Goods, desestacionalizado)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/international-trade/international-trade-goods/latest-release',
    goodDirection: 'up',
    description: 'Balance de comercio internacional de bienes de Australia (no incluye servicios, igual que GBP). Verificado: -$3.02B (déficit) para mayo-2026.',
  },
];
