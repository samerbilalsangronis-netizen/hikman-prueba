import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts:
// Vercel empaqueta cada función de /api por separado y no rastrea imports que
// cruzan a /src).
//
// GBP es distinto de USD/EUR: casi todos sus indicadores quedan manuales (ver
// src/data/indicatorsGbp.ts — la API de ONS está congelada/desactualizada).
// Automatizados: la Bank Rate del Banco de Inglaterra, vía su IADB (no FRED
// — FRED tiene la serie de la Bank Rate discontinuada desde 2016); la
// Balanza Comercial, que sí está viva en FRED (republicada desde ONS); y
// (lección 12) la Tasa de Desempleo y la Evolución Trimestral del Empleo,
// ambas vía FRED (que republica la Labour Force Survey del ONS con fechas
// de período consistentes — el dato manual que reemplazan tenía las fechas
// desalineadas respecto a su propio período de referencia).

const BOE_INDICATOR_ID = 'gbp_boe_rate';
const BOE_SERIES_CODE = 'IUDBEDR';
const BOE_IADB_URL = 'https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp';
const TRADE_BALANCE_INDICATOR_ID = 'gbp_trade_balance';
const TRADE_BALANCE_FRED_SERIES = 'XTNTVA01GBM664S'; // Trade Balance: Commodities, GBP, SA
const UNEMPLOYMENT_INDICATOR_ID = 'gbp_unemployment';
const UNEMPLOYMENT_FRED_SERIES = 'LRHUTTTTGBM156S'; // Unemployment Rate, ILO, LFS, 3m rolling, SA
const EMPLOYMENT_CHANGE_INDICATOR_ID = 'gbp_employment_change';
const EMPLOYMENT_LEVEL_FRED_SERIES = 'LFEMTTTTGBQ647S'; // Employment, Total, Quarterly, SA, Persons
const BACKFILL_MONTHS = 36;
const BACKFILL_QUARTERS = 12;

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

// FRED reporta el porcentaje en unidades enteras (4.9), no fracción —
// dividimos por 100 para la convención 'pct1' del dashboard.
async function fetchUnemploymentRate(fredApiKey: string): Promise<Observation[]> {
  const obs = await fetchFredObservations(UNEMPLOYMENT_FRED_SERIES, fredApiKey, BACKFILL_MONTHS);
  return obs.map((o) => ({ date: o.date, value: o.value / 100 }));
}

// LFEMTTTTGBQ647S es un NIVEL (personas empleadas), no una variación —
// derivamos la evolución trimestral como nivel[t] − nivel[t-1] en personas
// crudas (mismo patrón que diff_x1000 para el NFP de USD, ver
// fredMappings.ts). Verificado: reproduce exacto el +148,000 que el ONS
// publicó para el trimestre a marzo-2026.
async function fetchEmploymentChange(fredApiKey: string): Promise<Observation[]> {
  const levels = await fetchFredObservations(EMPLOYMENT_LEVEL_FRED_SERIES, fredApiKey, BACKFILL_QUARTERS + 1);
  const out: Observation[] = [];
  for (let i = 1; i < levels.length; i++) {
    out.push({ date: levels[i].date, value: levels[i].value - levels[i - 1].value });
  }
  return out;
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
    const error = 'Falta la variable de entorno FRED_API_KEY en Vercel.';
    errors.push({ indicatorId: TRADE_BALANCE_INDICATOR_ID, error });
    errors.push({ indicatorId: UNEMPLOYMENT_INDICATOR_ID, error });
    errors.push({ indicatorId: EMPLOYMENT_CHANGE_INDICATOR_ID, error });
  } else {
    try {
      await syncSeries(TRADE_BALANCE_INDICATOR_ID, await fetchTradeBalance(fredKey));
    } catch (err) {
      errors.push({ indicatorId: TRADE_BALANCE_INDICATOR_ID, error: (err as Error).message });
    }
    try {
      await syncSeries(UNEMPLOYMENT_INDICATOR_ID, await fetchUnemploymentRate(fredKey));
    } catch (err) {
      errors.push({ indicatorId: UNEMPLOYMENT_INDICATOR_ID, error: (err as Error).message });
    }
    try {
      await syncSeries(EMPLOYMENT_CHANGE_INDICATOR_ID, await fetchEmploymentChange(fredKey));
    } catch (err) {
      errors.push({ indicatorId: EMPLOYMENT_CHANGE_INDICATOR_ID, error: (err as Error).message });
    }
  }

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
