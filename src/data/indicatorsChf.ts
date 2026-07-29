import type { IndicatorMeta } from '../types';

// Indicadores de CHF. Mismo criterio que CAD/AUD/NZD/JPY: la hoja "CHF" del
// Excel compartido (CAD/JPY/AUD/CHF/NZD) solo traía un snapshot puntual
// (Reciente/Anterior/Más Alto/Más Bajo, datos de 2025) sin serie histórica
// utilizable — se usó solo para identificar QUÉ indicadores importan y los
// pesos del score (hoja DECISIONES); histórico y valor actual se
// reconstruyeron desde cero, verificando cada serie contra el comunicado
// oficial y contra lo que reportan agregadores antes de automatizar.
//
// Lecciones de esta divisa — 9 de 16 indicadores automáticos, la mejor
// proporción de todas las no-USD hasta ahora:
//
// 1. **SNB Data Portal (data.snb.ch)**: API REST sin key, NO bloqueada
//    (a diferencia de rbnz.govt.nz). Formato:
//    `data.snb.ch/api/cube/{cubeId}/data/json/en` — cada cubo trae una o
//    más series bajo `timeseries[].header[0].dimItem`. La tasa de política
//    vive en el cubo `snboffzisa` (dimItem "Switzerland - SNB policy rate"),
//    mensual, verificado 0.0% para jun-2026 (coincide con el comunicado del
//    18-jun-2026). El CPI general vive en `plkopr` (nivel de índice, para
//    derivar m/m) + `plkoprinfla` (tasa a/a oficial ya calculada, dimItem
//    "SFSO - Inflation according to the national consumer price index",
//    miembro TLK) — verificado 0.45% calculado → redondea a 0.5% a/a para
//    jun-2026, coincide con lo reportado. El Core CPI (definición SFSO
//    "Kernanflation 1" — la que efectivamente reportan los agregadores como
//    "Swiss Core CPI", NO es "ex alimentos y energía" per se sino la
//    definición propia del SFSO) sale del mismo patrón: nivel de índice en
//    `plkoprex` (miembro K1) para m/m + tasa a/a directa en `plkoprinfla`
//    (miembro K1) — verificado 0.3% a/a para jun-2026, coincide exacto.
//
// 2. **PIB y Balanza Comercial: SECO publica un feed CSV plano en
//    scheduler.swissdatas.ch** (encontrado en el HTML de
//    seco.admin.ch/en/gross-domestic-product, no documentado en ningún
//    lado — hay que raspar el link directo). El PIB real (serie
//    `gdp,real,cssa` — calendario+estacional+eventos deportivos ajustado,
//    la convención que SECO destaca en sus propios comunicados) se deriva
//    del nivel para t/t y a/a: verificado +0.44% t/t para Q1-2026 (coincide
//    con "GDP grew by 0.4%" reportado). **OJO**: ese mismo feed trae una
//    fila `trade_balance` pero es la del cálculo de cuentas nacionales
//    (bienes+servicios, base trimestral, ~CHF 15-30bn/trimestre) — NO es la
//    balanza comercial mensual de Aduanas (BAZG) que reportan los medios
//    (~CHF 4-6bn/mes, solo bienes) — mismo tipo de trampa que la lección
//    JPY #4 (nombre de serie coincide pero es un concepto distinto). No se
//    encontró un endpoint público estable para la cifra mensual de BAZG en
//    esta primera pasada — `chf_trade_balance` queda manual.
//
// 3. **Confianza Empresarial = KOF Economic Barometer** (KOF Swiss Economic
//    Institute, ETH Zúrich) — el indicador líder que Trading Economics
//    reporta como "Switzerland Business Confidence". API v2 pública sin key:
//    `tsdb-api.kof.ethz.ch/v2/ts?keys=ch.kof.barometer&mime=csv&access_type=public`.
//    Verificado: 101.2 calculado para jun-2026, coincide exacto con "KOF
//    Barometer... level of 101.2" reportado.
//
// 4. **Confianza del Consumidor = índice trimestral de SECO**
//    (Konsumentenstimmungsindex), vía el mismo tipo de feed swissdatas.ch
//    (encontrado en seco.admin.ch/en/consumer-sentiment): serie
//    `ks_i62_index_q` (csa), trimestral. Verificado: -41.1 calculado para
//    Q2-2026, cerca del "-40" reportado por prensa especializada (diferencia
//    normal de redondeo/revisión, mismo patrón que la lección NZD #7 sobre
//    vintages de PIB).
//
// 5. **No se encontró fuente automatizable confiable para Desempleo,
//    Cambios en el Empleo, Ventas Minoristas ni la Balanza Comercial
//    mensual**: SECO publica la tasa de desempleo mensual solo vía
//    amstat.ch (dashboard sin API descubierta) y PDFs; el FRED de "Registered
//    Unemployment" para Suiza está discontinuado desde dic-2023; el de
//    "Retail Trade: Value" está discontinuado desde nov-2023; el de
//    "Trade Balance: Commodities" tiene ~3 meses de rezago real (abr-2026
//    como último dato con el sistema ya en jul-2026, verificado contra el
//    dato real de jun-2026 que sí existía en prensa) — mismo patrón de "200
//    OK pero desactualizado" que motivó descartar FRED para GBP/CAD. Los
//    PMI (procure.ch) son de una asociación privada sin API pública, igual
//    que en el resto de las divisas. Los 6 quedan manuales.
export const CHF_INDICATORS: IndicatorMeta[] = [
  // Tasas / SNB — una sola tasa oficial, como el resto de los bancos
  // centrales no-USD.
  {
    id: 'chf_snb_rate',
    label: 'Tasa del SNB',
    shortLabel: 'SNB Rate',
    section: 'tasas',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'area',
    currency: 'CHF',
    source: 'SNB Data Portal (cubo snboffzisa, SNB policy rate)',
    sourceUrl: 'https://data.snb.ch/en/topics/snb/cube/snboffzisa',
    goodDirection: 'neutral',
    description: 'Tasa de política del Banco Nacional Suizo. Verificado: 0.0% para jun-2026, coincide con el comunicado del 18-jun-2026.',
  },
  // Inflación — headline y core (definición SFSO "Kernanflation 1"), cada
  // una con su m/m (derivado del nivel de índice) seguido de su a/a (tasa
  // oficial, ya calculada por el SNB Data Portal).
  {
    id: 'chf_cpi',
    label: 'CPI (Inflación al Consumidor, m/m)',
    shortLabel: 'CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CHF',
    source: 'SNB Data Portal (cubo plkopr, índice nacional)',
    sourceUrl: 'https://data.snb.ch/en/topics/uvo/cube/plkopr',
    goodDirection: 'neutral',
    description: 'Variación mensual del CPI general de Suiza, derivada del índice de nivel.',
  },
  {
    id: 'chf_cpi_yoy',
    label: 'CPI Interanual (a/a)',
    shortLabel: 'CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CHF',
    source: 'SNB Data Portal (cubo plkoprinfla, SFSO inflation según el índice nacional)',
    sourceUrl: 'https://data.snb.ch/en/topics/uvo/cube/plkoprinfla',
    goodDirection: 'neutral',
    description: 'CPI general respecto al mismo mes del año anterior — tasa oficial del SFSO. Verificado: 0.5% para jun-2026, coincide exacto.',
  },
  {
    id: 'chf_core_cpi',
    label: 'Core CPI (m/m)',
    shortLabel: 'Core CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CHF',
    source: 'SNB Data Portal (cubo plkoprex, Core inflation 1)',
    sourceUrl: 'https://data.snb.ch/en/topics/uvo/cube/plkoprex',
    goodDirection: 'neutral',
    description: 'CPI subyacente según la definición "Kernanflation 1" del SFSO (la que reportan los agregadores como "Swiss Core CPI"), derivado del índice de nivel.',
  },
  {
    id: 'chf_core_cpi_yoy',
    label: 'Core CPI Interanual (a/a)',
    shortLabel: 'Core CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CHF',
    source: 'SNB Data Portal (cubo plkoprinfla, SFSO Core inflation 1)',
    sourceUrl: 'https://data.snb.ch/en/topics/uvo/cube/plkoprinfla',
    goodDirection: 'neutral',
    description: 'Core CPI respecto al mismo mes del año anterior. Verificado: 0.3% para jun-2026, coincide exacto con lo reportado.',
  },
  // Empleo — sin fuente automatizable confiable encontrada (ver lección 5).
  {
    id: 'chf_unemployment',
    label: 'Tasa de Desempleo',
    shortLabel: 'Desempleo',
    section: 'empleo',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CHF',
    source: 'SECO (amstat.ch)',
    sourceUrl: 'https://www.amstat.ch/',
    goodDirection: 'down',
    description: 'Tasa de desempleo registrado de Suiza (definición SECO). Sin API pública encontrada — carga manual.',
  },
  {
    id: 'chf_employment_change',
    label: 'Cambios en el Empleo',
    shortLabel: 'Empleo',
    section: 'empleo',
    format: 'thousands',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CHF',
    source: 'BFS (Statistik der Beschäftigten, STATEM)',
    sourceUrl: 'https://www.bfs.admin.ch/bfs/en/home/statistics/work-income/labour-market/labour-market-indicators/employment-indicators-total-economy.html',
    goodDirection: 'up',
    description: 'Variación trimestral del empleo total en Suiza. Sin fuente automatizable encontrada en esta primera pasada — carga manual.',
  },
  // Confianza
  {
    id: 'chf_business_confidence',
    label: 'Confianza Empresarial',
    shortLabel: 'Conf. Empresarial',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CHF',
    source: 'KOF Swiss Economic Institute (ETH Zúrich) — KOF Economic Barometer',
    sourceUrl: 'https://kof.ethz.ch/en/forecasts-and-indicators/indicators/kof-economic-barometer.html',
    goodDirection: 'up',
    description:
      'Barómetro de coyuntura del KOF, el indicador líder que se reporta como "Business Confidence" de Suiza. Verificado: 101.2 para jun-2026, coincide exacto con lo reportado.',
  },
  {
    id: 'chf_consumer_confidence',
    label: 'Confianza del Consumidor',
    shortLabel: 'Conf. Consumidor',
    section: 'confianza',
    format: 'index',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'CHF',
    source: 'SECO (Konsumentenstimmungsindex)',
    sourceUrl: 'https://www.seco.admin.ch/en/consumer-sentiment',
    goodDirection: 'up',
    description: 'Índice trimestral de confianza del consumidor de SECO. Verificado: -41.1 calculado para el segundo trimestre de 2026, cerca del -40 reportado por prensa especializada.',
  },
  // Crecimiento — PMI van acá (actividad, no confianza pura).
  {
    id: 'chf_pmi_manuf',
    label: 'PMI Manufactura',
    shortLabel: 'PMI Manuf.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CHF',
    source: 'procure.ch',
    sourceUrl: 'https://www.procure.ch/de/leistungen/pmi.html',
    goodDirection: 'up',
    description: 'PMI manufacturero de Suiza. >50 = expansión, <50 = contracción. Sin API pública — carga manual.',
  },
  {
    id: 'chf_pmi_serv',
    label: 'PMI Servicios',
    shortLabel: 'PMI Serv.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CHF',
    source: 'procure.ch',
    sourceUrl: 'https://www.procure.ch/de/leistungen/pmi.html',
    goodDirection: 'up',
    description: 'PMI de servicios de Suiza. Sin API pública — carga manual.',
  },
  {
    id: 'chf_retail_sales',
    label: 'Ventas Minoristas (m/m)',
    shortLabel: 'Ventas Min.',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CHF',
    source: 'BFS (Detailhandelsumsatzindex)',
    sourceUrl: 'https://www.bfs.admin.ch/bfs/en/home/statistics/industry-services/retail-trade.html',
    goodDirection: 'up',
    description: 'Variación mensual del índice de ventas minoristas de Suiza. Sin fuente automatizable encontrada en esta primera pasada — carga manual.',
  },
  {
    id: 'chf_retail_sales_yoy',
    label: 'Ventas Minoristas Interanual (a/a)',
    shortLabel: 'Ventas Min. a/a',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CHF',
    source: 'BFS (Detailhandelsumsatzindex)',
    sourceUrl: 'https://www.bfs.admin.ch/bfs/en/home/statistics/industry-services/retail-trade.html',
    goodDirection: 'up',
    description: 'Ventas minoristas respecto al mismo mes del año anterior. Carga manual.',
  },
  {
    id: 'chf_gdp_qoq',
    label: 'PIB Trimestral (t/t)',
    shortLabel: 'PIB t/t',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CHF',
    source: 'SECO (PIB real, ajustado por calendario, estacionalidad y eventos deportivos)',
    sourceUrl: 'https://www.seco.admin.ch/en/gross-domestic-product',
    goodDirection: 'up',
    description:
      'Crecimiento del PIB real de Suiza, variación trimestral (serie "cssa" — la convención que SECO destaca en sus comunicados). Verificado: +0.4% para el primer trimestre de 2026, coincide exacto con lo reportado.',
  },
  {
    id: 'chf_gdp_yoy',
    label: 'PIB Interanual (a/a)',
    shortLabel: 'PIB a/a',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'CHF',
    source: 'SECO (PIB real, ajustado por calendario, estacionalidad y eventos deportivos)',
    sourceUrl: 'https://www.seco.admin.ch/en/gross-domestic-product',
    goodDirection: 'up',
    description: 'PIB real de Suiza respecto al mismo trimestre del año anterior — la cifra de "PIB" usada en el score. Se deriva del nivel (SECO no lo publica como serie directa en este feed).',
  },
  {
    id: 'chf_trade_balance',
    label: 'Balanza Comercial',
    shortLabel: 'Balanza Com.',
    section: 'crecimiento',
    format: 'trade',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CHF',
    source: 'BAZG / Swiss-Impex (Administración Federal de Aduanas)',
    sourceUrl: 'https://www.bazg.admin.ch/en/swiss-foreign-trade-statistics-total-exports-imports',
    goodDirection: 'up',
    description:
      'Balance de comercio internacional de Suiza, solo bienes (exportaciones menos importaciones), base aduanera — la cifra mensual que reportan los medios. El feed de PIB de SECO trae una serie con el mismo nombre pero es la trimestral de cuentas nacionales (bienes+servicios), un concepto distinto — no usarla acá (ver lección 2). Carga manual.',
  },
];
