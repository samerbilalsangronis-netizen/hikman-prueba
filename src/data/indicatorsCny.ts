import type { IndicatorMeta } from '../types';

// Indicadores de CNY. A diferencia del resto de las divisas, el usuario
// pidió explícitamente SOLO Inflación y Crecimiento — CNY es una divisa de
// referencia ("proxi de riesgo"), no un par que siga con el mismo rigor de
// framework completo (sin Tasas/PBOC, sin Empleo, sin Confianza, sin
// Banqueros Centrales). No hay `scoreSeedCny.ts` — sin hoja DECISIONES para
// esta divisa, no hay score compuesto.
//
// Fuente: **chinadata.live**, un agregador de terceros (no oficial) que
// republica datos de la NBS (National Bureau of Statistics of China) y la
// Aduanas china (GACC) vía una API JSON simple, sin key, estable desde
// fuera de China. Se optó por esta API en vez de la fuente oficial
// (`data.stats.gov.cn`) porque **la API oficial de la NBS bloquea con un
// WAF cualquier IP no china** (probado: 403 "UrlACL" con curl real desde el
// entorno de la sesión, con y sin headers de navegador) — mismo patrón que
// rbnz.govt.nz (RBNZ) pero a nivel de todo un país. Cada serie usada se
// verificó contra el comunicado oficial de la NBS/GACC (via WebSearch) para
// al menos un mes reciente antes de automatizar — **las 13 coincidieron
// exacto** (ver `api/cny-sync.ts` y HANDOFF.md "Lecciones CNY" para el
// detalle mes a mes). Es la ÚNICA divisa con una fuente de terceros como
// sync automático principal — si chinadata.live cambia su API o deja de
// publicar, hay que revisar esto primero.
//
// **OJO — chinadata.live puede atrasarse ~2 meses en CASI TODOS sus
// datasets a la vez** (no solo uno aislado): pasó el 30-jul-2026, un día
// después de poner CNY en producción, y afectó a 10 de los 13 indicadores
// (solo PMI seguía al día). Se corrigió a mano esa vez con los valores
// oficiales de stats.gov.cn/english/PressRelease/ (accesible, a diferencia
// de la API de consulta data.stats.gov.cn). Si el usuario avisa que un
// dato está viejo, chequear los 13 de una contra la fuente antes de
// asumir que es solo ese indicador — ver "Lecciones CNY" #9 en HANDOFF.md.
//
// Lecciones clave:
// 1. China NO publica un índice de nivel de CPI/PPI como el resto de los
//    países — solo publica series de "% de cambio" ya calculadas (m/m y
//    a/a por separado). El PPI trae ambas series directas (`china-ppi` =
//    a/a, `china-ppi-mom` = m/m). El CPI en cambio SOLO trae el m/m
//    (`china-cpi-mom`) — no existe una serie a/a de CPI headline mensual en
//    esta fuente (solo una serie ANUAL, un punto por año, inútil para un
//    gráfico mensual). **`cny_cpi_yoy` se deriva encadenando los 12 valores
//    de m/m más recientes en un índice sintético** (mismo principio que
//    JPY/AUD derivan de un nivel real, salvo que acá el "nivel" no existe y
//    hay que reconstruirlo desde las tasas ya redondeadas por la NBS) —
//    esto introduce un margen de imprecisión de ~0.1-0.2pp frente a la
//    cifra oficial (verificado: 1.4% calculado vs 1.2% oficial para
//    mayo-2026, y 1.3% vs 1.2% para abril-2026) porque encadena 12 tasas ya
//    redondeadas a 1 decimal — no es un error de definición ni de signo,
//    es ruido de redondeo acumulado, documentado explícitamente en la
//    descripción del indicador.
// 2. **Ventas Minoristas y Producción Industrial NO tienen enero ni
//    febrero como meses separados, TODOS los años** — China solo publica
//    un dato combinado "enero-febrero" (para no distorsionar por el
//    Año Nuevo Chino, que se mueve de fecha) y esta fuente directamente
//    OMITE ese combinado de la serie mensual estándar (no lo mete ni en
//    enero ni en febrero) — el primer punto de cada año es MARZO, y es el
//    dato de marzo standalone, NO el combinado enero-febrero (verificado:
//    el valor de "2026-03" en `china-retail-sales-yoy` es 1.7%, que
//    coincide con "retail sales rose 1.7% in March", NO con el 2.8% de
//    "Jan-Feb 2026" que reportó Xinhua por separado). Es un hueco real en
//    el gráfico cada enero-febrero, no un error — no rellenar con
//    interpolación falsa.
// 3. **Inversión en Activos Fijos (FAI) es diferente: SÍ aparece en
//    febrero**, porque China la reporta como acumulado año-a-la-fecha
//    (YTD) — el valor de febrero YA ES el acumulado enero-febrero (1.8%
//    para 2026, verificado exacto contra el comunicado oficial), y el de
//    marzo es el acumulado enero-marzo, etc. Nunca es la variación de un
//    solo mes.
// 4. **PMI**: se usan los 3 índices OFICIALES de la NBS (Manufacturero, No
//    Manufacturero —que cubre servicios y construcción—, y Compuesto). El
//    PMI de Caixin/S&P Global (la encuesta privada, más seguida por
//    mercados FX en paralelo a la oficial) NO tiene API gratuita
//    encontrada — queda fuera de esta primera pasada (a diferencia del
//    resto de las divisas, ni siquiera queda como indicador manual porque
//    el usuario pidió no agregar de más).
// 5. **PIB**: `china-gdp-growth-qoq` da el t/t desestacionalizado directo
//    (China SÍ publica esta serie ajustada estacionalmente, a diferencia
//    de la creencia común de que solo publica a/a). El a/a sale de
//    `china-gdp-index` (base 100 = mismo trimestre del año anterior, ya
//    calculado por la NBS, no hay que derivarlo de un nivel real).
// 6. **Balanza Comercial**: `china-trade-monthly` da el balance ya en USD
//    millones (exportaciones menos importaciones, base aduanera GACC) —
//    coincide exacto con lo reportado (USD 105.43bn de superávit en
//    mayo-2026). Esta serie solo tiene historia desde 2023 (a diferencia
//    del resto, que tienen décadas) — es una limitación de la fuente, no
//    del indicador.
export const CNY_INDICATORS: IndicatorMeta[] = [
  {
    id: 'cny_cpi',
    label: 'CPI (Inflación al Consumidor, m/m)',
    shortLabel: 'CPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-cpi-mom',
    goodDirection: 'neutral',
    description: 'Variación mensual del CPI general de China. Serie ya publicada como % de cambio por la NBS (China no publica un índice de nivel de CPI).',
  },
  {
    id: 'cny_cpi_yoy',
    label: 'CPI Interanual (a/a)',
    shortLabel: 'CPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (derivado, ver lección 1)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-cpi-mom',
    goodDirection: 'neutral',
    description:
      'CPI general respecto al mismo mes del año anterior. Derivado encadenando 12 meses de m/m (China no publica una serie a/a mensual directa) — margen de imprecisión de ~0.1-0.2pp por redondeo acumulado, verificado contra el dato oficial.',
  },
  {
    id: 'cny_ppi',
    label: 'PPI (Precios al Productor, m/m)',
    shortLabel: 'PPI',
    section: 'inflacion',
    format: 'pct1',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-ppi-mom',
    goodDirection: 'neutral',
    description: 'Variación mensual del índice de precios al productor industrial de China.',
  },
  {
    id: 'cny_ppi_yoy',
    label: 'PPI Interanual (a/a)',
    shortLabel: 'PPI a/a',
    section: 'inflacion',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-ppi',
    goodDirection: 'neutral',
    description: 'PPI respecto al mismo mes del año anterior. Verificado: +3.9% para mayo-2026, coincide exacto con lo reportado.',
  },
  {
    id: 'cny_retail_sales_yoy',
    label: 'Ventas Minoristas Interanual (a/a)',
    shortLabel: 'Ventas Min. a/a',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-retail-sales-yoy',
    goodDirection: 'up',
    description:
      'Ventas minoristas totales de China respecto al mismo mes del año anterior. China no publica enero/febrero por separado (dato combinado por el Año Nuevo Chino, que esta fuente omite de la serie mensual) — hueco real cada año, ver lección 2. Verificado: -0.6% para mayo-2026, coincide exacto.',
  },
  {
    id: 'cny_industrial_output_yoy',
    label: 'Producción Industrial Interanual (a/a)',
    shortLabel: 'Prod. Industrial a/a',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-industrial-output',
    goodDirection: 'up',
    description:
      'Valor agregado industrial (empresas por encima del umbral de tamaño) respecto al mismo mes del año anterior. Mismo hueco de enero/febrero que Ventas Minoristas. Verificado: +4.5% para mayo-2026, coincide exacto.',
  },
  {
    id: 'cny_fixed_asset_investment',
    label: 'Inversión en Activos Fijos (acum. a/a)',
    shortLabel: 'Inversión Fija',
    section: 'crecimiento',
    format: 'pct',
    frequency: 'monthly',
    chart: 'line',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-fai',
    goodDirection: 'up',
    description:
      'Inversión en activos fijos (excluye hogares rurales), acumulado año-a-la-fecha vs. el mismo período del año anterior — así la reporta la NBS, nunca como variación de un solo mes. Verificado: -4.1% acumulado enero-mayo 2026, coincide exacto.',
  },
  {
    id: 'cny_pmi_manuf',
    label: 'PMI Manufactura (NBS)',
    shortLabel: 'PMI Manuf.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics vía chinadata.live',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-pmi',
    goodDirection: 'up',
    description: 'PMI manufacturero OFICIAL de la NBS (no el de Caixin/S&P Global, privado, sin API gratuita). >50 = expansión. Verificado: 50.3 para jun-2026, coincide exacto.',
  },
  // Subcomponentes del PMI (a pedido del usuario, mismo patrón en todas las
  // divisas): precios, producción, nuevas órdenes, empleo. La NBS los
  // publica en el mismo comunicado pero chinadata.live no los replica como
  // series separadas — carga manual.
  {
    id: 'cny_pmi_manuf_new_orders',
    label: 'PMI Manufactura — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de China. Carga manual.',
    parentId: 'cny_pmi_manuf',
  },
  {
    id: 'cny_pmi_manuf_production',
    label: 'PMI Manufactura — Producción',
    shortLabel: 'Producción',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de China. Carga manual.',
    parentId: 'cny_pmi_manuf',
  },
  {
    id: 'cny_pmi_manuf_employment',
    label: 'PMI Manufactura — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description: 'Subcomponente del PMI Manufactura de China. Carga manual.',
    parentId: 'cny_pmi_manuf',
  },
  {
    id: 'cny_pmi_manuf_prices',
    label: 'PMI Manufactura — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI Manufactura de China. Presión de precios en insumos. Carga manual.',
    parentId: 'cny_pmi_manuf',
  },
  {
    id: 'cny_pmi_non_manuf',
    label: 'PMI No Manufacturero (NBS)',
    shortLabel: 'PMI No Manuf.',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics vía chinadata.live',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-pmi-non-manufacturing',
    goodDirection: 'up',
    description: 'Índice de actividad no manufacturera de la NBS (servicios + construcción). Verificado: 50.2 para jun-2026, coincide exacto.',
  },
  {
    id: 'cny_pmi_non_manuf_new_orders',
    label: 'PMI No Manufacturero — Nuevas Órdenes',
    shortLabel: 'Nuevas Órdenes',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description: 'Subcomponente del PMI No Manufacturero de China. Carga manual.',
    parentId: 'cny_pmi_non_manuf',
  },
  {
    id: 'cny_pmi_non_manuf_business_activity',
    label: 'PMI No Manufacturero — Actividad de Negocios',
    shortLabel: 'Actividad de Negocios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description: 'Subcomponente del PMI No Manufacturero de China. Carga manual.',
    parentId: 'cny_pmi_non_manuf',
  },
  {
    id: 'cny_pmi_non_manuf_employment',
    label: 'PMI No Manufacturero — Empleo',
    shortLabel: 'Empleo',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description: 'Subcomponente del PMI No Manufacturero de China. Carga manual.',
    parentId: 'cny_pmi_non_manuf',
  },
  {
    id: 'cny_pmi_non_manuf_prices',
    label: 'PMI No Manufacturero — Precios',
    shortLabel: 'Precios',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'neutral',
    description: 'Subcomponente del PMI No Manufacturero de China. Presión de precios en insumos. Carga manual.',
    parentId: 'cny_pmi_non_manuf',
  },
  {
    id: 'cny_pmi_composite',
    label: 'PMI Compuesto (NBS)',
    shortLabel: 'PMI Compuesto',
    section: 'crecimiento',
    format: 'index',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics vía chinadata.live',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-pmi-composite',
    goodDirection: 'up',
    description: 'Combina manufactura y no manufactura de la NBS en un solo índice de actividad. Verificado: 50.6 para jun-2026, coincide exacto.',
  },
  {
    id: 'cny_gdp_qoq',
    label: 'PIB Trimestral (t/t, desestacionalizado)',
    shortLabel: 'PIB t/t',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-gdp-growth-qoq',
    goodDirection: 'up',
    description:
      'Crecimiento del PIB real trimestral, desestacionalizado — China sí publica esta serie (contra la creencia común de que solo reporta a/a). Verificado: +1.3% para el primer trimestre de 2026, coincide exacto.',
  },
  {
    id: 'cny_gdp_deflator',
    label: 'Deflactor del PIB',
    shortLabel: 'Deflactor PIB',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'neutral',
    description: 'Medida de inflación implícita en el PIB de China. Subcomponente de PIB Trimestral. Carga manual.',
    parentId: 'cny_gdp_qoq',
  },
  {
    id: 'cny_gdp_consumption',
    label: 'PIB — Consumo',
    shortLabel: 'Consumo',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description:
      'Contribución del consumo (Final Consumption Expenditure) al crecimiento del PIB de China, en puntos porcentuales — la NBS reporta esta cifra combinada (hogares + gobierno juntos, sin desglosar) y referida al a/a, no al t/t. Verificado Q1-2026: 2.4pp + Inversión 1.9pp + Exp. Netas 0.8pp ≈ 5.0% a/a (coincide con el PIB a/a real).',
    parentId: 'cny_gdp_yoy',
  },
  {
    id: 'cny_gdp_investment',
    label: 'PIB — Inversión',
    shortLabel: 'Inversión',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description:
      'Contribución de la formación bruta de capital (Gross Capital Formation) al crecimiento del PIB de China, en puntos porcentuales, referida al a/a (ver PIB — Consumo).',
    parentId: 'cny_gdp_yoy',
  },
  {
    id: 'cny_gdp_government',
    label: 'PIB — Gasto Público',
    shortLabel: 'Gasto Público',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description:
      'La NBS NO publica el gasto público separado del consumo privado — "Final Consumption Expenditure" ya viene combinado (ver PIB — Consumo). Queda sin dato a propósito, no por falta de carga.',
    parentId: 'cny_gdp_yoy',
  },
  {
    id: 'cny_gdp_net_exports',
    label: 'PIB — Exportaciones Netas',
    shortLabel: 'Export. Netas',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'bar',
    currency: 'CNY',
    source: 'National Bureau of Statistics',
    sourceUrl: 'https://www.stats.gov.cn/english/PressRelease/',
    goodDirection: 'up',
    description:
      'Contribución de las exportaciones netas (exportaciones menos importaciones) al crecimiento del PIB de China, en puntos porcentuales, referida al a/a (ver PIB — Consumo).',
    parentId: 'cny_gdp_yoy',
  },
  {
    id: 'cny_gdp_yoy',
    label: 'PIB Interanual (a/a)',
    shortLabel: 'PIB a/a',
    section: 'crecimiento',
    format: 'pct1',
    frequency: 'quarterly',
    chart: 'line',
    currency: 'CNY',
    source: 'NBS vía chinadata.live (agregador no oficial)',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-gdp-index',
    goodDirection: 'up',
    description: 'PIB real respecto al mismo trimestre del año anterior. Verificado: +5.0% para el primer trimestre de 2026, coincide exacto.',
  },
  {
    id: 'cny_trade_balance',
    label: 'Balanza Comercial',
    shortLabel: 'Balanza Com.',
    section: 'crecimiento',
    format: 'trade',
    frequency: 'monthly',
    chart: 'bar',
    currency: 'CNY',
    source: 'General Administration of Customs (GACC) vía chinadata.live',
    sourceUrl: 'https://chinadata.live/api/v2/data/china-trade-monthly',
    goodDirection: 'up',
    description:
      'Balance de comercio internacional de China, base aduanera (exportaciones menos importaciones). Esta serie solo tiene historia desde 2023 en la fuente usada. Verificado: superávit de USD 105.43bn para mayo-2026, coincide exacto.',
  },
];
