import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts:
// Vercel empaqueta cada función de /api por separado y no rastrea imports que
// cruzan a /src).
//
// GBP es distinto de USD/EUR: casi todos sus indicadores quedan manuales (ver
// src/data/indicatorsGbp.ts — la API de ONS está congelada/desactualizada
// para varios datasets clave, aunque no para todos — ver lecciones 13/14).
// Automatizados: la Bank Rate del Banco de Inglaterra, vía su IADB (no FRED
// — FRED tiene la serie de la Bank Rate discontinuada desde 2016); la
// Balanza Comercial, vía FRED (republicada desde ONS, sin retraso relevante);
// y (dataset LMS del ONS, vivo — ver lecciones 13/14) la Tasa de Desempleo,
// la Evolución del Empleo (3m/3m) y el crecimiento salarial (con y sin
// bonus).
//
// lección 13 (ago-2026): el usuario señaló que "Evolución Trimestral del
// Empleo" (agregada en la lección 12) debía ser MENSUAL, no trimestral —
// investing.com la publica como "Employment Change 3M/3M (MoM)": es una
// variación de 3 meses contra los 3 meses anteriores, pero se PUBLICA cada
// mes (ventana móvil), no una vez por trimestre. El indicador se había
// automatizado con FRED LFEMTTTTGBQ647S (nivel, solo 4 puntos/año) y se
// derivaba la diferencia entre trimestres — aproximaba el valor pero con
// la cadencia equivocada. Se reemplaza por la serie nativa del ONS que YA
// es esa variación 3m/3m publicada mensualmente (dataset LMS, CDID FV2A) —
// a diferencia de cpih01/retail-sales-index (congelados), este dataset SÍ
// está vivo.
//
// lección 14 (ago-2026): el usuario reportó que desempleo, evolución del
// empleo y salarios seguían "atrasados un mes" (dato de hoy era de junio,
// el dashboard mostraba mayo). Causa real, verificada contra el propio ONS:
//   - gbp_unemployment (FRED LRHUTTTTGBM156S) tiene un retraso de
//     republicación de varias semanas frente a la API nativa del ONS — se
//     reemplaza por ONS MGSX directo (misma serie, sin el retraso de FRED).
//   - Las series LFS de 3 meses móviles del ONS (MGSX, FV2A) fechan cada
//     punto con el MES MEDIO de la ventana de 3 meses (confirmado con el
//     campo "monthLabelStyle": "three month average" y el "label" de rango,
//     ej. fecha "2026 MAY" → label "2026 APR-JUN"), no con el mes final —
//     que es la convención que usa investing.com/FRED. Se suma 1 mes al
//     parsear ambas series para alinear la fecha con esa convención.
//   - gbp_wage_incl_bonus_yoy / gbp_wage_excl_bonus_yoy (Average Weekly
//     Earnings) no tenían ninguna automatización — se agregan vía ONS
//     KAC3 (Total Pay, incl. bonus) y KAI9 (Regular Pay, excl. bonus), que
//     SÍ fechan por el mes final directamente (sin desfase) — verificado:
//     KAC3 jun-2026 = 4.1% y KAI9 jun-2026 = 3.5%, coinciden exacto con
//     investing.com.
//
// lección 15 (ago-2026): Ventas Minoristas (m/m y nueva a/a, headline y
// subyacente) se agregan vía ONS dataset DRSI ("Retail Sales Index"), un
// id DISTINTO al "retail-sales-index" viejo que se había verificado
// congelado — no es la misma fuente re-chequeada. CDIDs J5EC/J5EB (all
// retail inc fuel, VOL SA, m/m y a/a) y J45W/J45U (ex fuel). Fechan por el
// mes real directamente, sin el desfase de ventana móvil de las series
// LFS — verificado: -0.5% m/m para julio-2026, coincide exacto con el
// comunicado oficial del ONS.
const BOE_INDICATOR_ID = 'gbp_boe_rate';
const BOE_SERIES_CODE = 'IUDBEDR';
const BOE_IADB_URL = 'https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp';
const TRADE_BALANCE_INDICATOR_ID = 'gbp_trade_balance';
const TRADE_BALANCE_FRED_SERIES = 'XTNTVA01GBM664S'; // Trade Balance: Commodities, GBP, SA
const ONS_LMS_BASE = 'https://api.beta.ons.gov.uk/v1/data?uri=/employmentandlabourmarket';
const UNEMPLOYMENT_INDICATOR_ID = 'gbp_unemployment';
const UNEMPLOYMENT_ONS_URI = `${ONS_LMS_BASE}/peoplenotinwork/unemployment/timeseries/mgsx/lms`;
const EMPLOYMENT_CHANGE_INDICATOR_ID = 'gbp_employment_change';
const EMPLOYMENT_CHANGE_ONS_URI = `${ONS_LMS_BASE}/peopleinwork/employmentandemployeetypes/timeseries/fv2a/lms`;
const WAGE_INCL_BONUS_INDICATOR_ID = 'gbp_wage_incl_bonus_yoy';
const WAGE_INCL_BONUS_ONS_URI = `${ONS_LMS_BASE}/peopleinwork/earningsandworkinghours/timeseries/kac3/lms`;
const WAGE_EXCL_BONUS_INDICATOR_ID = 'gbp_wage_excl_bonus_yoy';
const WAGE_EXCL_BONUS_ONS_URI = `${ONS_LMS_BASE}/peopleinwork/earningsandworkinghours/timeseries/kai9/lms`;
// Dataset DRSI ("Retail Sales Index") — distinto del "retail-sales-index"
// congelado que se verificó meses atrás (ver lección 15). CDIDs "All
// Business", volumen, desestacionalizado — fechan por el mes real, sin el
// desfase de ventana móvil de las series LFS (MGSX/FV2A).
const ONS_RETAIL_BASE = 'https://api.beta.ons.gov.uk/v1/data?uri=/businessindustryandtrade/retailindustry/timeseries';
const RETAIL_SALES_INDICATOR_ID = 'gbp_retail_sales';
const RETAIL_SALES_ONS_URI = `${ONS_RETAIL_BASE}/j5ec/drsi`; // All retail inc fuel, VOL SA, m/m
const RETAIL_SALES_YOY_INDICATOR_ID = 'gbp_retail_sales_yoy';
const RETAIL_SALES_YOY_ONS_URI = `${ONS_RETAIL_BASE}/j5eb/drsi`; // All retail inc fuel, VOL SA, a/a
const CORE_RETAIL_SALES_INDICATOR_ID = 'gbp_core_retail_sales';
const CORE_RETAIL_SALES_ONS_URI = `${ONS_RETAIL_BASE}/j45w/drsi`; // All retail ex fuel, VOL SA, m/m
const CORE_RETAIL_SALES_YOY_INDICATOR_ID = 'gbp_core_retail_sales_yoy';
const CORE_RETAIL_SALES_YOY_ONS_URI = `${ONS_RETAIL_BASE}/j45u/drsi`; // All retail ex fuel, VOL SA, a/a
const BACKFILL_MONTHS = 36;

interface Observation {
  date: string; // YYYY-MM-01
  value: number; // fracción (3.75 -> 0.0375)
}

// El IADB devuelve un CSV diario ("DD Mon YYYY,valor"). Se reduce a un punto
// por mes calendario (último valor disponible de cada mes) — mismo patrón
// que FRED expone para ECBDFR/ECBMRRFR (mensual aunque la tasa no cambie
// todos los meses).
function parseMonthlyFromDailyCsv(csv: string): Observation[] {
  const lines = csv.trim().split('\n').slice(1); // descarta encabezado "DATE,IUDBEDR"
  const byMonth = new Map<string, number>();
  for (const line of lines) {
    const [dateStr, valueStr] = line.split(',');
    if (!dateStr || !valueStr) continue;
    const value = Number(valueStr);
    if (Number.isNaN(value)) continue;
    const date = new Date(dateStr.trim());
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, value); // las líneas vienen en orden cronológico ascendente, el último valor gana
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ date: `${month}-01`, value: value / 100 }));
}

async function fetchBoeBankRate(): Promise<Observation[]> {
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - BACKFILL_MONTHS - 1);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${d.toLocaleString('en-US', { month: 'short' })}/${d.getFullYear()}`;

  const url =
    `${BOE_IADB_URL}?csv.x=yes&Datefrom=${fmt(dateFrom)}&Dateto=now` +
    `&SeriesCodes=${BOE_SERIES_CODE}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`;

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (HikmanDashboard sync bot)' } });
  if (!res.ok) throw new Error(`BoE IADB: HTTP ${res.status}`);
  const csv = await res.text();
  if (!csv.startsWith('DATE,')) throw new Error(`BoE IADB: respuesta inesperada (¿cambió el endpoint?): ${csv.slice(0, 120)}`);
  return parseMonthlyFromDailyCsv(csv).slice(-BACKFILL_MONTHS);
}

async function fetchFredObservations(
  seriesId: string,
  fredApiKey: string,
  limit: number,
): Promise<{ date: string; value: number }[]> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// FRED republica la balanza comercial de bienes del Reino Unido (fuente
// original: ONS) en libras esterlinas crudas (no miles/millones) —
// dividimos por 1e6 para guardar en millones, la convención que usa el
// formato 'trade' del dashboard (ver lib/format.ts).
async function fetchTradeBalance(fredApiKey: string): Promise<Observation[]> {
  const obs = await fetchFredObservations(TRADE_BALANCE_FRED_SERIES, fredApiKey, BACKFILL_MONTHS);
  return obs.map((o) => ({ date: o.date, value: o.value / 1_000_000 }));
}

const ONS_MONTHS: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12',
};

interface OnsMonthPoint { date: string; month: string; year: string; value: string }

// Fetcher genérico para series mensuales del ONS (dataset LMS). monthShift
// corrige el desfase de convención de fecha descrito en la lección 14:
// las series LFS de 3 meses móviles (MGSX, FV2A) fechan por el mes MEDIO
// de la ventana (shift 1 → mes final, la convención de investing.com/FRED);
// las de Average Weekly Earnings (KAC3, KAI9) ya fechan por el mes final
// (shift 0).
async function fetchOnsSeries(uri: string, monthShift: number): Promise<{ date: string; value: number }[]> {
  const res = await fetch(uri, { headers: { 'User-Agent': 'Mozilla/5.0 (HikmanDashboard sync bot)' } });
  if (!res.ok) throw new Error(`ONS: HTTP ${res.status} (${uri})`);
  const json = (await res.json()) as { months?: OnsMonthPoint[] };
  const months = json.months ?? [];
  if (months.length === 0) throw new Error(`ONS: respuesta sin datos mensuales (¿cambió el endpoint?) (${uri})`);
  return months
    .map((m) => {
      const mm = ONS_MONTHS[m.month];
      if (!mm) throw new Error(`ONS: mes no reconocido "${m.month}"`);
      const d = new Date(Date.UTC(Number(m.year), Number(mm) - 1 + monthShift, 1));
      const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      return { date, value: Number(m.value) };
    })
    .filter((o) => !Number.isNaN(o.value))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-BACKFILL_MONTHS);
}

// MGSX reporta el porcentaje en unidades enteras (4.9), no fracción —
// dividimos por 100 para la convención 'pct1' del dashboard.
async function fetchUnemploymentRate(): Promise<Observation[]> {
  const obs = await fetchOnsSeries(UNEMPLOYMENT_ONS_URI, 1);
  return obs.map((o) => ({ date: o.date, value: o.value / 100 }));
}

// FV2A ya es la variación 3m/3m en miles de personas — solo convertimos a
// personas crudas (× 1000) para la convención 'thousands' del dashboard
// (ver lib/format.ts), sin derivar nada nosotros.
async function fetchEmploymentChange(): Promise<Observation[]> {
  const obs = await fetchOnsSeries(EMPLOYMENT_CHANGE_ONS_URI, 1);
  return obs.map((o) => ({ date: o.date, value: o.value * 1000 }));
}

// Series del ONS que ya fechan por el mes final directamente (sin el
// desfase de ventana móvil de las LFS) y reportan el % en unidades enteras
// — dividimos por 100 (redondeado a 4 decimales para evitar el ruido de
// coma flotante de ej. 4.1 / 100). Usado para salarios (KAC3/KAI9) y
// ventas minoristas (J5EC/J5EB/J45W/J45U, dataset DRSI).
async function fetchOnsPctDirect(uri: string): Promise<Observation[]> {
  const obs = await fetchOnsSeries(uri, 0);
  return obs.map((o) => ({ date: o.date, value: Math.round((o.value / 100) * 10000) / 10000 }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const fredKey = process.env.FRED_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Falta configurar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Vercel.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const updated: { indicatorId: string; date: string; value: number; points: number }[] = [];
  const errors: { indicatorId: string; error: string }[] = [];

  async function syncSeries(indicatorId: string, series: Observation[]) {
    if (series.length === 0) return;
    const rows = series.map((p) => ({ indicator_id: indicatorId, date: p.date, value: p.value }));
    const { error } = await supabase.from('indicator_overrides').upsert(rows);
    if (error) throw new Error(error.message);
    const latest = series[series.length - 1];
    updated.push({ indicatorId, date: latest.date, value: latest.value, points: series.length });
  }

  try {
    await syncSeries(BOE_INDICATOR_ID, await fetchBoeBankRate());
  } catch (err) {
    errors.push({ indicatorId: BOE_INDICATOR_ID, error: (err as Error).message });
  }

  if (!fredKey) {
    errors.push({ indicatorId: TRADE_BALANCE_INDICATOR_ID, error: 'Falta la variable de entorno FRED_API_KEY en Vercel.' });
  } else {
    try {
      await syncSeries(TRADE_BALANCE_INDICATOR_ID, await fetchTradeBalance(fredKey));
    } catch (err) {
      errors.push({ indicatorId: TRADE_BALANCE_INDICATOR_ID, error: (err as Error).message });
    }
  }

  try {
    await syncSeries(UNEMPLOYMENT_INDICATOR_ID, await fetchUnemploymentRate());
  } catch (err) {
    errors.push({ indicatorId: UNEMPLOYMENT_INDICATOR_ID, error: (err as Error).message });
  }

  try {
    await syncSeries(EMPLOYMENT_CHANGE_INDICATOR_ID, await fetchEmploymentChange());
  } catch (err) {
    errors.push({ indicatorId: EMPLOYMENT_CHANGE_INDICATOR_ID, error: (err as Error).message });
  }

  try {
    await syncSeries(WAGE_INCL_BONUS_INDICATOR_ID, await fetchOnsPctDirect(WAGE_INCL_BONUS_ONS_URI));
  } catch (err) {
    errors.push({ indicatorId: WAGE_INCL_BONUS_INDICATOR_ID, error: (err as Error).message });
  }

  try {
    await syncSeries(WAGE_EXCL_BONUS_INDICATOR_ID, await fetchOnsPctDirect(WAGE_EXCL_BONUS_ONS_URI));
  } catch (err) {
    errors.push({ indicatorId: WAGE_EXCL_BONUS_INDICATOR_ID, error: (err as Error).message });
  }

  try {
    await syncSeries(RETAIL_SALES_INDICATOR_ID, await fetchOnsPctDirect(RETAIL_SALES_ONS_URI));
  } catch (err) {
    errors.push({ indicatorId: RETAIL_SALES_INDICATOR_ID, error: (err as Error).message });
  }

  try {
    await syncSeries(RETAIL_SALES_YOY_INDICATOR_ID, await fetchOnsPctDirect(RETAIL_SALES_YOY_ONS_URI));
  } catch (err) {
    errors.push({ indicatorId: RETAIL_SALES_YOY_INDICATOR_ID, error: (err as Error).message });
  }

  try {
    await syncSeries(CORE_RETAIL_SALES_INDICATOR_ID, await fetchOnsPctDirect(CORE_RETAIL_SALES_ONS_URI));
  } catch (err) {
    errors.push({ indicatorId: CORE_RETAIL_SALES_INDICATOR_ID, error: (err as Error).message });
  }

  try {
    await syncSeries(CORE_RETAIL_SALES_YOY_INDICATOR_ID, await fetchOnsPctDirect(CORE_RETAIL_SALES_YOY_ONS_URI));
  } catch (err) {
    errors.push({ indicatorId: CORE_RETAIL_SALES_YOY_INDICATOR_ID, error: (err as Error).message });
  }

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
