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
// 3. Australia migró de un CPI trimestral a un CPI mensual COMPLETO desde
//    nov-2025 — PERO la ABS sigue publicando el CPI/Trimmed Mean/Weighted
//    Median TRIMESTRALES en paralelo (tabla embebida dentro de cada
//    publicación mensual de marzo/junio/septiembre/diciembre), calculados
//    en base "pre-October 2025" (la metodología de recolección de antes
//    de la transición) — NO es una serie deprecada ni un dato viejo, es
//    un release oficial y vigente que la ABS sigue actualizando cada
//    trimestre. La serie mensual nueva (a/a) y la trimestral vieja
//    genuinamente NO reconcilian para el mismo trimestre (4.6% mensual vs
//    ~4.1% trimestral para marzo-2026) — son dos mediciones reales y
//    paralelas, no un error de una de las dos.
//
// 4. La Balanza Comercial (ABS "International Trade in Goods", dataflow
//    ITGS) es solo bienes (no bienes+servicios) — mismo alcance que GBP.
//
// 5. El RBA prioriza DOS medidas de inflación subyacente por igual desde
//    la actualización de metodología de oct-2025 — Trimmed Mean Y
//    Weighted Median — mismo patrón que CPI-trim/CPI-median en CAD. Se
//    agregan ambas.
//
// 6. **Decisión explícita del usuario (verificó su propia fuente de
//    referencia, un calendario económico tipo Investing.com, y preguntó
//    por qué no coincidía)**: aud_cpi/aud_cpi_yoy/aud_core_cpi/
//    aud_core_cpi_yoy/aud_weighted_median/aud_weighted_median_yoy usan la
//    base TRIMESTRAL "pre-October 2025" (frequency: 'quarterly'), NO la
//    mensual nueva — porque es la que efectivamente sigue la fuente de
//    referencia del usuario. La serie mensual nueva quedó sin agregar
//    como indicador aparte (se puede sumar si en algún momento se quiere
//    trackear ambas). Fuentes: dataflow `CPI` (TSEST=10, FREQ=Q) para el
//    headline — el a/a NO viene como medida directa ahí, se deriva del
//    índice de nivel (measure=1) comparando 4 trimestres atrás — y
//    dataflow `CPI_Q` (TSEST=20, FREQ=Q, INDEX=999902/999903) para
//    Trimmed Mean/Weighted Median, que sí publican t/t y a/a directo.
//    Verificado contra la captura del usuario para el Q1-2026: CPI a/a
//    4.10% (calculado, coincide), Trimmed Mean a/a 3.5%/t/t 0.8%
//    (coincide exacto), Weighted Median a/a 3.5%/t/t 0.8% (coincide
//    exacto).
//
// 7. PPI (Producer Price Indexes, Final Demand): dataflow PPI_FD,
//    trimestral, key MEASURE.INDEX.SOURCE.DESTINATION.FREQ con
//    INDEX=TOT/SOURCE=TOT/DESTINATION=TOTXE ("Total All Industries").
//    Verificado: 3.0% a/a para el primer trimestre de 2026.
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
  // Inflación — CPI TRIMESTRAL, base "pre-October 2025" (la que sigue
  // publicando la ABS cada trimestre dentro de la publicación mensual de
  // marzo/junio/septiembre/diciembre, y la que sigue la fuente de
  // referencia del usuario tipo Investing.com). Orden: cada medida va
  // t/t seguido de su a/a (no todos los t/t juntos y luego todos los
  // a/a) para que se lean emparejados en pantalla.
  {
    id: 'aud_cpi',
    label: 'CPI (Inflación al Consumidor, t/t)',
    shortLabel: 'CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (CPI trimestral, serie Original)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Variación trimestral del CPI de Australia (serie Original, base "pre-October 2025"). Verificado contra la fuente de referencia del usuario: +1.4% para el primer trimestre de 2026.',
  },
  {
    id: 'aud_cpi_yoy',
    label: 'CPI Interanual (a/a)',
    shortLabel: 'CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (CPI trimestral, serie Original)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description:
      'Variación del CPI respecto al mismo trimestre del año anterior. La ABS no publica esta tasa directo para la serie trimestral — se deriva del índice de nivel comparando 4 trimestres atrás. Verificado: 4.1% para el primer trimestre de 2026, coincide con la fuente de referencia del usuario. No coincide con el 4.6% que reporta la ABS para la serie MENSUAL nueva del mismo trimestre — son dos mediciones oficiales distintas que corren en paralelo, no un error de una de las dos.',
  },
  {
    id: 'aud_core_cpi',
    label: 'Core CPI — Trimmed Mean (t/t)',
    shortLabel: 'Core CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Trimmed Mean, base "pre-October 2025")',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Media recortada (Trimmed Mean) — una de las dos medidas de inflación subyacente que prioriza el RBA por igual, no "CPI ex alimentos y energía". Verificado: 0.8% t/t para el primer trimestre de 2026.',
  },
  {
    id: 'aud_core_cpi_yoy',
    label: 'Core CPI Interanual — Trimmed Mean (a/a)',
    shortLabel: 'Core CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Trimmed Mean, base "pre-October 2025")',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Trimmed Mean respecto al mismo trimestre del año anterior. Verificado: 3.5% para el primer trimestre de 2026, coincide con la fuente de referencia del usuario.',
  },
  {
    id: 'aud_weighted_median',
    label: 'Weighted Median (t/t)',
    shortLabel: 'W. Median',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Weighted Median, base "pre-October 2025")',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Mediana ponderada — la otra medida de inflación subyacente que prioriza el RBA, junto al Trimmed Mean. Verificado: 0.8% t/t para el primer trimestre de 2026.',
  },
  {
    id: 'aud_weighted_median_yoy',
    label: 'Weighted Median Interanual (a/a)',
    shortLabel: 'W. Median a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Weighted Median, base "pre-October 2025")',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Mediana ponderada respecto al mismo trimestre del año anterior. Verificado: 3.5% para el primer trimestre de 2026, coincide con la fuente de referencia del usuario.',
  },
  {
    id: 'aud_ppi_qoq',
    label: 'PPI (Precios al Productor, t/t)',
    shortLabel: 'PPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Producer Price Indexes, Final Demand)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/producer-price-indexes-australia/latest-release',
    goodDirection: 'neutral',
    description: 'Variación trimestral del índice de precios al productor (Final Demand, todas las industrias). Verificado: +0.4% para el primer trimestre de 2026.',
  },
  {
    id: 'aud_ppi_yoy',
    label: 'PPI Interanual (a/a)',
    shortLabel: 'PPI a/a',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Producer Price Indexes, Final Demand)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/producer-price-indexes-australia/latest-release',
    goodDirection: 'neutral',
    description: 'PPI respecto al mismo trimestre del año anterior. Verificado: +3.0% para el primer trimestre de 2026.',
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
    // Valor por defecto — el mes en curso suele ser el flash hasta que se
    // reemplaza por la final ~1 semana después (el selector Preliminar/
    // Final en Actualizar.tsx pisa esto por punto).
    releaseStage: 'preliminar',
  },
  // Subcomponentes del PMI (a pedido del usuario, mismo patrón en todas las
  // divisas): precios, producción, nuevas órdenes, empleo.
  {
    id: 'aud_pmi_manuf_new_orders',
    label: 'PMI Manufactura — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Australia. Carga manual.',
    parentId: 'aud_pmi_manuf',
  },
  {
    id: 'aud_pmi_manuf_production',
    label: 'PMI Manufactura — Producción',
    shortLabel: 'Producción',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Australia. Carga manual.',
    parentId: 'aud_pmi_manuf',
  },
  {
    id: 'aud_pmi_manuf_employment',
    label: 'PMI Manufactura — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Australia. Carga manual.',
    parentId: 'aud_pmi_manuf',
  },
  {
    id: 'aud_pmi_manuf_prices',
    label: 'PMI Manufactura — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Manufactura de Australia. Presión de precios en insumos. Carga manual.',
    parentId: 'aud_pmi_manuf',
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
    releaseStage: 'preliminar',
  },
  {
    id: 'aud_pmi_serv_new_orders',
    label: 'PMI Servicios — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Australia. Carga manual.',
    parentId: 'aud_pmi_serv',
  },
  {
    id: 'aud_pmi_serv_business_activity',
    label: 'PMI Servicios — Actividad de Negocios',
    shortLabel: 'Actividad de Negocios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Australia. Carga manual.',
    parentId: 'aud_pmi_serv',
  },
  {
    id: 'aud_pmi_serv_employment',
    label: 'PMI Servicios — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Australia. Carga manual.',
    parentId: 'aud_pmi_serv',
  },
  {
    id: 'aud_pmi_serv_prices',
    label: 'PMI Servicios — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Judo Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Servicios de Australia. Presión de precios en insumos. Carga manual.',
    parentId: 'aud_pmi_serv',
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
    id: 'aud_gdp_deflator',
    label: 'Deflactor del PIB',
    shortLabel: 'Deflactor PIB',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release',
    goodDirection: 'neutral',
    description: 'Medida de inflación implícita en el PIB de Australia. Subcomponente de PIB Trimestral. Carga manual.',
    parentId: 'aud_gdp_qoq',
  },
  {
    id: 'aud_gdp_consumption',
    label: 'PIB — Consumo',
    shortLabel: 'Consumo',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release',
    goodDirection: 'up',
    description: 'Contribución del consumo privado al crecimiento del PIB de Australia. Carga manual.',
    parentId: 'aud_gdp_qoq',
  },
  {
    id: 'aud_gdp_investment',
    label: 'PIB — Inversión',
    shortLabel: 'Inversión',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release',
    goodDirection: 'up',
    description: 'Contribución de la inversión (formación bruta de capital) al crecimiento del PIB de Australia. Carga manual.',
    parentId: 'aud_gdp_qoq',
  },
  {
    id: 'aud_gdp_government',
    label: 'PIB — Gasto Público',
    shortLabel: 'Gasto Público',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release',
    goodDirection: 'up',
    description: 'Contribución del gasto público al crecimiento del PIB de Australia. Carga manual.',
    parentId: 'aud_gdp_qoq',
  },
  {
    id: 'aud_gdp_net_exports',
    label: 'PIB — Exportaciones Netas',
    shortLabel: 'Export. Netas',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts/australian-national-accounts-national-income-expenditure-and-product/latest-release',
    goodDirection: 'up',
    description: 'Contribución de las exportaciones netas (exportaciones menos importaciones) al crecimiento del PIB de Australia. Carga manual.',
    parentId: 'aud_gdp_qoq',
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
