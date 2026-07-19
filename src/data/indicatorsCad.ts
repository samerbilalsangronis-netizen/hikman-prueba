import type { IndicatorMeta } from '../types';

// Indicadores de CAD. A diferencia de EUR/GBP (que partían de un Excel con
// histórico mensual propio), la planilla de origen (CAD_ENDO, compartida
// con JPY/AUD/CHF/NZD en un solo archivo, hoja "CAD" + "DECISIONES") solo
// traía un snapshot puntual (Reciente/Anterior/Más Alto/Más Bajo) con datos
// de 2025 — sin serie histórica utilizable para gráficos, y ya desactualizada.
// Se usó solo para identificar QUÉ indicadores importan y los pesos del
// score (hoja DECISIONES); el histórico completo y el valor actual se
// reconstruyeron desde cero directo de la fuente oficial (StatCan + Bank of
// Canada), verificando cada uno contra un dato real antes de automatizar.
//
// Lecciones de esta divisa (encontradas por el usuario, no en la
// verificación inicial — StatCan/BoC publican varias series "core"/CPI
// legítimas a la vez, y no alcanza con verificar contra una sola fuente):
//
// 1. El CPI m/m tiene DOS series oficiales válidas en StatCan — la
//    desestacionalizada (SA, tabla 18-10-0006, la que StatCan destaca en su
//    propio comunicado — 0.5% para mayo-2026) y la cruda (NSA, tabla
//    18-10-0004 — 1.0%, lo que reportan los agregadores tipo Trading
//    Economics). Se usa NSA en cad_cpi/cad_cpi_yoy.
//
// 2. Lo que agregadores llaman "Core CPI" NO es "CPI ex alimentos y
//    energía" (esa serie existe pero da otro número: 1.6% a/a) sino la
//    definición propia del Banco de Canadá — "CPI ex 8 componentes más
//    volátiles" (tabla 18-10-0256-01) — y encima con una mezcla NSA/SA
//    distinta por transform: el m/m matchea con la serie NSA (0.6%) pero el
//    a/a matchea con la SA (2.2%; la NSA da 2.1%, no coincide). Nunca
//    asumir que m/m y a/a del mismo concepto comparten la misma serie base.
//
// 3. El BoC en realidad mira más de cerca sus DOS medidas preferidas desde
//    2016 — CPI-trim y CPI-median (cad_cpi_trim/cad_cpi_median) — que el
//    "core CPI" genérico de arriba. Faltaban en la primera pasada; el BoC
//    las publica directo como tasa a/a (Valet: CPI_TRIM/CPI_MEDIAN), sin
//    necesidad de derivarlas de un índice.
export const CAD_INDICATORS: IndicatorMeta[] = [
  // Tasas / BoC — una sola tasa (overnight rate target), como la Fed y el BoE.
  {
    id: 'cad_boc_rate',
    label: 'Tasa Overnight del BoC',
    shortLabel: 'BoC Rate',
    section: 'tasas',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'area',
    currency: 'CAD',
    source: 'Bank of Canada (Valet: V39079)',
    sourceUrl: 'https://www.bankofcanada.ca/rates/interest-rates/canada-interest-rates/',
    goodDirection: 'neutral',
    description: 'Tasa objetivo del mercado a un día (overnight rate target) del Banco de Canadá — su tasa de referencia.',
  },
  // Inflación — serie SIN desestacionalizar (NSA, tabla 18-10-0004) de
  // StatCan. OJO: StatCan destaca en su propio comunicado ("The Daily") la
  // variación m/m de la serie desestacionalizada (SA, tabla 18-10-0006) —
  // para mayo-2026 daba 0.5%, un número real y oficial, pero NO es lo que
  // reportan los medios/Trading Economics como "CPI m/m" de Canadá (esos
  // usan la NSA, que dio 1.0% — verificado y corregido tras detectar la
  // discrepancia). Se usa NSA en las 4 series (m/m y a/a, headline y core)
  // para consistencia con la convención de mercado.
  {
    id: 'cad_cpi',
    label: 'CPI (Inflación al Consumidor, m/m)',
    shortLabel: 'CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 18-10-0004-01, sin desestacionalizar)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260622/dq260622a-eng.htm',
    goodDirection: 'neutral',
    description: 'Variación mensual del CPI de Canadá (serie NSA — la que reportan medios/Trading Economics). Verificado: 1.0% para mayo-2026.',
  },
  {
    id: 'cad_cpi_yoy',
    label: 'CPI Interanual (a/a)',
    shortLabel: 'CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 18-10-0004-01)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260622/dq260622a-eng.htm',
    goodDirection: 'neutral',
    description: 'Variación del CPI respecto al mismo mes del año anterior. Verificado: 3.2% calculado coincide con el dato oficial de mayo-2026.',
  },
  {
    id: 'cad_core_cpi',
    label: 'Core CPI (m/m)',
    shortLabel: 'Core CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 18-10-0256-01, definición BoC)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260622/dq260622a-eng.htm',
    goodDirection: 'neutral',
    description:
      'CPI subyacente de Canadá — "ex 8 componentes más volátiles" (definición del BoC, tabla 18-10-0256), NO "ex alimentos y energía" (esa es otra serie que no coincide con lo que reportan los agregadores). Verificado: 0.6% m/m para mayo-2026.',
  },
  {
    id: 'cad_core_cpi_yoy',
    label: 'Core CPI Interanual (a/a)',
    shortLabel: 'Core CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 18-10-0256-01, definición BoC)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260622/dq260622a-eng.htm',
    goodDirection: 'neutral',
    description:
      'CPI subyacente respecto al mismo mes del año anterior. A diferencia del resto de las series CAD, esta usa la versión desestacionalizada (SA) — es la que coincide con el dato de referencia (2.2% para mayo-2026); la NSA da 2.1%, no matchea.',
  },
  // Medidas de inflación subyacente preferidas del Banco de Canadá desde
  // 2016 (CPI-trim y CPI-median) — el BoC las mira más que el "core CPI"
  // clásico para calibrar política monetaria. BoC las publica directo como
  // tasa a/a (no hay que derivarlas de un índice).
  {
    id: 'cad_cpi_median',
    label: 'CPI-Median (a/a)',
    shortLabel: 'CPI-Median',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Bank of Canada (Valet: CPI_MEDIAN)',
    sourceUrl: 'https://www.bankofcanada.ca/rates/price-indexes/cpi/',
    goodDirection: 'neutral',
    description: 'Mediana ponderada de las variaciones de precios a/a de los componentes del CPI — una de las dos medidas de inflación subyacente que prioriza el BoC.',
  },
  {
    id: 'cad_cpi_trim',
    label: 'CPI-Trim (a/a)',
    shortLabel: 'CPI-Trim',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Bank of Canada (Valet: CPI_TRIM)',
    sourceUrl: 'https://www.bankofcanada.ca/rates/price-indexes/cpi/',
    goodDirection: 'neutral',
    description: 'Media recortada (excluye los componentes con variaciones más extremas) de las variaciones de precios a/a del CPI — la otra medida que prioriza el BoC.',
  },
  // Empleo
  {
    id: 'cad_unemployment',
    label: 'Tasa de Desempleo',
    shortLabel: 'Desempleo',
    section: 'empleo',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Statistics Canada (Labour Force Survey, tabla 14-10-0287-01)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260710/dq260710a-eng.htm',
    goodDirection: 'down',
    description: 'Tasa de desempleo de Canadá, serie desestacionalizada.',
  },
  {
    id: 'cad_employment_change',
    label: 'Cambios en el Empleo',
    shortLabel: 'Empleo',
    section: 'empleo',
    format: 'thousands',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (Labour Force Survey)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260710/dq260710a-eng.htm',
    goodDirection: 'up',
    description: 'Variación mensual del empleo total, en miles de personas.',
  },
  // Confianza — sin API pública (encuestas privadas, Conference Board of
  // Canada / Nanos), igual que el resto de las divisas.
  {
    id: 'cad_business_confidence',
    label: 'Confianza Empresarial',
    shortLabel: 'Conf. Empresarial',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Conference Board of Canada',
    sourceUrl: 'https://www.conferenceboard.ca/',
    goodDirection: 'up',
    description: 'Encuesta de confianza empresarial de Canadá. Sin API pública — carga manual.',
  },
  {
    id: 'cad_consumer_confidence',
    label: 'Confianza del Consumidor',
    shortLabel: 'Conf. Consumidor',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Conference Board of Canada',
    sourceUrl: 'https://www.conferenceboard.ca/',
    goodDirection: 'up',
    description: 'Encuesta de confianza del consumidor de Canadá. Sin API pública — carga manual.',
  },
  // Crecimiento — PMI van acá (actividad, no confianza pura).
  {
    id: 'cad_pmi_manuf',
    label: 'PMI Manufactura',
    shortLabel: 'PMI Manuf.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'PMI manufacturero de Canadá. >50 = expansión, <50 = contracción. Sin API pública — carga manual.',
  },
  {
    id: 'cad_pmi_serv',
    label: 'PMI Servicios',
    shortLabel: 'PMI Serv.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'PMI de servicios de Canadá. Sin API pública — carga manual.',
  },
  {
    id: 'cad_retail_sales',
    label: 'Ventas Minoristas (m/m)',
    shortLabel: 'Ventas Min.',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 20-10-0056-01)',
    sourceUrl: 'https://www150.statcan.gc.ca/en/subjects-start/retail_and_wholesale',
    goodDirection: 'up',
    description: 'Variación mensual de ventas minoristas totales de Canadá.',
  },
  {
    id: 'cad_retail_sales_yoy',
    label: 'Ventas Minoristas Interanual (a/a)',
    shortLabel: 'Ventas Min. a/a',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 20-10-0056-01)',
    sourceUrl: 'https://www150.statcan.gc.ca/en/subjects-start/retail_and_wholesale',
    goodDirection: 'up',
    description: 'Ventas minoristas respecto al mismo mes del año anterior.',
  },
  {
    id: 'cad_gdp_mom',
    label: 'PIB Mensual (m/m)',
    shortLabel: 'PIB m/m',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 36-10-0434-01)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260630/dq260630a-eng.htm',
    goodDirection: 'up',
    description: 'Canadá, como el Reino Unido, publica una estimación de PIB mensual (no solo trimestral).',
  },
  {
    id: 'cad_gdp_yoy',
    label: 'PIB Interanual (a/a)',
    shortLabel: 'PIB a/a',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 36-10-0434-01)',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260630/dq260630a-eng.htm',
    goodDirection: 'up',
    description: 'PIB real respecto al mismo mes del año anterior — la cifra de "PIB" usada en el score.',
  },
  {
    id: 'cad_trade_balance',
    label: 'Balanza Comercial',
    shortLabel: 'Balanza Com.',
    section: 'crecimiento',
    format: 'trade',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 12-10-0011-01)',
    sourceUrl: 'https://www150.statcan.gc.ca/en/subjects-start/international_trade',
    goodDirection: 'up',
    description: 'Balance de comercio internacional de mercancías de Canadá (base balanza de pagos, desestacionalizado). Positivo = superávit.',
  },
];
