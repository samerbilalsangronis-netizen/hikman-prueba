import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts
// / gbp-sync.ts / cad-sync.ts / aud-sync.ts / nzd-sync.ts: Vercel empaqueta
// cada función de /api por separado y no rastrea imports que cruzan a /src).
//
// JPY se sincroniza desde tres fuentes sin key:
// - e-Stat Dashboard API (dashboard.e-stat.go.jp) — CPI, Core CPI,
//   desempleo, empleo, PIB, ventas minoristas, salarios (ingresos totales +
//   horas extra, del Monthly Labour Survey del MHLW) y gasto de los hogares
//   (家計調査, hogares de 2+ personas, real) — a diferencia de CPI/ventas
//   minoristas, el Dashboard publica el m/m y el a/a de salarios y gasto de
//   hogares YA calculados, no hace falta derivarlos de un nivel. Distinta de
//   la API principal de e-Stat (esa sí exige un appId registrado, se descarta).
// - BOJ Time-Series Data Search (stat-search.boj.or.jp) — tasa de
//   política (call rate, serie FM01). A diferencia de rbnz.govt.nz, el
//   sitio del BOJ NO está bloqueado.
// - Aduanas de Japón / Ministry of Finance (customs.go.jp) — balanza
//   comercial (el Dashboard de e-Stat tiene una serie con ese nombre pero
//   es la incorrecta, ver indicatorsJpy.ts lección 4).
// PMI, Tankan y confianza del consumidor quedan manuales — ver
// indicatorsJpy.ts para el detalle de cada decisión.

const BACKFILL_POINTS = 40;
const USER_AGENT = 'Mozilla/5.0 (HikmanDashboard sync bot)';

interface Observation {
  date: string; // YYYY-MM-01
  value: number;
}

// --- Utilidades de fecha -----------------------------------------------------

function shiftDateByMonths(date: string, monthsBack: number): string {
  const [y, m] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) - monthsBack;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}

// e-Stat Dashboard usa "YYYYMM00" para mensual y "YYYYnQ00" para trimestral
// (ej. "20261Q00" = Q1 2026) — ambos se normalizan a la misma fecha
// YYYY-MM-01 (el trimestre usa el mes de inicio), así shiftDateByMonths sirve
// para las dos cadencias: m/m = 1 mes, t/t = 3 meses, a/a = 12 meses siempre.
function parseEstatTime(time: string): string {
  const year = time.slice(0, 4);
  if (time[5] === 'Q') {
    const q = Number(time[4]);
    const month = (q - 1) * 3 + 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }
  const month = time.slice(4, 6);
  return `${year}-${month}-01`;
}

// --- e-Stat Dashboard API (sin key, distinta de la API principal de e-Stat) -

async function fetchDashboardSeries(
  indicatorCode: string,
  timeFrom: string,
  isSeasonal: '1' | '2',
  regionCode = '00000',
): Promise<Map<string, number>> {
  const url = `https://dashboard.e-stat.go.jp/api/1.0/Json/getData?IndicatorCode=${indicatorCode}&RegionCode=${regionCode}&TimeFrom=${timeFrom}&IsSeasonalAdjustment=${isSeasonal}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`e-Stat Dashboard ${indicatorCode}: HTTP ${res.status}`);
  const json = (await res.json()) as {
    GET_STATS?: {
      STATISTICAL_DATA?: { DATA_INF?: { DATA_OBJ?: { VALUE: { '@time': string; $: string } } | { VALUE: { '@time': string; $: string } }[] } };
    };
  };
  const raw = json.GET_STATS?.STATISTICAL_DATA?.DATA_INF?.DATA_OBJ;
  const objs = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out = new Map<string, number>();
  for (const o of objs) {
    const num = Number(o.VALUE.$);
    if (Number.isNaN(num)) continue;
    out.set(parseEstatTime(o.VALUE['@time']), num);
  }
  if (out.size === 0) throw new Error(`e-Stat Dashboard ${indicatorCode}: sin datos`);
  return out;
}

function pctChangeSeries(level: Map<string, number>, monthsBack: number): Observation[] {
  const out: Observation[] = [];
  for (const [date, value] of level) {
    const prev = level.get(shiftDateByMonths(date, monthsBack));
    if (prev !== undefined && prev !== 0) out.push({ date, value: value / prev - 1 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Empleados (ambos sexos, desestacionalizado) viene en 万人 (decenas de
// miles de personas) — se multiplica x10000 para guardar personas crudas,
// mismo transform que usa AUD para su "Cambios en el Empleo".
function employmentChangeSeries(level: Map<string, number>): Observation[] {
  const out: Observation[] = [];
  for (const [date, value] of level) {
    const prev = level.get(shiftDateByMonths(date, 1));
    if (prev !== undefined) out.push({ date, value: (value - prev) * 10000 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function directPctSeries(level: Map<string, number>): Observation[] {
  return [...level.entries()].map(([date, value]) => ({ date, value: value / 100 })).sort((a, b) => a.date.localeCompare(b.date));
}

// Anualiza el t/t trimestral: qué pasaría si el ritmo de ESTE trimestre se
// repitiera 4 trimestres seguidos — (1+t/t)^4−1, calculado sobre el t/t SIN
// redondear (a partir del nivel), no sobre el 0.3%/etc. ya redondeado a 1
// decimal que se muestra en pantalla. Es la cifra que Japón destaca como
// "PIB" en su propio comunicado y la que cita la prensa/investing.com como
// si fuera la interanual — ver lección 11 en indicatorsJpy.ts.
function annualizedQoqSeries(level: Map<string, number>): Observation[] {
  const out: Observation[] = [];
  for (const [date, value] of level) {
    const prev = level.get(shiftDateByMonths(date, 3));
    if (prev !== undefined && prev !== 0) out.push({ date, value: (value / prev) ** 4 - 1 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// --- BOJ Time-Series Data Search (CSV público, sin key, serie FM01) --------

// La tasa a un día sin garantía (uncollateralized overnight call rate) — la
// tasa operativa del BOJ desde que salió de tasas negativas en mar-2024. El
// CSV viene en Shift-JIS pero las filas de datos (fecha,valor) son ASCII
// puro, así que decodificar como UTF-8 y matchear con regex alcanza (las
// líneas de cabecera en japonés simplemente no matchean y se ignoran).
async function fetchBojRate(): Promise<Observation[]> {
  const res = await fetch('https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/fm01_d_1.csv', { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`BOJ FM01: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buf);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - BACKFILL_POINTS - 1);
  // Varias filas diarias caen en el mismo "YYYY-MM-01" — un Map dedupea
  // quedándose con la última del mes (se recorre en orden cronológico).
  // Necesario: un upsert con la misma clave (indicator_id, date) repetida
  // en el mismo batch falla en Postgres ("ON CONFLICT DO UPDATE command
  // cannot affect row a second time"), a diferencia de llamadas separadas.
  const byMonth = new Map<string, number>();
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d{4})\/(\d{2})\/\d{2},(-?[\d.]+)\s*$/);
    if (!m) continue;
    const [, y, mo, val] = m;
    const date = new Date(Number(y), Number(mo) - 1, 1);
    if (date < cutoff) continue;
    byMonth.set(`${y}-${mo}-01`, Number(val) / 100);
  }
  if (byMonth.size === 0) throw new Error('BOJ FM01: no se encontraron filas de datos en el CSV');
  return [...byMonth.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

// --- BOJ Time-Series Data Search — Corporate Goods Price Index (CGPI) -----

// PPI japonés (Corporate Goods Price Index, 企業物価指数) — mismo sitio y
// mismo formato de CSV plano que fetchBojRate (serie FM01), esta vez serie
// PR01. El CSV trae 9 columnas de datos por fila: la 1ra es "[国内企業物価
// 指数] 総平均（前年比）" (CGPI doméstico total, a/a, YA calculado — el
// "Japan PPI y/y" que reporta la prensa) y la 5ta es su nivel (2020=100),
// del que se deriva el m/m (el BOJ no publica el m/m como serie separada,
// misma limitación que CPI). Igual que FM01: el CSV viene en Shift-JIS pero
// las filas de datos son ASCII puro, decodificar como UTF-8 alcanza.
async function fetchCgpi(): Promise<{ level: Map<string, number>; yoyDirect: Map<string, number> }> {
  const res = await fetch('https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/pr01_m_1.csv', { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`BOJ PR01 (CGPI): HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buf);
  const level = new Map<string, number>();
  const yoyDirect = new Map<string, number>();
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d{4})\/(\d{2}),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*)\s*$/);
    if (!m) continue;
    const [, y, mo, yoyStr, , , , levelStr] = m;
    const date = `${y}-${mo}-01`;
    if (yoyStr !== '') {
      const v = Number(yoyStr);
      if (!Number.isNaN(v)) yoyDirect.set(date, v);
    }
    if (levelStr !== '') {
      const v = Number(levelStr);
      if (!Number.isNaN(v)) level.set(date, v);
    }
  }
  if (level.size === 0) throw new Error('BOJ PR01 (CGPI): no se encontraron filas de datos en el CSV');
  return { level, yoyDirect };
}

// --- BOJ Time-Series Data Search — Corporate Services Price Index (CSPI) --

// Distinto del CGPI de arriba: el CSPI (企業向けサービス価格指数, serie
// PR02) mide precios de SERVICIOS transados entre empresas (transporte,
// publicidad, leasing, financieros, etc.), no de bienes — ver lección 12 en
// indicatorsJpy.ts. Mismo sitio/formato que PR01, pero el CSV trae 8
// columnas de datos por fila (4 tasas a/a ya calculadas + 4 niveles, base
// 2020=100): la 1ra es "総平均（前年比）" (promedio total, a/a, YA
// calculado — el "Japan CSPI y/y" de la prensa) y la 5ta es su nivel, del
// que se deriva el m/m (el BOJ no publica el m/m ya calculado, misma
// limitación que CGPI/CPI).
async function fetchCspi(): Promise<{ level: Map<string, number>; yoyDirect: Map<string, number> }> {
  const res = await fetch('https://www.stat-search.boj.or.jp/ssi/mtshtml/csv/pr02_m_1.csv', { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`BOJ PR02 (CSPI): HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buf);
  const level = new Map<string, number>();
  const yoyDirect = new Map<string, number>();
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d{4})\/(\d{2}),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*)\s*$/);
    if (!m) continue;
    const [, y, mo, yoyStr, , , , levelStr] = m;
    const date = `${y}-${mo}-01`;
    if (yoyStr !== '') {
      const v = Number(yoyStr);
      if (!Number.isNaN(v)) yoyDirect.set(date, v);
    }
    if (levelStr !== '') {
      const v = Number(levelStr);
      if (!Number.isNaN(v)) level.set(date, v);
    }
  }
  if (level.size === 0) throw new Error('BOJ PR02 (CSPI): no se encontraron filas de datos en el CSV');
  return { level, yoyDirect };
}

// --- Aduanas de Japón / Ministry of Finance (CSV público, sin key) ---------

// Balanza comercial real (exportaciones menos importaciones), NO la que
// muestra el Dashboard de e-Stat bajo el mismo nombre (esa es de balanza de
// pagos — ver lección 4 en indicatorsJpy.ts). Formato: "YYYY/MM,Exp,Imp" en
// miles de yenes; los meses todavía no publicados vienen con "0,0".
//
// lección (ago-2026): el usuario reportó "salió hace unos instantes, no se
// ha actualizado" para julio-2026. Verificado contra el comunicado oficial
// (customs.go.jp/toukei/shinbun/happyou_e.htm, "Jul.2026 Aug.20.2026(Prov.)"):
// el dato SÍ estaba publicado (Exports 11,511,798M / Imports 12,146,298M /
// Balance -634,500M, todo en millones de yenes) — pero este CSV resumen
// (d41ma.csv) todavía traía "0,0" para julio varias horas después del
// comunicado oficial. Es un desfase real de publicación entre el press
// release de Aduanas y este archivo CSV en particular, no un bug del
// pipeline. Se cargó el punto de julio-2026 como stopgap verificado en
// historical-series.json (mismo patrón que UMCSENT de USD) — el sync
// normal lo confirma/sobreescribe con el mismo valor en cuanto el CSV se
// actualice.
async function fetchTradeBalance(): Promise<Observation[]> {
  const res = await fetch('https://www.customs.go.jp/toukei/suii/html/data/d41ma.csv', { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Aduanas de Japón: HTTP ${res.status}`);
  const text = await res.text();
  const out: Observation[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d{4})\/(\d{2}),\s*(-?\d+)\s*,\s*(-?\d+)\s*$/);
    if (!m) continue;
    const [, y, mo, exp, imp] = m;
    const expNum = Number(exp);
    const impNum = Number(imp);
    if (expNum === 0 && impNum === 0) continue;
    out.push({ date: `${y}-${mo}-01`, value: (expNum - impNum) / 1000 }); // miles de yenes -> millones de yenes
  }
  if (out.length === 0) throw new Error('Aduanas de Japón: no se encontraron filas de datos en el CSV');
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// --- Códigos de indicador del e-Stat Dashboard ------------------------------

const CPI_LEVEL = '0703010501010090000'; // CPI general, índice de nivel
const CORE_CPI_LEVEL = '0703010501010090010'; // CPI ex alimentos frescos, índice de nivel
// Mismos códigos de indicador que el CPI nacional, pero con el desglose
// municipal (RegionCode 13100 = 東京都区部, los 23 barrios especiales de
// Tokio) — el Dashboard de e-Stat solo tiene valores crudos para esta
// granularidad (sin IsSeasonalAdjustment='2'), lo cual coincide con la
// convención real del mercado (el a/a de Tokio siempre se mira crudo).
const TOKYO_REGION = '13100';
const UNEMPLOYMENT = '0301010000020020010'; // 完全失業率（男女計）
const EMPLOYED_LEVEL = '0301010000010010010'; // 就業者（男女計）, en 万人
const GDP_LEVEL = '0705020501000010000'; // PIB real, nivel
const GDP_QOQ_DIRECT = '0705020501000040000'; // PIB real t/t, SIN anualizar
// Contribución de la Demanda Externa (exportaciones netas) al crecimiento del
// PIB, real, base 2020 — único desglose por componente que el Dashboard de
// e-Stat sigue publicando vigente (ver lección 11 en indicatorsJpy.ts; NO
// hay un código equivalente para consumo/inversión/gasto público con datos
// recientes, esos quedan manuales). Ya viene en puntos porcentuales, no
// hace falta derivar de un nivel.
const GDP_NET_EXPORTS_CONTRIB = '0705020501000020050';
const RETAIL_SALES_LEVEL = '0601010201010010000'; // 小売業販売額（名目）, sin versión desestacionalizada
const WAGE_YOY_DIRECT = '0302020000000030000'; // 現金給与総額（前年同月比）, a/a ya calculado
const OVERTIME_PAY_YOY_DIRECT = '0302020003000030010'; // 所定外給与（前年同月比）, a/a ya calculado
// Gasto de los hogares (二人以上の世帯 = hogares de 2+ personas, real, ya
// ajustado por inflación) — mismas series que reporta la prensa/investing.com.
// El m/m usa el índice desestacionalizado (IsSeasonalAdjustment='2', igual
// convención que CPI_LEVEL); el a/a usa la serie cruda sin desestacionalizar
// (IsSeasonalAdjustment='1', igual que WAGE_YOY_DIRECT) — así lo reporta el
// MIC/Statistics Bureau, y así coincide con lo verificado (jun-2026: -6.4%
// m/m, -3.3% a/a).
const HOUSEHOLD_SPENDING_MOM_DIRECT = '0704010101000240000'; // （前月比）消費支出（季節調整済実質指数）
const HOUSEHOLD_SPENDING_YOY_DIRECT = '0704010101000230000'; // （前年同月比）消費支出（実質）

const MONTHLY_FROM = '20150100';
const QUARTERLY_FROM = '20101Q00';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Falta configurar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Vercel.' });
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const updated: { indicatorId: string; date: string; value: number; points: number }[] = [];
  const errors: { indicatorId: string; error: string }[] = [];

  async function syncSeries(indicatorId: string, series: Observation[]) {
    const trimmed = series.slice(-BACKFILL_POINTS);
    if (trimmed.length === 0) return;
    const rows = trimmed.map((p) => ({ indicator_id: indicatorId, date: p.date, value: p.value }));
    const { error } = await supabase.from('indicator_overrides').upsert(rows);
    if (error) throw new Error(error.message);
    const latest = trimmed[trimmed.length - 1];
    updated.push({ indicatorId, date: latest.date, value: latest.value, points: trimmed.length });
  }

  let cpiLevel: Map<string, number> | undefined;
  let coreCpiLevel: Map<string, number> | undefined;
  let employedLevel: Map<string, number> | undefined;
  let gdpLevel: Map<string, number> | undefined;
  let retailLevel: Map<string, number> | undefined;
  let cgpi: Awaited<ReturnType<typeof fetchCgpi>> | undefined;
  let cspi: Awaited<ReturnType<typeof fetchCspi>> | undefined;

  const jobs: { id: string; run: () => Promise<Observation[]> }[] = [
    { id: 'jpy_boj_rate', run: fetchBojRate },
    {
      id: 'jpy_cpi',
      run: async () => {
        cpiLevel ??= await fetchDashboardSeries(CPI_LEVEL, MONTHLY_FROM, '2');
        return pctChangeSeries(cpiLevel, 1);
      },
    },
    {
      id: 'jpy_cpi_yoy',
      run: async () => {
        cpiLevel ??= await fetchDashboardSeries(CPI_LEVEL, MONTHLY_FROM, '2');
        return pctChangeSeries(cpiLevel, 12);
      },
    },
    {
      id: 'jpy_core_cpi',
      run: async () => {
        coreCpiLevel ??= await fetchDashboardSeries(CORE_CPI_LEVEL, MONTHLY_FROM, '2');
        return pctChangeSeries(coreCpiLevel, 1);
      },
    },
    {
      id: 'jpy_core_cpi_yoy',
      run: async () => {
        coreCpiLevel ??= await fetchDashboardSeries(CORE_CPI_LEVEL, MONTHLY_FROM, '2');
        return pctChangeSeries(coreCpiLevel, 12);
      },
    },
    {
      id: 'jpy_tokyo_cpi_yoy',
      run: async () => {
        const level = await fetchDashboardSeries(CPI_LEVEL, MONTHLY_FROM, '1', TOKYO_REGION);
        return pctChangeSeries(level, 12);
      },
    },
    {
      id: 'jpy_tokyo_core_cpi_yoy',
      run: async () => {
        const level = await fetchDashboardSeries(CORE_CPI_LEVEL, MONTHLY_FROM, '1', TOKYO_REGION);
        return pctChangeSeries(level, 12);
      },
    },
    {
      id: 'jpy_unemployment',
      run: async () => directPctSeries(await fetchDashboardSeries(UNEMPLOYMENT, MONTHLY_FROM, '2')),
    },
    {
      id: 'jpy_employment_change',
      run: async () => {
        employedLevel ??= await fetchDashboardSeries(EMPLOYED_LEVEL, MONTHLY_FROM, '2');
        return employmentChangeSeries(employedLevel);
      },
    },
    {
      id: 'jpy_retail_sales',
      run: async () => {
        retailLevel ??= await fetchDashboardSeries(RETAIL_SALES_LEVEL, MONTHLY_FROM, '1');
        return pctChangeSeries(retailLevel, 1);
      },
    },
    {
      id: 'jpy_retail_sales_yoy',
      run: async () => {
        retailLevel ??= await fetchDashboardSeries(RETAIL_SALES_LEVEL, MONTHLY_FROM, '1');
        return pctChangeSeries(retailLevel, 12);
      },
    },
    {
      id: 'jpy_gdp_qoq',
      run: async () => directPctSeries(await fetchDashboardSeries(GDP_QOQ_DIRECT, QUARTERLY_FROM, '2')),
    },
    {
      id: 'jpy_gdp_yoy',
      run: async () => {
        gdpLevel ??= await fetchDashboardSeries(GDP_LEVEL, QUARTERLY_FROM, '2');
        return pctChangeSeries(gdpLevel, 12);
      },
    },
    {
      id: 'jpy_gdp_annualized_qoq',
      run: async () => {
        gdpLevel ??= await fetchDashboardSeries(GDP_LEVEL, QUARTERLY_FROM, '2');
        return annualizedQoqSeries(gdpLevel);
      },
    },
    {
      id: 'jpy_gdp_net_exports',
      run: async () => directPctSeries(await fetchDashboardSeries(GDP_NET_EXPORTS_CONTRIB, QUARTERLY_FROM, '2')),
    },
    { id: 'jpy_trade_balance', run: fetchTradeBalance },
    {
      id: 'jpy_ppi',
      run: async () => {
        cgpi ??= await fetchCgpi();
        return pctChangeSeries(cgpi.level, 1);
      },
    },
    {
      id: 'jpy_ppi_yoy',
      run: async () => {
        cgpi ??= await fetchCgpi();
        return directPctSeries(cgpi.yoyDirect);
      },
    },
    {
      id: 'jpy_cspi',
      run: async () => {
        cspi ??= await fetchCspi();
        return pctChangeSeries(cspi.level, 1);
      },
    },
    {
      id: 'jpy_cspi_yoy',
      run: async () => {
        cspi ??= await fetchCspi();
        return directPctSeries(cspi.yoyDirect);
      },
    },
    {
      id: 'jpy_wage_yoy',
      run: async () => directPctSeries(await fetchDashboardSeries(WAGE_YOY_DIRECT, MONTHLY_FROM, '1')),
    },
    {
      id: 'jpy_overtime_pay_yoy',
      run: async () => directPctSeries(await fetchDashboardSeries(OVERTIME_PAY_YOY_DIRECT, MONTHLY_FROM, '1')),
    },
    {
      id: 'jpy_household_spending',
      run: async () => directPctSeries(await fetchDashboardSeries(HOUSEHOLD_SPENDING_MOM_DIRECT, MONTHLY_FROM, '2')),
    },
    {
      id: 'jpy_household_spending_yoy',
      run: async () => directPctSeries(await fetchDashboardSeries(HOUSEHOLD_SPENDING_YOY_DIRECT, MONTHLY_FROM, '1')),
    },
  ];

  for (const job of jobs) {
    try {
      await syncSeries(job.id, await job.run());
    } catch (err) {
      errors.push({ indicatorId: job.id, error: (err as Error).message });
    }
  }

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
