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
//
// 8. **Decisión explícita del usuario (ago-2026), revisando este tablero
//    contra el de su profesor de fundamentales**: se sacaron aud_cpi
//    (t/t), aud_cpi_yoy (a/a) y aud_cpi_monthly (m/m) — quedan solo las
//    subyacentes trimestrales (Trimmed Mean/Weighted Median, ver lección
//    6) y aud_cpi_monthly_yoy como referencia de headline. Además se
//    confirmó contra la API de la ABS que la Trimmed Mean TAMBIÉN tiene
//    una versión mensual a/a dentro del mismo dataflow 'CPI' (v2.0.0,
//    INDEX=999902, no el CPI_Q usado para la trimestral) — es la medida
//    que usa el tablero del profesor del usuario como "subyacente" mes a
//    mes. Se agregó como aud_core_cpi_monthly_yoy, solo el a/a (no se
//    pidió el m/m, aunque también existe en la API con MEASURE=2).
//
// 9. **Wage Price Index — a pedido del usuario (ago-2026), se verificó si
//    la API lo tenía disponible antes de agregarlo.** Dataflow `WPI`,
//    key MEASURE.INDEX.SECTOR.INDUSTRY.TSEST.REGION.FREQ. Trampa: el
//    índice "titular" que reporta la prensa es THRPEB ("Total hourly
//    rates of pay excluding bonuses"), NO OHRPEB ("Ordinary time hourly
//    rates") — probado primero con OHRPEB porque aparece primero en el
//    codelist (CL_WPI_PCI, orden 10), pero esa combinación NO tiene datos
//    desestacionalizados (TSEST=20) vía la API, solo "Original" — con
//    Original daba +0.6% t/t para el T2-2026, que NO coincide con el
//    comunicado oficial desestacionalizado (+0.8% t/t / +3.2% a/a). Con
//    THRPEB + TSEST=20 sí está disponible y coincide exacto.
//
// 10. **Confianza del Consumidor Westpac-Melbourne Institute — a pedido
//     del usuario (ago-2026), se verificó si la API lo tenía disponible
//     antes de agregar el histórico.** Es una encuesta PRIVADA (Westpac +
//     Melbourne Institute), no un dato de la ABS/RBA — no vive en ninguna
//     API pública: ni ABS Data API (no es estadística oficial de
//     gobierno), ni RBA (no la republica), ni FRED (solo tiene proxies de
//     la OCDE — "Composite Consumer Confidence" — que NO son la serie
//     real). El histórico completo (desde 1974) requiere una suscripción
//     paga al Melbourne Institute. Queda de carga manual — se reconstruyó
//     a mano un tramo reciente (jun-2024 aislado + mar-2025 a jun-2026
//     continuo, 17 puntos) desde los boletines públicos gratuitos que
//     Westpac sí publica cada mes (PDF) y coberturas de prensa
//     especializada, verificando cada punto por consistencia de %m/m
//     encadenado entre múltiples fuentes independientes.
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
  // Inflación — a pedido del usuario (ago-2026) se sacaron del tablero el
  // CPI trimestral headline (aud_cpi/_yoy) y el CPI Mensual m/m
  // (aud_cpi_monthly): quedan solo las medidas subyacentes (Trimmed
  // Mean/Weighted Median, trimestrales) y el CPI Mensual Interanual
  // (aud_cpi_monthly_yoy) como referencia de headline. Si hace falta la
  // serie trimestral original para comparar contra otra fuente, están en
  // el historial de git (borradas, no reemplazadas por nada).
  {
    id: 'aud_cpi_monthly_yoy',
    label: 'CPI Mensual Interanual (a/a)',
    shortLabel: 'CPI Mensual a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Monthly CPI Indicator, cobertura completa desde oct-2025)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/monthly-consumer-price-index-indicator/latest-release',
    goodDirection: 'neutral',
    description:
      'CPI Mensual respecto al mismo mes del año anterior — la cifra que reporta la ABS en su comunicado ("CPI rose X% in the year to..."). Verificado: 4.6% marzo-2026, 4.0% mayo-2026. Medida "primaria" de inflación de Australia desde oct-2025.',
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
  // Trimmed Mean MENSUAL — igual que el CPI headline, la ABS también
  // publica el a/a de la Trimmed Mean dentro del mismo CPI Mensual
  // (dataflow 'CPI' v2.0.0, no CPI_Q), un dato paralelo al trimestral de
  // arriba. Solo se agrega la medida interanual (a pedido del usuario,
  // ago-2026) — no el m/m, que sí existe en la API pero no se pidió.
  {
    id: 'aud_core_cpi_monthly_yoy',
    label: 'Core CPI Mensual Interanual — Trimmed Mean (a/a)',
    shortLabel: 'Core CPI Mensual a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Monthly CPI Indicator, cobertura completa desde oct-2025)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/monthly-consumer-price-index-indicator/latest-release',
    goodDirection: 'neutral',
    description:
      'Media recortada (Trimmed Mean) del CPI Mensual respecto al mismo mes del año anterior — la misma medida subyacente que aud_core_cpi_yoy, pero calculada mes a mes en vez de por trimestre. Verificado contra la API de la ABS: 3.3%/3.2%/3.3%/3.1%/3.0%/2.8% en los últimos meses cargados.',
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
  {
    id: 'aud_wage_price_index',
    label: 'Wage Price Index (t/t)',
    shortLabel: 'WPI',
    section: 'empleo',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Wage Price Index, total hourly rates excl. bonos, desestacionalizado)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/wage-price-index-australia/latest-release',
    goodDirection: 'up',
    description:
      'El índice salarial titular de Australia — mide la variación trimestral de las tasas de pago por hora (total, excluyendo bonos), desestacionalizado. Automatizado — ver lección 7. Verificado: +0.8% t/t para el segundo trimestre de 2026, coincide exacto con el comunicado oficial del ABS.',
  },
  {
    id: 'aud_wage_price_index_yoy',
    label: 'Wage Price Index Interanual (a/a)',
    shortLabel: 'WPI a/a',
    section: 'empleo',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'AUD',
    source: 'Australian Bureau of Statistics (Wage Price Index, total hourly rates excl. bonos, desestacionalizado)',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/wage-price-index-australia/latest-release',
    goodDirection: 'up',
    description:
      'Wage Price Index respecto al mismo trimestre del año anterior — la cifra de "crecimiento salarial anual" que suele citar la prensa. Automatizado — ver lección 7. Verificado: +3.2% a/a para el segundo trimestre de 2026, coincide exacto con el comunicado oficial del ABS.',
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
    description:
      'Encuesta mensual de confianza empresarial de NAB (~350 empresas). Sin API pública — carga manual. Verificado: -6 puntos para julio-2026 (cayó desde -29 en marzo-2026, el segundo mayor desplome mensual de la serie).',
  },
  // Segundo índice headline de la misma encuesta NAB — condiciones ACTUALES
  // (compuesto de trading, rentabilidad y empleo), a diferencia de Confianza
  // que son expectativas a futuro. NAB no publica un índice mensual separado
  // llamado "Business Expectations"; este es el que casi toda la prensa
  // financiera reporta junto a Confidence como el par headline de la encuesta.
  {
    id: 'aud_business_conditions',
    label: 'Condiciones de Negocios',
    shortLabel: 'Cond. Negocios',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'AUD',
    source: 'NAB Business Survey',
    sourceUrl: 'https://business.nab.com.au/category/nab-monthly-business-survey/',
    goodDirection: 'up',
    description:
      'Índice de condiciones actuales (trading, rentabilidad, empleo) de la misma encuesta mensual de NAB. Sin API pública — carga manual. Verificado: +4 puntos para julio-2026.',
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
    description:
      'Índice de sentimiento del consumidor Westpac-Melbourne Institute. Encuesta privada, sin API pública — carga manual, ver lección 10. Histórico reconstruido a mano desde los boletines públicos de Westpac y prensa especializada, verificado por consistencia de %m/m entre fuentes.',
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
