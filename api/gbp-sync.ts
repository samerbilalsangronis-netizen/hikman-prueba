import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts:
// Vercel empaqueta cada función de /api por separado y no rastrea imports que
// cruzan a /src).
//
// GBP es distinto de USD/EUR: casi todos sus indicadores quedan manuales (ver
// src/data/indicatorsGbp.ts — la API de ONS está congelada/desactualizada).
// Automatizados: la Bank Rate del Banco de Inglaterra, vía su IADB (no FRED
// — FRED tiene la serie de la Bank Rate discontinuada desde 2016); y la
// Balanza Comercial, que sí está viva en FRED (republicada desde ONS).

const BOE_INDICATOR_ID = 'gbp_boe_rate';
const BOE_SERIES_CODE = 'IUDBEDR';
const BOE_IADB_URL = 'https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp';
const TRADE_BALANCE_INDICATOR_ID = 'gbp_trade_balance';
const TRADE_BALANCE_FRED_SERIES = 'XTNTVA01GBM664S'; // Trade Balance: Commodities, GBP, SA
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

// FRED republica la balanza comercial de bienes del Reino Unido (fuente
// original: ONS) en libras esterlinas crudas (no miles/millones) —
// dividimos por 1e6 para guardar en millones, la convención que usa el
// formato 'trade' del dashboard (ver lib/format.ts).
async function fetchTradeBalance(fredApiKey: string): Promise<Observation[]> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=${TRADE_BALANCE_FRED_SERIES}` +
    `&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=${BACKFILL_MONTHS}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${TRADE_BALANCE_FRED_SERIES}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: Number(o.value) / 1_000_000 }))
    .sort((a, b) => a.date.localeCompare(b.date));
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

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
