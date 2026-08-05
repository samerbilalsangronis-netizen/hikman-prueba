import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts
// / gbp-sync.ts / cad-sync.ts / aud-sync.ts / nzd-sync.ts: Vercel empaqueta
// cada función de /api por separado y no rastrea imports que cruzan a /src).
//
// JPY se sincroniza desde tres fuentes sin key:
// - e-Stat Dashboard API (dashboard.e-stat.go.jp) — CPI, Core CPI,
//   desempleo, empleo, PIB, ventas minoristas y salarios (ingresos totales +
//   horas extra, del Monthly Labour Survey del MHLW — a diferencia del resto,
//   el Dashboard publica el a/a de estas dos series YA calculado, no hace
//   falta derivarlo de un nivel). Distinta de la API principal de e-Stat
//   (esa sí exige un appId registrado, se descarta).
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

// --- Aduanas de Japón / Ministry of Finance (CSV público, sin key) ---------

// Balanza comercial real (exportaciones menos importaciones), NO la que
// muestra el Dashboard de e-Stat bajo el mismo nombre (esa es de balanza de
// pagos — ver lección 4 en indicatorsJpy.ts). Formato: "YYYY/MM,Exp,Imp" en
// miles de yenes; los meses todavía no publicados vienen con "0,0".
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
const RETAIL_SALES_LEVEL = '0601010201010010000'; // 小売業販売額（名目）, sin versión desestacionalizada
const WAGE_YOY_DIRECT = '0302020000000030000'; // 現金給与総額（前年同月比）, a/a ya calculado
const OVERTIME_PAY_YOY_DIRECT = '0302020003000030010'; // 所定外給与（前年同月比）, a/a ya calculado

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
    { id: 'jpy_trade_balance', run: fetchTradeBalance },
    {
      id: 'jpy_wage_yoy',
      run: async () => directPctSeries(await fetchDashboardSeries(WAGE_YOY_DIRECT, MONTHLY_FROM, '1')),
    },
    {
      id: 'jpy_overtime_pay_yoy',
      run: async () => directPctSeries(await fetchDashboardSeries(OVERTIME_PAY_YOY_DIRECT, MONTHLY_FROM, '1')),
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
