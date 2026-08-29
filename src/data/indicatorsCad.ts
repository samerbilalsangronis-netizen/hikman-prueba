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
//
// 4. **Faltaba el PIB TRIMESTRAL (by income and expenditure) — distinto de
//    cad_gdp_mom de arriba**, que sale de la tabla MENSUAL por industria
//    (36-10-0434). investing.com muestra ambos por separado en el mismo
//    calendario (GDP MoM Y GDP QoQ/Annualized/YoY el mismo día, con
//    valores que NO coinciden entre sí — no es un error, son dos
//    metodologías distintas que StatCan reconcilia con el tiempo pero
//    difieren en el corto plazo, ej. verificado T2-2026: 2.0% a/a mensual
//    vs 1.13% a/a trimestral). A pedido del usuario (28-ago-2026), que
//    notó que la versión trimestral "a menudo no la veo porque sale cada
//    3 meses" — se agrega cad_gdp_qoq/cad_gdp_annualized_qoq, de la tabla
//    36-10-0104-01 ("Gross domestic product, expenditure-based, Canada,
//    quarterly"), que a diferencia de la mayoría de las tablas de StatCan
//    trae una dimensión "Prices" con el % de cambio YA CALCULADO (member
//    7, "Chained (2017) dollars percentage change") — no hace falta
//    derivar del nivel para el t/t. El anualizado sí se deriva del nivel
//    (member 1) con (1+t/t)^4−1, misma fórmula que JPY. Verificado contra
//    el comunicado oficial de hoy (dq260828a): PIB +0.8% t/t (coincide con
//    el % directo de la tabla), +3.3% anualizado (coincide con la tabla 3
//    del comunicado, "annualized change") — ambos coinciden exacto con
//    investing.com. De paso se automatiza cad_gdp_deflator (estaba de
//    carga manual, mal parentado a cad_gdp_mom) con la tabla de índices de
//    precios del PIB (36-10-0106-01, "Gross domestic product price
//    indexes"), miembro 25 ("Gross domestic product at market prices") —
//    esta tabla NO trae el % de cambio directo, se deriva del índice de
//    nivel (136.2 vs 132.9 en T1-2026 → +2.48%, redondea a 2.5%, coincide
//    exacto con investing.com Y con el "2.5%" que el propio comunicado
//    destaca como "el mayor aumento desde el T2-2022"). Los componentes
//    del gasto (Consumo/Inversión/Gasto Público/Exportaciones Netas) NO se
//    tocaron — siguen de carga manual, quedan parentados a cad_gdp_qoq en
//    vez de cad_gdp_mom (el error de parentado sí se corrigió, automatizar
//    esos 4 queda para otra sesión si hace falta).
//
//    Ronda siguiente (mismo día): el usuario pidió que la "PIB Interanual"
//    del score (cad_gdp_yoy) usara la métrica que coincide con
//    investing.com en vez de la mensual — se cambió su fuente a la misma
//    tabla trimestral (36-10-0104-01, nivel, 4 trimestres atrás) y se sacó
//    el cad_gdp_expenditure_yoy que se había agregado en la ronda anterior
//    (quedaba duplicado con este cambio). cad_gdp_mom sigue intacto,
//    sigue siendo la única serie que usa la tabla mensual por industria.
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
    source: 'Statistics Canada (tabla 18-10-0256-01, definición BoC)',
    sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810025601',
    goodDirection: 'neutral',
    description:
      'Mediana ponderada de las variaciones de precios a/a de los componentes del CPI — una de las dos medidas de inflación subyacente que prioriza el BoC. Se sincroniza desde StatCan (no del Valet del BoC, que publica el mismo número con rezago de hasta un día).',
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
    source: 'Statistics Canada (tabla 18-10-0256-01, definición BoC)',
    sourceUrl: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810025601',
    goodDirection: 'neutral',
    description:
      'Media recortada (excluye los componentes con variaciones más extremas) de las variaciones de precios a/a del CPI — la otra medida que prioriza el BoC. Se sincroniza desde StatCan (no del Valet del BoC, que publica el mismo número con rezago de hasta un día).',
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
  // Subcomponentes del PMI (a pedido del usuario, mismo patrón en todas las
  // divisas): precios, producción, nuevas órdenes, empleo.
  {
    id: 'cad_pmi_manuf_new_orders',
    label: 'PMI Manufactura — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Canadá. Carga manual.',
    parentId: 'cad_pmi_manuf',
  },
  {
    id: 'cad_pmi_manuf_production',
    label: 'PMI Manufactura — Producción',
    shortLabel: 'Producción',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Canadá. Carga manual.',
    parentId: 'cad_pmi_manuf',
  },
  {
    id: 'cad_pmi_manuf_employment',
    label: 'PMI Manufactura — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Canadá. Carga manual.',
    parentId: 'cad_pmi_manuf',
  },
  {
    id: 'cad_pmi_manuf_prices',
    label: 'PMI Manufactura — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Manufactura de Canadá. Presión de precios en insumos. Carga manual.',
    parentId: 'cad_pmi_manuf',
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
    id: 'cad_pmi_serv_new_orders',
    label: 'PMI Servicios — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Canadá. Carga manual.',
    parentId: 'cad_pmi_serv',
  },
  {
    id: 'cad_pmi_serv_business_activity',
    label: 'PMI Servicios — Actividad de Negocios',
    shortLabel: 'Actividad de Negocios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Canadá. Carga manual.',
    parentId: 'cad_pmi_serv',
  },
  {
    id: 'cad_pmi_serv_employment',
    label: 'PMI Servicios — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Canadá. Carga manual.',
    parentId: 'cad_pmi_serv',
  },
  {
    id: 'cad_pmi_serv_prices',
    label: 'PMI Servicios — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CAD',
    source: 'S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Servicios de Canadá. Presión de precios en insumos. Carga manual.',
    parentId: 'cad_pmi_serv',
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
  // PIB trimestral (by income and expenditure) — distinto del PIB mensual
  // de arriba (por industria). Ver lección 4.
  {
    id: 'cad_gdp_qoq',
    label: 'PIB Trimestral (t/t)',
    shortLabel: 'PIB t/t',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 36-10-0104-01, "Chained (2017) dollars percentage change")',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260828/dq260828a-eng.htm',
    goodDirection: 'up',
    description:
      'Crecimiento del PIB real, variación trimestral SIN anualizar — StatCan la publica ya calculada, no hace falta derivarla de un nivel. Verificado: +0.8% para el segundo trimestre de 2026, coincide exacto con el comunicado oficial e investing.com.',
  },
  {
    id: 'cad_gdp_annualized_qoq',
    label: 'PIB Trimestral Anualizado',
    shortLabel: 'PIB Anualizado',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 36-10-0104-01) — derivado',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260828/dq260828a-eng.htm',
    goodDirection: 'up',
    description:
      'La cifra "PIB Anualizado (t/t)" que muestra investing.com — qué pasaría si el ritmo de este trimestre se repitiera 4 trimestres seguidos ((1+t/t)^4−1, con el t/t sin redondear). Se deriva del mismo nivel real que cad_gdp_qoq. Verificado: +3.3% para el segundo trimestre de 2026, coincide exacto con la tabla 3 del comunicado oficial ("annualized change") e investing.com.',
    parentId: 'cad_gdp_qoq',
  },
  {
    id: 'cad_gdp_deflator',
    label: 'Deflactor del PIB (t/t)',
    shortLabel: 'Deflactor PIB',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 36-10-0106-01, "Implicit price indexes")',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260828/dq260828a-eng.htm',
    goodDirection: 'neutral',
    description:
      'Medida de inflación implícita en el PIB de Canadá, variación trimestral — "GDP Implicit Price (QoQ)" en investing.com. Se deriva del índice de nivel (StatCan no publica el % de cambio como serie directa para esta tabla, a diferencia de cad_gdp_qoq). Verificado: +2.5% para el segundo trimestre de 2026, coincide exacto con investing.com y con el comunicado oficial ("el mayor aumento desde el segundo trimestre de 2022").',
    parentId: 'cad_gdp_qoq',
  },
  {
    id: 'cad_gdp_consumption',
    label: 'PIB — Consumo',
    shortLabel: 'Consumo',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260630/dq260630a-eng.htm',
    goodDirection: 'up',
    description: 'Contribución del consumo privado al crecimiento del PIB de Canadá. Carga manual.',
    parentId: 'cad_gdp_qoq',
  },
  {
    id: 'cad_gdp_investment',
    label: 'PIB — Inversión',
    shortLabel: 'Inversión',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260630/dq260630a-eng.htm',
    goodDirection: 'up',
    description: 'Contribución de la inversión (formación bruta de capital) al crecimiento del PIB de Canadá. Carga manual.',
    parentId: 'cad_gdp_qoq',
  },
  {
    id: 'cad_gdp_government',
    label: 'PIB — Gasto Público',
    shortLabel: 'Gasto Público',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260630/dq260630a-eng.htm',
    goodDirection: 'up',
    description: 'Contribución del gasto público al crecimiento del PIB de Canadá. Carga manual.',
    parentId: 'cad_gdp_qoq',
  },
  {
    id: 'cad_gdp_net_exports',
    label: 'PIB — Exportaciones Netas',
    shortLabel: 'Export. Netas',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CAD',
    source: 'Statistics Canada',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260630/dq260630a-eng.htm',
    goodDirection: 'up',
    description: 'Contribución de las exportaciones netas (exportaciones menos importaciones) al crecimiento del PIB de Canadá. Carga manual.',
    parentId: 'cad_gdp_qoq',
  },
  {
    id: 'cad_gdp_yoy',
    label: 'PIB Interanual (a/a)',
    shortLabel: 'PIB a/a',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'CAD',
    source: 'Statistics Canada (tabla 36-10-0104-01) — derivado',
    sourceUrl: 'https://www150.statcan.gc.ca/n1/daily-quotidien/260828/dq260828a-eng.htm',
    goodDirection: 'up',
    description:
      'PIB real (by income and expenditure) respecto al mismo trimestre del año anterior — la cifra de "PIB" usada en el score. A pedido del usuario (28-ago-2026) pasó a usar la métrica trimestral que coincide con investing.com (antes salía de la tabla MENSUAL por industria, 36-10-0434, que da otro número — ver lección 4). Se deriva del nivel (StatCan no la publica como serie directa). Verificado: +1.13% para el segundo trimestre de 2026, coincide exacto con investing.com.',
    parentId: 'cad_gdp_qoq',
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
