import type { IndicatorMeta } from '../types';

// Indicadores de NZD. Mismo criterio que CAD/AUD: la hoja "NZD" del Excel
// compartido (CAD/JPY/AUD/CHF/NZD) solo traía un snapshot puntual
// (Reciente/Anterior/Más Alto/Más Bajo) con datos de 2025 sin serie
// histórica utilizable — se usó solo para identificar QUÉ indicadores
// importan y los pesos del score (hoja DECISIONES); histórico y valor
// actual se reconstruyeron desde cero desde Stats NZ, verificando cada
// serie contra el comunicado oficial y contra lo que reportan agregadores
// (FXStreet/investinglive) antes de automatizar.
//
// Lecciones de esta divisa — la más manual de las 5 no-USD hasta ahora:
//
// 1. **rbnz.govt.nz está completamente bloqueado para fetch automatizado**
//    — todo el dominio (incluida la portada) devuelve HTTP 403 (Cloudflare
//    bot management), confirmado tanto con curl (headers de navegador
//    reales) como con la propia herramienta WebFetch. Esto bloquea el
//    Official Cash Rate, el tipo de cambio/TWI y cualquier otra serie del
//    banco central — quedan sin fuente automatizable. Como el RBNZ decide
//    la tasa solo 7-8 veces al año, nzd_ocr_rate queda de carga manual
//    (mismo criterio que las encuestas privadas del resto de las divisas).
//
// 2. **Stats NZ tiene DOS caminos de acceso, uno bloqueado y otro
//    abierto**: la API nueva "Aotearoa Data Explorer" (SDMX,
//    api.data.stats.govt.nz) exige una subscription key obtenida por
//    registro manual (portal.apis.stats.govt.nz) — se descarta, igual que
//    se descartó la "ABS Indicator API" para AUD. En cambio, los CSV de
//    cada publicación trimestral/mensual (carpeta "Download-data" de cada
//    /information-releases/) son públicos y sin key, con un patrón de URL
//    predecible por fecha de release: `Consumers-price-index-{Mes}-{Año}-
//    quarter/.../consumers-price-index-{mes}-{año}-quarter-index-numbers.csv`
//    (mismo patrón para GDP y Electronic Card Transactions). Se prueba el
//    trimestre/mes actual y se retrocede si todavía no salió el release
//    (ver `fetchLatestQuarterly`/`fetchLatestMonthly` en nzd-sync.ts).
//
// 3. **El desempleo/empleo (HLFS) NO se automatiza** pese a que Stats NZ sí
//    publica un CSV con los códigos correctos (HLFQ.S1F3S = tasa de
//    desempleo, HLFQ.S1A3S = empleados) — verificado manualmente que el
//    ZIP trae ~400MB de CSV sin comprimir (todos los cruces por
//    edad/sexo/región/industria en un solo archivo) para extraer 2
//    números. Descomprimir eso dentro de una función serverless es fràgil
//    (riesgo real de memoria/timeout) para un dato trimestral — se prefiere
//    carga manual antes que una automatización poco confiable.
//
// 4. **La Balanza Comercial (Overseas Merchandise Trade) solo se publica en
//    XLSX**, no en CSV plano (a diferencia de CPI/GDP/ECT) — con una
//    estructura de encabezados multi-fila que hace la extracción
//    automática bastante más frágil que el resto. Queda de carga manual.
//
// 5. **"Ventas Minoristas" usa Electronic Card Transactions (ECT), no el
//    Retail Trade Survey trimestral** — ECT es mensual, desestacionalizado,
//    y es la cifra que efectivamente sigue el mercado como "NZ Retail
//    Sales" (el RTS trimestral es menos seguido). Serie ECTM.S19S2PC
//    ("RTS core industries", desestacionalizado) publica el m/m directo; el
//    a/a se deriva del nivel (ECTM.S19S2) comparando 12 meses atrás.
//
// 6. El CPI a/a se deriva del nivel (CPIQ.SE9A, "CPI All Groups") — Stats
//    NZ no publica el a/a como serie separada en el CSV de index numbers.
//    Verificado: 4.06% calculado para el segundo trimestre de 2026,
//    coincide con lo reportado por agregadores (~4.1%).
//
// 7. El PIB (Total GDP, chain-volume, desestacionalizado) también se
//    deriva de un nivel (serie SG01RSC00B01 del CSV de visualización) —
//    igual que AUD. Verificado: +0.8% t/t para el primer trimestre de 2026,
//    coincide con el dato oficial ("GDP rose 0.8 percent in the March 2026
//    quarter").
//
// 8. **"Ventas Minoristas" tenía DOS series igual de oficiales en el mismo
//    Electronic Card Transactions de Stats NZ — "RTS core industries"
//    (ECTM.S19S2/S19S2PC) y "RTS total industries" (ECTM.S19S1PC m/m,
//    ECTM.S19A1AC a/a ya calculado por Stats NZ)**. investing.com/la
//    prensa siguen la de TOTAL, no la core — confirmado 18-ago-2026:
//    julio-2026 core daba +2.2% m/m / +3.1% a/a, pero investing.com
//    mostraba +1.3% m/m / +3.4% a/a, coincide exacto con "total
//    industries". Se agregó nzd_retail_sales_total(_yoy) primero al lado
//    de la "core" existente, y a pedido del usuario (18-ago-2026) se
//    sacó la "core" del todo — "Ventas Minoristas con Tarjeta de
//    Crédito" (nzd_retail_sales_total/_yoy, mismo nombre que usa
//    investing.com) es ahora la única serie de ventas minoristas de NZD.
//
// 9. **El PPI (Producers Price Index) — a pedido del usuario (ago-2026),
//    se verificó si la API lo tenía disponible antes de agregarlo.**
//    FRED solo tiene proxies de la OCDE para manufactura (ej.
//    PIEAMP01NZQ661N, "Manufacturing: Total") — no el índice titular de
//    toda la economía ("Outputs, All Industries") que reporta la prensa/
//    investing.com. Stats NZ integró el PPI (junto con CGPI y FEPI) en el
//    release trimestral "Business price indexes" desde el T1-2015, pero a
//    diferencia de CPI/GDP/ECT, este release SOLO se publica en XLSX (sin
//    CSV) — mismo motivo que dejó la Balanza Comercial manual (lección 4),
//    con el agravante de que cada archivo trae una ventana móvil de solo 9
//    trimestres (hay que combinar varios releases para el histórico
//    completo). Queda de carga manual. Histórico 2016 T1–2026 T1 (41
//    trimestres) reconstruido a mano desde 5 releases oficiales de Stats NZ
//    (Tabla "Outputs, All Industries", ref. SQU900000), verificado: +0.8%
//    t/t para el primer trimestre de 2026, coincide exacto con el
//    comunicado oficial ("The output producers price index (PPI) rose 0.8
//    percent in the March 2026 quarter").
export const NZD_INDICATORS: IndicatorMeta[] = [
  // Tasas / RBNZ — una sola tasa (Official Cash Rate), como el resto de los
  // bancos centrales no-USD. Sin fuente automatizable (ver lección 1) —
  // carga manual, el RBNZ solo decide 7-8 veces al año.
  {
    id: 'nzd_ocr_rate',
    label: 'Official Cash Rate del RBNZ',
    shortLabel: 'OCR',
    section: 'tasas',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'area',
    currency: 'NZD',
    source: 'Reserve Bank of New Zealand',
    sourceUrl: 'https://www.rbnz.govt.nz/monetary-policy/about-monetary-policy/the-official-cash-rate',
    goodDirection: 'neutral',
    description:
      'Tasa objetivo (Official Cash Rate) del RBNZ — su tasa de referencia. rbnz.govt.nz bloquea todo fetch automatizado (Cloudflare, HTTP 403 en todo el dominio) — carga manual, igual que las encuestas privadas.',
  },
  // Inflación — CPI trimestral (único que publica Nueva Zelanda, no hay
  // dato mensual como AUD/CAD).
  {
    id: 'nzd_cpi',
    label: 'CPI (Inflación al Consumidor, t/t)',
    shortLabel: 'CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ (Consumers Price Index, "All Groups")',
    sourceUrl: 'https://www.stats.govt.nz/topics/consumers-price-index/',
    goodDirection: 'neutral',
    description: 'Variación trimestral del CPI de Nueva Zelanda ("All Groups"). Verificado: +1.5% para el segundo trimestre de 2026.',
  },
  {
    id: 'nzd_cpi_yoy',
    label: 'CPI Interanual (a/a)',
    shortLabel: 'CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'NZD',
    source: 'Stats NZ (Consumers Price Index, "All Groups")',
    sourceUrl: 'https://www.stats.govt.nz/topics/consumers-price-index/',
    goodDirection: 'neutral',
    description:
      'Variación del CPI respecto al mismo trimestre del año anterior. Stats NZ no publica esta tasa directo — se deriva del índice de nivel comparando 4 trimestres atrás. Verificado: 4.06% para el segundo trimestre de 2026, coincide con lo reportado por agregadores (~4.1%).',
  },
  {
    id: 'nzd_ppi',
    label: 'PPI (Índice de Precios al Productor, t/t)',
    shortLabel: 'PPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ (Producers Price Index, Outputs — All Industries, ref. SQU900000)',
    sourceUrl: 'https://www.stats.govt.nz/methods/producers-price-index-weights/',
    goodDirection: 'neutral',
    description:
      'Variación trimestral del PPI de salida (Outputs) de Nueva Zelanda, todas las industrias. Stats NZ solo publica este release en XLSX (sin CSV) con ventana móvil de 9 trimestres por archivo — carga manual, ver lección 9. Verificado: +0.8% para el primer trimestre de 2026, coincide con el comunicado oficial.',
  },
  {
    id: 'nzd_ppi_yoy',
    label: 'PPI Interanual (a/a)',
    shortLabel: 'PPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'NZD',
    source: 'Stats NZ (Producers Price Index, Outputs — All Industries, ref. SQU900000)',
    sourceUrl: 'https://www.stats.govt.nz/methods/producers-price-index-weights/',
    goodDirection: 'neutral',
    description:
      'PPI de salida respecto al mismo trimestre del año anterior. Stats NZ publica esta tasa ya calculada en el mismo release. Carga manual — ver lección 9. Verificado: +2.2% para el primer trimestre de 2026.',
  },
  // Empleo — HLFS trimestral. Sin automatizar (ver lección 3) — carga
  // manual.
  //
  // Los 5 indicadores de esta sección (Desempleo, Cambios en el Empleo,
  // Participación, Índice de Costes Laborales t/t y a/a) se recargaron de
  // punta a punta el 5-ago-2026 tomando como fuente el propio calendario
  // económico de referencia del usuario (investing.com, mismo feed que
  // replica mql5.com/en/economic-calendar/new-zealand/...) en vez de
  // reconstruir cada serie por separado desde Stats NZ — el usuario reportó
  // que los números no coincidían con lo que ve en su herramienta y pidió
  // exactitud, así que la fuente de la verdad pasó a ser el propio
  // calendario. Histórico completo 2014 T1 – 2026 T2 (50 trimestres),
  // valores "como se publicaron" en su momento (no re-revisados
  // retroactivamente en trimestres viejos, mismo criterio que muestra el
  // propio calendario). OJO: el Índice de Costes Laborales de investing.com
  // mide "salary and wage rates, EXCLUDING overtime" — una serie distinta
  // a la que Stats NZ reporta como titular en sus comunicados de prensa
  // ("including overtime", la que se había cargado antes con el Public
  // Service Commission y no coincidía con el usuario) — confirmado
  // explícitamente en la propia página de definición de investing.com.
  {
    id: 'nzd_unemployment',
    label: 'Tasa de Desempleo',
    shortLabel: 'Desempleo',
    section: 'empleo',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'NZD',
    source: 'Stats NZ (Household Labour Force Survey) — vía investing.com/mql5',
    sourceUrl: 'https://www.investing.com/economic-calendar/employment-change-93',
    goodDirection: 'down',
    description:
      'Tasa de desempleo de Nueva Zelanda, serie desestacionalizada. Stats NZ solo publica el CSV completo del HLFS dentro de un ZIP de ~400MB sin comprimir — poco práctico de automatizar. Carga manual. Histórico 2014 T1–2026 T2 tomado del calendario económico de referencia del usuario (investing.com/mql5), valores como se publicaron en su momento. Verificado: 5.6% para el segundo trimestre de 2026 (máximo desde 2014); 5.3% para el primer trimestre (más tarde revisado a 5.4% en el propio comunicado del T2, no reflejado acá para mantener consistencia con el histórico "como se publicó" del calendario).',
  },
  {
    id: 'nzd_employment_change',
    label: 'Cambios en el Empleo (t/t)',
    shortLabel: 'Empleo',
    section: 'empleo',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ (Household Labour Force Survey) — vía investing.com/mql5',
    sourceUrl: 'https://www.investing.com/economic-calendar/employment-change-93',
    goodDirection: 'up',
    description:
      'Variación trimestral del empleo total, en porcentaje (mismo criterio que el calendario económico de referencia del usuario — antes se mostraba en miles de personas). Misma limitación que la tasa de desempleo — carga manual. Histórico 2014 T1–2026 T2 tomado de investing.com/mql5. Verificado: +0.5% para el segundo trimestre de 2026 (2.905.000 empleados, +13.000).',
  },
  {
    id: 'nzd_participation_rate',
    label: 'Tasa de Participación',
    shortLabel: 'Participación',
    section: 'empleo',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'NZD',
    source: 'Stats NZ (Household Labour Force Survey) — vía investing.com/mql5',
    sourceUrl: 'https://www.mql5.com/en/economic-calendar/new-zealand/participation-rate',
    goodDirection: 'up',
    description:
      'Porcentaje de la población en edad de trabajar que está empleada o buscando empleo activamente. Agregado a pedido del usuario (aparece en su calendario de referencia junto al resto de los indicadores de empleo de NZD). Carga manual. Histórico 2014 T1–2026 T2. Verificado: 70.7% para el segundo trimestre de 2026.',
  },
  // Índice de Costes Laborales (Labour Cost Index) — mide la variación de
  // sueldos/salarios por hora para la misma cantidad y calidad de trabajo.
  // Stats NZ publica varias series ("including overtime" vs "excluding
  // overtime", total vs privado/público) — el calendario de referencia del
  // usuario (investing.com) trackea explícitamente la serie que EXCLUYE
  // horas extra, ver nota arriba.
  {
    id: 'nzd_labour_cost_index',
    label: 'Índice de Costes Laborales (t/t)',
    shortLabel: 'Costes Laborales',
    section: 'empleo',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ (Labour Cost Index, salary/wage rates EXCLUDING overtime) — vía investing.com/mql5',
    sourceUrl: 'https://www.investing.com/economic-calendar/labor-cost-index-188',
    goodDirection: 'neutral',
    description:
      'Variación trimestral del costo salarial, serie que excluye horas extra (la que trackea el calendario económico de referencia del usuario — distinta de "all sectors combined incl. overtime" que reporta Stats NZ como titular en sus comunicados). Histórico 2014 T1–2026 T2. Verificado: +0.7% para el segundo trimestre de 2026.',
  },
  {
    id: 'nzd_labour_cost_index_yoy',
    label: 'Índice de Costes Laborales Interanual (a/a)',
    shortLabel: 'Costes Laborales a/a',
    section: 'empleo',
    format: 'pct',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'NZD',
    source: 'Stats NZ (Labour Cost Index, salary/wage rates EXCLUDING overtime) — vía investing.com/mql5',
    sourceUrl: 'https://www.investing.com/economic-calendar/labor-cost-index-1178',
    goodDirection: 'neutral',
    description:
      'Costo salarial respecto al mismo trimestre del año anterior, serie que excluye horas extra (ver nota arriba). Histórico 2014 T1–2026 T2. Verificado: +2.1% para el segundo trimestre de 2026 (subió desde 2.0% en marzo).',
  },
  // Confianza — sin API pública (encuestas privadas, ANZ / Westpac
  // McDermott Miller), igual que el resto de las divisas.
  {
    id: 'nzd_business_confidence',
    label: 'Confianza Empresarial',
    shortLabel: 'Conf. Empresarial',
    section: 'confianza',
    format: 'index',
    frequency: 'monthly',
    chart: 'line',
    currency: 'NZD',
    source: 'ANZ Business Outlook',
    sourceUrl: 'https://www.anz.co.nz/about-us/economic-markets-research/business-outlook/',
    goodDirection: 'up',
    description: 'Encuesta de confianza empresarial de ANZ. Sin API pública — carga manual.',
  },
  {
    id: 'nzd_consumer_confidence',
    label: 'Confianza del Consumidor',
    shortLabel: 'Conf. Consumidor',
    section: 'confianza',
    format: 'index',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'NZD',
    source: 'Westpac McDermott Miller Consumer Confidence',
    sourceUrl: 'https://www.westpac.co.nz/who-we-are/economic-updates/consumer-confidence/',
    goodDirection: 'up',
    description: 'Índice de confianza del consumidor Westpac McDermott Miller. Sin API pública — carga manual.',
  },
  // Crecimiento — PMI van acá (actividad, no confianza pura).
  {
    id: 'nzd_pmi_manuf',
    label: 'PMI Manufactura',
    shortLabel: 'PMI Manuf.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ Performance of Manufacturing Index (PMI)',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/pmi',
    goodDirection: 'up',
    description: 'PMI manufacturero de Nueva Zelanda. >50 = expansión, <50 = contracción. Sin API pública — carga manual.',
  },
  // Subcomponentes del PMI (a pedido del usuario, mismo patrón en todas las
  // divisas): precios, producción, nuevas órdenes, empleo.
  {
    id: 'nzd_pmi_manuf_new_orders',
    label: 'PMI Manufactura — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PMI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/pmi',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_pmi_manuf',
  },
  {
    id: 'nzd_pmi_manuf_production',
    label: 'PMI Manufactura — Producción',
    shortLabel: 'Producción',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PMI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/pmi',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_pmi_manuf',
  },
  {
    id: 'nzd_pmi_manuf_employment',
    label: 'PMI Manufactura — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PMI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/pmi',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_pmi_manuf',
  },
  {
    id: 'nzd_pmi_manuf_prices',
    label: 'PMI Manufactura — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PMI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/pmi',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Manufactura de Nueva Zelanda. Presión de precios en insumos. Carga manual.',
    parentId: 'nzd_pmi_manuf',
  },
  {
    id: 'nzd_pmi_serv',
    label: 'PMI Servicios',
    shortLabel: 'PMI Serv.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ Performance of Services Index (PSI)',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/psi',
    goodDirection: 'up',
    description: 'PMI de servicios de Nueva Zelanda (PSI). Sin API pública — carga manual.',
  },
  {
    id: 'nzd_pmi_serv_new_orders',
    label: 'PMI Servicios — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PSI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/psi',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_pmi_serv',
  },
  {
    id: 'nzd_pmi_serv_business_activity',
    label: 'PMI Servicios — Actividad de Negocios',
    shortLabel: 'Actividad de Negocios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PSI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/psi',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_pmi_serv',
  },
  {
    id: 'nzd_pmi_serv_employment',
    label: 'PMI Servicios — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PSI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/psi',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Servicios de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_pmi_serv',
  },
  {
    id: 'nzd_pmi_serv_prices',
    label: 'PMI Servicios — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'BNZ - BusinessNZ PSI',
    sourceUrl: 'https://www.businessnz.org.nz/resources/economic-reports-and-indexes/psi',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Servicios de Nueva Zelanda. Presión de precios en insumos. Carga manual.',
    parentId: 'nzd_pmi_serv',
  },
  // "Ventas Minoristas con Tarjeta de Crédito" — mismo nombre que usa
  // investing.com ("Electronic Card Retail Sales"). Serie "RTS total
  // industries" del Electronic Card Transactions de Stats NZ — ver lección 8
  // (existió una versión "core" que se sacó del sistema a pedido del
  // usuario por no coincidir con lo que efectivamente reporta la prensa).
  {
    id: 'nzd_retail_sales_total',
    label: 'Ventas Minoristas con Tarjeta de Crédito (m/m)',
    shortLabel: 'Ventas c/ Tarjeta',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ (Electronic Card Transactions, total industries, desestacionalizado)',
    sourceUrl: 'https://www.stats.govt.nz/topics/retail-trade/',
    goodDirection: 'up',
    description:
      'Variación mensual del gasto minorista total con tarjeta electrónica, desestacionalizado — "Electronic Card Retail Sales" en investing.com, la cifra que efectivamente sigue el mercado para Nueva Zelanda. Verificado: +1.3% para julio-2026, coincide exacto con investing.com.',
  },
  {
    id: 'nzd_retail_sales_total_yoy',
    label: 'Ventas Minoristas con Tarjeta de Crédito Interanual (a/a)',
    shortLabel: 'Ventas c/ Tarjeta a/a',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'NZD',
    source: 'Stats NZ (Electronic Card Transactions, total industries)',
    sourceUrl: 'https://www.stats.govt.nz/topics/retail-trade/',
    goodDirection: 'up',
    description:
      'Gasto minorista con tarjeta electrónica respecto al mismo mes del año anterior — Stats NZ publica esta tasa ya calculada (no se deriva de un nivel). Verificado: +3.4% para julio-2026, coincide exacto con investing.com.',
  },
  {
    id: 'nzd_gdp_qoq',
    label: 'PIB Trimestral (t/t)',
    shortLabel: 'PIB t/t',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ (Gross Domestic Product, Total GDP, desestacionalizado)',
    sourceUrl: 'https://www.stats.govt.nz/topics/gross-domestic-product/',
    goodDirection: 'up',
    description: 'Crecimiento del PIB real, variación trimestral SIN anualizar. Verificado: +0.8% para el primer trimestre de 2026, coincide con el dato oficial.',
  },
  {
    id: 'nzd_gdp_deflator',
    label: 'Deflactor del PIB',
    shortLabel: 'Deflactor PIB',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ',
    sourceUrl: 'https://www.stats.govt.nz/topics/gross-domestic-product/',
    goodDirection: 'neutral',
    description: 'Medida de inflación implícita en el PIB de Nueva Zelanda. Subcomponente de PIB Trimestral. Carga manual.',
    parentId: 'nzd_gdp_qoq',
  },
  {
    id: 'nzd_gdp_consumption',
    label: 'PIB — Consumo',
    shortLabel: 'Consumo',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ',
    sourceUrl: 'https://www.stats.govt.nz/topics/gross-domestic-product/',
    goodDirection: 'up',
    description: 'Contribución del consumo privado al crecimiento del PIB de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_gdp_qoq',
  },
  {
    id: 'nzd_gdp_investment',
    label: 'PIB — Inversión',
    shortLabel: 'Inversión',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ',
    sourceUrl: 'https://www.stats.govt.nz/topics/gross-domestic-product/',
    goodDirection: 'up',
    description: 'Contribución de la inversión (formación bruta de capital) al crecimiento del PIB de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_gdp_qoq',
  },
  {
    id: 'nzd_gdp_government',
    label: 'PIB — Gasto Público',
    shortLabel: 'Gasto Público',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ',
    sourceUrl: 'https://www.stats.govt.nz/topics/gross-domestic-product/',
    goodDirection: 'up',
    description: 'Contribución del gasto público al crecimiento del PIB de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_gdp_qoq',
  },
  {
    id: 'nzd_gdp_net_exports',
    label: 'PIB — Exportaciones Netas',
    shortLabel: 'Export. Netas',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ',
    sourceUrl: 'https://www.stats.govt.nz/topics/gross-domestic-product/',
    goodDirection: 'up',
    description: 'Contribución de las exportaciones netas (exportaciones menos importaciones) al crecimiento del PIB de Nueva Zelanda. Carga manual.',
    parentId: 'nzd_gdp_qoq',
  },
  {
    id: 'nzd_gdp_yoy',
    label: 'PIB Interanual (a/a)',
    shortLabel: 'PIB a/a',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'NZD',
    source: 'Stats NZ (Gross Domestic Product, Total GDP, desestacionalizado)',
    sourceUrl: 'https://www.stats.govt.nz/topics/gross-domestic-product/',
    goodDirection: 'up',
    description: 'PIB real respecto al mismo trimestre del año anterior — la cifra de "PIB" usada en el score. Verificado: +1.5% para el primer trimestre de 2026 (derivado del nivel, Stats NZ no publica el a/a directo).',
  },
  {
    id: 'nzd_trade_balance',
    label: 'Balanza Comercial',
    shortLabel: 'Balanza Com.',
    section: 'crecimiento',
    format: 'trade',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'NZD',
    source: 'Stats NZ (Overseas Merchandise Trade)',
    sourceUrl: 'https://www.stats.govt.nz/topics/imports-and-exports/',
    goodDirection: 'up',
    description:
      'Balance de comercio internacional de bienes de Nueva Zelanda (no incluye servicios). Stats NZ solo publica esta tabla en XLSX (no CSV, a diferencia de CPI/GDP/Ventas Minoristas), con encabezados multi-fila poco prácticos de parsear en una función serverless — carga manual.',
  },
];
