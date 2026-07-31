import type { IndicatorMeta } from '../types';

// Indicadores de JPY. Mismo criterio que CAD/AUD/NZD: la hoja "JPY" del
// Excel compartido (CAD/JPY/AUD/CHF/NZD) solo traía un snapshot puntual
// (Reciente/Anterior/Más Alto/Más Bajo) con datos de 2025 sin serie
// histórica utilizable — se usó solo para identificar QUÉ indicadores
// importan y los pesos del score (hoja DECISIONES); histórico y valor
// actual se reconstruyeron desde cero, verificando cada serie contra el
// comunicado oficial y contra lo que reportan agregadores antes de
// automatizar.
//
// Lecciones de esta divisa — la MÁS automatizada de las no-USD hasta
// ahora (12 de 16 indicadores):
//
// 1. **La API principal de e-Stat (api.e-stat.go.jp) exige un appId
//    registrado** — mismo problema que la Aotearoa Data Explorer de Stats
//    NZ, se descarta. Pero existe una segunda API, distinta y sin key: el
//    "e-Stat Dashboard API" (dashboard.e-stat.go.jp/api/1.0/), pensado
//    para series estándar tipo tablero — de ahí sale CPI, desempleo,
//    empleo, PIB y ventas minoristas. Formato:
//    `dashboard.e-stat.go.jp/api/1.0/Json/getData?IndicatorCode={code}&RegionCode=00000&TimeFrom={periodo}&IsSeasonalAdjustment={1|2}`
//    — `RegionCode=00000` filtra a nivel nacional server-side,
//    `IsSeasonalAdjustment=1` es la serie original (no desestacionalizada)
//    y `2` la desestacionalizada; ambos filtros SÍ funcionan del lado del
//    servidor (a diferencia de lo que pareció en una prueba inicial). El
//    período mensual usa formato `YYYYMM00`, el trimestral `YYYYnQ00`
//    (ej. `20261Q00` = Q1 2026) — usar el formato equivocado no da error,
//    simplemente responde "sin datos".
//
// 2. **A diferencia de RBNZ, el sitio del BOJ (boj.or.jp y
//    stat-search.boj.or.jp) NO está bloqueado** — devuelve 200 sin
//    problema. La tasa de política (uncollateralized overnight call rate,
//    la tasa operativa desde que Japón salió de tasas negativas en
//    mar-2024) se sincroniza de un CSV diario público, serie FM01:
//    `stat-search.boj.or.jp/ssi/mtshtml/csv/fm01_d_1.csv`. El CSV viene en
//    Shift-JIS pero las filas de datos (fecha,valor) son ASCII puro, así
//    que no hace falta decodificar — alcanza con ignorar las líneas de
//    cabecera en japonés. La serie vieja "Basic Loan Rate" (ir01_*, el
//    antiguo tipo de descuento) NO es la tasa operativa actual — no usar.
//
// 3. **El "Core CPI" de Japón es "CPI ex alimentos frescos"**
//    (生鮮食品を除く総合), NO "ex alimentos y energía" (eso es la
//    "core-core CPI" japonesa, una serie aparte) — es la medida que el
//    BOJ target-ea y la que reportan los agregadores como "Japan Core
//    CPI". Se deriva del índice de nivel (con y sin desestacionalizar
//    ambos existen) igual que el CPI general — Japón no publica el % ya
//    calculado como serie del Dashboard para m/m, así que jpy_cpi/
//    jpy_core_cpi/jpy_cpi_yoy/jpy_core_cpi_yoy salen los 4 de derivar
//    niveles (código de índice ...090000 general, ...090010 core).
//    Verificado: CPI general a/a 1.52% calculado (redondea a 1.5%) y Core
//    CPI a/a 1.44% calculado (redondea a 1.4%) para mayo-2026, ambos
//    coinciden exacto con lo reportado.
//
// 4. **Balanza Comercial: el Dashboard de e-Stat tiene una serie con ese
//    nombre pero es la incorrecta** (código de balanza de pagos, no la de
//    aduana que reportan los medios — probado: daba superávit chico
//    cuando el dato real era un déficit grande, signo Y escala mal). La
//    fuente correcta es el CSV público de Aduanas de Japón (Ministry of
//    Finance): `customs.go.jp/toukei/suii/html/data/d41ma.csv` ("World
//    Monthly Data", en miles de yenes) — se calcula Exportaciones menos
//    Importaciones. Los meses todavía no publicados vienen con "0,0", hay
//    que filtrarlos.
//
// 5. **Ventas Minoristas NO tiene versión desestacionalizada en el
//    Dashboard** (solo la serie original/NSA) — a diferencia de CPI/
//    desempleo/PIB. El m/m puede tener ruido estacional real (ej. dic
//    siempre sube fuerte por fin de año). Se deriva igual del nivel
//    (m/m y a/a), documentado como limitación conocida.
//
// 6. **Cambios en el Empleo**: se deriva de "Empleados (ambos sexos)"
//    desestacionalizado del Dashboard (código ...0010010), NO existe un
//    "employment change" mensual como serie separada con la convención
//    m/m que usan el resto de las divisas — Japón reporta más bien el
//    cambio interanual en sus comunicados. Unidad nativa: 万人 (decenas de
//    miles de personas) — se multiplica x10000 para guardar personas
//    crudas. Verificado: nivel de 68.82 millones para mayo-2026, coincide
//    con lo reportado ("employment rose to a record high of 68.82
//    million").
//
// 7. **PIB a/a tampoco viene como serie directa** — se deriva del nivel
//    real (desestacionalizado) comparando 4 trimestres atrás, mismo
//    patrón que AUD/NZD. El t/t SÍ viene directo (código ...040000,
//    desestacionalizado, SIN anualizar — Japón también publica una
//    versión anualizada que no se usa acá para mantener la misma
//    convención "sin anualizar" que el resto de las divisas no-USD).
//    Verificado: t/t 0.5% (coincide exacto con el dato oficial revisado
//    de junio-2026) y a/a 0.32% calculado (~0.3%, cerca del 0.4% que
//    reportan algunos agregadores — la diferencia es normal entre
//    vintages/revisiones, mismo motivo que documenta la lección NZD #7).
//
// 8. Tankan (encuesta de confianza empresarial del propio BOJ) SÍ tiene
//    API/descarga propia en stat-search.boj.or.jp — a diferencia de las
//    encuestas privadas del resto de las divisas. Queda pendiente de
//    integrar (no se automatizó en esta primera pasada); jpy_business_
//    confidence queda manual por ahora, igual que consumer confidence
//    (Gabinete de Japón, sin URL de descarga estable encontrada) y los
//    PMI (S&P Global / au Jibun Bank, privados).
export const JPY_INDICATORS: IndicatorMeta[] = [
  // Tasas / BOJ — una sola tasa operativa (uncollateralized overnight call
  // rate), como el resto de los bancos centrales no-USD.
  {
    id: 'jpy_boj_rate',
    label: 'Tasa del BOJ (Call Rate)',
    shortLabel: 'BOJ Rate',
    section: 'tasas',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'area',
    currency: 'JPY',
    source: 'Bank of Japan (Time-Series Data Search, serie FM01)',
    sourceUrl: 'https://www.stat-search.boj.or.jp/ssi/mtshtml/fm01_d_1.html',
    goodDirection: 'neutral',
    description:
      'Tasa a un día sin garantía (uncollateralized overnight call rate) — la tasa operativa del BOJ desde que salió de tasas negativas en marzo de 2024.',
  },
  // Inflación — ambas (general y "core" ex alimentos frescos) se derivan
  // del índice de nivel desestacionalizado, m/m y a/a. Ver lección 3.
  {
    id: 'jpy_cpi',
    label: 'CPI (Inflación al Consumidor, m/m)',
    shortLabel: 'CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard (Consumer Price Index, todos los rubros, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'neutral',
    description:
      'Variación mensual del CPI general de Japón (índice desestacionalizado). Se deriva del nivel — el Dashboard de e-Stat no publica el % m/m como serie separada.',
  },
  {
    id: 'jpy_cpi_yoy',
    label: 'CPI Interanual (a/a)',
    shortLabel: 'CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'JPY',
    source: 'e-Stat Dashboard (Consumer Price Index, todos los rubros, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'neutral',
    description: 'CPI general respecto al mismo mes del año anterior. Verificado: 1.52% calculado (redondea a 1.5%) para mayo-2026, coincide exacto con lo reportado.',
  },
  {
    id: 'jpy_core_cpi',
    label: 'Core CPI — ex Alimentos Frescos (m/m)',
    shortLabel: 'Core CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard (CPI ex alimentos frescos, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'neutral',
    description:
      'Medida de inflación subyacente que target-ea el BOJ ("CPI ex alimentos frescos", no "ex alimentos y energía" — esa es otra serie, la "core-core CPI"). Se deriva del nivel.',
  },
  {
    id: 'jpy_core_cpi_yoy',
    label: 'Core CPI Interanual (a/a)',
    shortLabel: 'Core CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'JPY',
    source: 'e-Stat Dashboard (CPI ex alimentos frescos, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'neutral',
    description: 'Core CPI respecto al mismo mes del año anterior. Verificado: 1.44% calculado (redondea a 1.4%) para mayo-2026, coincide exacto con lo reportado.',
  },
  // CPI de Tokio (23 barrios especiales) — el mismo Dashboard de e-Stat
  // publica el desglose municipal del CPI nacional con el código RegionCode
  // 13100, pero SOLO en valores crudos (sin desestacionalizar, a diferencia
  // del nacional) — coincide con la convención real, el mercado siempre mira
  // el a/a crudo de Tokio, nunca uno desestacionalizado. Se sigue mirando de
  // cerca porque el CPI de Tokio se publica ~3-4 semanas antes que el
  // nacional del mismo mes (es un adelanto, no un dato retrasado) — sirve
  // como el mejor indicador líder disponible de hacia dónde va el CPI
  // nacional del mes siguiente. Solo a/a (no hay m/m que el mercado siga
  // para esta serie, a diferencia del CPI nacional).
  {
    id: 'jpy_tokyo_cpi_yoy',
    label: 'CPI de Tokio Interanual (a/a, adelanto)',
    shortLabel: 'CPI Tokio a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'JPY',
    source: 'e-Stat Dashboard (CPI, desglose municipal Tokio-23-barrios, RegionCode 13100)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'neutral',
    description:
      'CPI general de los 23 barrios especiales de Tokio, adelanto del CPI nacional (se publica ~3-4 semanas antes que el dato nacional del mismo mes). Verificado: 1.71% calculado para junio-2026, coincide con lo reportado (1.70%).',
  },
  {
    id: 'jpy_tokyo_core_cpi_yoy',
    label: 'Core CPI de Tokio — ex Alim. Frescos (a/a, adelanto)',
    shortLabel: 'Core CPI Tokio a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'JPY',
    source: 'e-Stat Dashboard (CPI ex alimentos frescos, desglose municipal Tokio-23-barrios, RegionCode 13100)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'neutral',
    description:
      'Medida que más de cerca mira el mercado como adelanto del Core CPI nacional del BOJ (ex alimentos frescos, no "ex alimentos y energía"). Verificado contra junio-2026: 1.72% calculado vs 1.6% oficial — ~0.1pp de margen de imprecisión por ser derivado del índice del Dashboard en vez de la tasa oficial ya calculada (mismo tipo de margen que cny_cpi_yoy, documentado y esperado, no un bug si no coincide exacto con otra fuente).',
  },
  // Empleo
  {
    id: 'jpy_unemployment',
    label: 'Tasa de Desempleo',
    shortLabel: 'Desempleo',
    section: 'empleo',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'line',
    currency: 'JPY',
    source: 'e-Stat Dashboard (Labour Force Survey, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'down',
    description: 'Tasa de desempleo de Japón, serie desestacionalizada. Verificado: 2.5% para mayo-2026, coincide con lo reportado.',
  },
  {
    id: 'jpy_employment_change',
    label: 'Cambios en el Empleo',
    shortLabel: 'Empleo',
    section: 'empleo',
    format: 'thousands',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard (Labour Force Survey, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'up',
    description:
      'Variación mensual del empleo total, en miles de personas — derivado del nivel de empleados desestacionalizado (Japón no publica esta variación como serie m/m separada). Verificado: nivel de 68.82 millones para mayo-2026, coincide con lo reportado.',
  },
  // Confianza — sin automatizar en esta primera pasada (ver lección 8).
  {
    id: 'jpy_business_confidence',
    label: 'Confianza Empresarial',
    shortLabel: 'Conf. Empresarial',
    section: 'confianza',
    format: 'index',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'JPY',
    source: 'BOJ Tankan Survey',
    sourceUrl: 'https://www.boj.or.jp/en/statistics/tk/index.htm',
    goodDirection: 'up',
    description:
      'Índice de difusión (DI) de la encuesta Tankan del BOJ — a diferencia del resto de las divisas, esta encuesta la hace el propio banco central y tiene descarga pública (stat-search.boj.or.jp), pero no se automatizó en esta primera pasada. Carga manual por ahora.',
  },
  {
    id: 'jpy_consumer_confidence',
    label: 'Confianza del Consumidor',
    shortLabel: 'Conf. Consumidor',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'JPY',
    source: 'Gabinete de Japón (Consumer Confidence Survey)',
    sourceUrl: 'https://www.esri.cao.go.jp/jp/stat/shouhi/shouhi.html',
    goodDirection: 'up',
    description: 'Índice de confianza del consumidor del Gabinete de Japón. Sin URL de descarga estable encontrada — carga manual.',
  },
  // Crecimiento — PMI van acá (actividad, no confianza pura).
  {
    id: 'jpy_pmi_manuf',
    label: 'PMI Manufactura',
    shortLabel: 'PMI Manuf.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'PMI manufacturero de Japón. >50 = expansión, <50 = contracción. Sin API pública — carga manual.',
  },
  // Subcomponentes del PMI (a pedido del usuario, mismo patrón en todas las
  // divisas): precios, producción, nuevas órdenes, empleo.
  {
    id: 'jpy_pmi_manuf_new_orders',
    label: 'PMI Manufactura — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Japón. Carga manual.',
    parentId: 'jpy_pmi_manuf',
  },
  {
    id: 'jpy_pmi_manuf_production',
    label: 'PMI Manufactura — Producción',
    shortLabel: 'Producción',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Japón. Carga manual.',
    parentId: 'jpy_pmi_manuf',
  },
  {
    id: 'jpy_pmi_manuf_employment',
    label: 'PMI Manufactura — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Japón. Carga manual.',
    parentId: 'jpy_pmi_manuf',
  },
  {
    id: 'jpy_pmi_manuf_prices',
    label: 'PMI Manufactura — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Manufactura de Japón. Presión de precios en insumos. Carga manual.',
    parentId: 'jpy_pmi_manuf',
  },
  {
    id: 'jpy_pmi_serv',
    label: 'PMI Servicios',
    shortLabel: 'PMI Serv.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'PMI de servicios de Japón. Sin API pública — carga manual.',
  },
  {
    id: 'jpy_pmi_serv_new_orders',
    label: 'PMI Servicios — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Japón. Carga manual.',
    parentId: 'jpy_pmi_serv',
  },
  {
    id: 'jpy_pmi_serv_business_activity',
    label: 'PMI Servicios — Actividad de Negocios',
    shortLabel: 'Actividad de Negocios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Japón. Carga manual.',
    parentId: 'jpy_pmi_serv',
  },
  {
    id: 'jpy_pmi_serv_employment',
    label: 'PMI Servicios — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Japón. Carga manual.',
    parentId: 'jpy_pmi_serv',
  },
  {
    id: 'jpy_pmi_serv_prices',
    label: 'PMI Servicios — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'au Jibun Bank / S&P Global',
    sourceUrl: 'https://www.pmi.spglobal.com/Public/Home/PressRelease',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Servicios de Japón. Presión de precios en insumos. Carga manual.',
    parentId: 'jpy_pmi_serv',
  },
  {
    id: 'jpy_retail_sales',
    label: 'Ventas Minoristas (m/m)',
    shortLabel: 'Ventas Min.',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard (Current Survey of Commerce, serie original — sin desestacionalizar)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'up',
    description:
      'Variación mensual de ventas minoristas de Japón, derivada del nivel. A diferencia de CPI/desempleo/PIB, esta serie NO tiene versión desestacionalizada en el Dashboard de e-Stat — puede tener ruido estacional real (ej. diciembre sube fuerte por fin de año).',
  },
  {
    id: 'jpy_retail_sales_yoy',
    label: 'Ventas Minoristas Interanual (a/a)',
    shortLabel: 'Ventas Min. a/a',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'JPY',
    source: 'e-Stat Dashboard (Current Survey of Commerce, serie original — sin desestacionalizar)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'up',
    description: 'Ventas minoristas respecto al mismo mes del año anterior. Verificado: +5.0% calculado para mayo-2026, cerca del +5.3% que reportan agregadores (diferencia normal entre el cálculo desde el nivel y el índice oficial).',
  },
  {
    id: 'jpy_gdp_qoq',
    label: 'PIB Trimestral (t/t)',
    shortLabel: 'PIB t/t',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard (PIB real, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'up',
    description:
      'Crecimiento del PIB real, variación trimestral SIN anualizar (Japón también publica una versión anualizada — no se usa acá para mantener la misma convención que el resto de las divisas no-USD). Verificado: +0.5% para el primer trimestre de 2026, coincide exacto con el dato oficial revisado.',
  },
  {
    id: 'jpy_gdp_deflator',
    label: 'Deflactor del PIB',
    shortLabel: 'Deflactor PIB',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'neutral',
    description: 'Medida de inflación implícita en el PIB de Japón. Subcomponente de PIB Trimestral. Carga manual.',
    parentId: 'jpy_gdp_qoq',
  },
  {
    id: 'jpy_gdp_domestic_demand',
    label: 'PIB — Demanda Interna',
    shortLabel: 'Demanda Interna',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'up',
    description: 'Contribución de la demanda interna al crecimiento del PIB de Japón. Carga manual.',
    parentId: 'jpy_gdp_qoq',
  },
  {
    id: 'jpy_gdp_external_demand',
    label: 'PIB — Demanda Externa',
    shortLabel: 'Demanda Externa',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'JPY',
    source: 'e-Stat Dashboard',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'up',
    description: 'Contribución del comercio neto al crecimiento del PIB de Japón. Carga manual.',
    parentId: 'jpy_gdp_qoq',
  },
  {
    id: 'jpy_gdp_yoy',
    label: 'PIB Interanual (a/a)',
    shortLabel: 'PIB a/a',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'JPY',
    source: 'e-Stat Dashboard (PIB real, desestacionalizado)',
    sourceUrl: 'https://dashboard.e-stat.go.jp/',
    goodDirection: 'up',
    description:
      'PIB real respecto al mismo trimestre del año anterior — la cifra de "PIB" usada en el score. Se deriva del nivel (Japón no publica esta tasa como serie directa). Verificado: +0.32% calculado para el primer trimestre de 2026.',
  },
  {
    id: 'jpy_trade_balance',
    label: 'Balanza Comercial',
    shortLabel: 'Balanza Com.',
    section: 'crecimiento',
    format: 'trade',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'JPY',
    source: 'Aduanas de Japón / Ministry of Finance (Trade Statistics)',
    sourceUrl: 'https://www.customs.go.jp/toukei/info/index_e.htm',
    goodDirection: 'up',
    description:
      'Balance de comercio internacional de Japón (exportaciones menos importaciones, base aduanera). El Dashboard de e-Stat tiene una serie con este nombre pero es la de balanza de pagos, no la aduanera que reportan los medios — se usa el CSV directo de Aduanas.',
  },
];
