import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts
// / gbp-sync.ts: Vercel empaqueta cada función de /api por separado y no
// rastrea imports que cruzan a /src).
//
// CAD se sincroniza desde Statistics Canada (Web Data Service, sin key) +
// Bank of Canada Valet (sin key) — NO FRED: los derivados de FRED para
// Canadá o están discontinuados (la tasa del BoC, IRSTCB01CAM156N, se cortó
// en 2023) o desactualizados (el índice de CPI de FRED termina en 2025-03).
// PMI y encuestas de confianza (privados, sin API gratis) quedan manuales.

const BACKFILL_MONTHS = 36;

interface Observation {
  date: string; // YYYY-MM-01
  value: number;
}

// --- StatCan Web Data Service ---------------------------------------------

interface StatCanPoint {
  refPer: string;
  value: number;
}

async function fetchStatCanVector(productId: number, coordinate: string, latestN: number): Promise<StatCanPoint[]> {
  const res = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ productId, coordinate, latestN }]),
  });
  if (!res.ok) throw new Error(`StatCan ${productId}/${coordinate}: HTTP ${res.status}`);
  const json = (await res.json()) as { status: string; object?: { vectorDataPoint?: { refPer: string; value: number }[] } }[];
  const point = json[0];
  if (point.status !== 'SUCCESS' || !point.object?.vectorDataPoint) {
    throw new Error(`StatCan ${productId}/${coordinate}: ${JSON.stringify(point).slice(0, 200)}`);
  }
  return point.object.vectorDataPoint.map((p) => ({ refPer: p.refPer.slice(0, 7), value: p.value }));
}

function shiftMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

function pctChangeByMonth(points: StatCanPoint[], monthsBack: number): Observation[] {
  const byMonth = new Map(points.map((p) => [p.refPer, p.value]));
  const out: Observation[] = [];
  for (const p of points) {
    const prev = byMonth.get(shiftMonths(p.refPer, monthsBack));
    if (prev !== undefined && prev !== 0) out.push({ date: `${p.refPer}-01`, value: (p.value - prev) / prev });
  }
  return out;
}

function diffX1000ByMonth(points: StatCanPoint[]): Observation[] {
  const byMonth = new Map(points.map((p) => [p.refPer, p.value]));
  const out: Observation[] = [];
  for (const p of points) {
    const prev = byMonth.get(shiftMonths(p.refPer, 1));
    if (prev !== undefined) out.push({ date: `${p.refPer}-01`, value: (p.value - prev) * 1000 });
  }
  return out;
}

function levelByMonth(points: StatCanPoint[]): Observation[] {
  return points.map((p) => ({ date: `${p.refPer}-01`, value: p.value }));
}

// Coordenadas StatCan verificadas contra "The Daily" antes de automatizar
// (ver indicatorsCad.ts): el m/m de CPI calculado sobre 18-10-0006-01 dio
// 0.5% para mayo-2026, coincide exacto con el comunicado oficial.
const STATCAN_SOURCES = {
  cpiAll: { productId: 18100006, coordinate: '1.1.0.0.0.0.0.0.0.0' }, // CPI SA, all-items
  cpiCore: { productId: 18100006, coordinate: '1.11.0.0.0.0.0.0.0.0' }, // CPI SA, ex food & energy
  unemployment: { productId: 14100287, coordinate: '1.7.1.1.1.1.0.0.0.0' },
  employment: { productId: 14100287, coordinate: '1.3.1.1.1.1.0.0.0.0' },
  gdp: { productId: 36100434, coordinate: '1.1.1.1.0.0.0.0.0.0' }, // All industries, chained 2017$, SAAR
  retail: { productId: 20100056, coordinate: '1.1.1.2.0.0.0.0.0.0' }, // Total retail sales, SA
  tradeBalance: { productId: 12100011, coordinate: '1.3.2.2.1.0.0.0.0.0' }, // Balance of payments basis, SA
};

// --- Bank of Canada Valet ---------------------------------------------------

const BOC_RATE_SERIES = 'V39079'; // Target for the overnight rate

async function fetchBocRate(): Promise<Observation[]> {
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - BACKFILL_MONTHS - 1);
  const isoDate = dateFrom.toISOString().slice(0, 10);
  const res = await fetch(`https://www.bankofcanada.ca/valet/observations/${BOC_RATE_SERIES}/json?start_date=${isoDate}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (HikmanDashboard sync bot)' },
  });
  if (!res.ok) throw new Error(`BoC Valet ${BOC_RATE_SERIES}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { d: string; [key: string]: unknown }[] };
  const byMonth = new Map<string, number>();
  for (const obs of json.observations ?? []) {
    const seriesVal = obs[BOC_RATE_SERIES] as { v?: string } | undefined;
    if (!seriesVal?.v) continue;
    byMonth.set(obs.d.slice(0, 7), Number(seriesVal.v));
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, v]) => ({ date: `${ym}-01`, value: v / 100 }));
}

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
    const trimmed = series.slice(-BACKFILL_MONTHS);
    if (trimmed.length === 0) return;
    const rows = trimmed.map((p) => ({ indicator_id: indicatorId, date: p.date, value: p.value }));
    const { error } = await supabase.from('indicator_overrides').upsert(rows);
    if (error) throw new Error(error.message);
    const latest = trimmed[trimmed.length - 1];
    updated.push({ indicatorId, date: latest.date, value: latest.value, points: trimmed.length });
  }

  const jobs: { id: string; run: () => Promise<Observation[]> }[] = [
    { id: 'cad_boc_rate', run: () => fetchBocRate() },
    {
      id: 'cad_cpi',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiAll.productId, STATCAN_SOURCES.cpiAll.coordinate, BACKFILL_MONTHS + 13), 1),
    },
    {
      id: 'cad_cpi_yoy',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiAll.productId, STATCAN_SOURCES.cpiAll.coordinate, BACKFILL_MONTHS + 13), 12),
    },
    {
      id: 'cad_core_cpi',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiCore.productId, STATCAN_SOURCES.cpiCore.coordinate, BACKFILL_MONTHS + 13), 1),
    },
    {
      id: 'cad_core_cpi_yoy',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiCore.productId, STATCAN_SOURCES.cpiCore.coordinate, BACKFILL_MONTHS + 13), 12),
    },
    {
      id: 'cad_unemployment',
      run: async () =>
        levelByMonth(await fetchStatCanVector(STATCAN_SOURCES.unemployment.productId, STATCAN_SOURCES.unemployment.coordinate, BACKFILL_MONTHS)).map((o) => ({
          date: o.date,
          value: o.value / 100,
        })),
    },
    {
      id: 'cad_employment_change',
      run: async () => diffX1000ByMonth(await fetchStatCanVector(STATCAN_SOURCES.employment.productId, STATCAN_SOURCES.employment.coordinate, BACKFILL_MONTHS + 1)),
    },
    {
      id: 'cad_gdp_mom',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.gdp.productId, STATCAN_SOURCES.gdp.coordinate, BACKFILL_MONTHS + 13), 1),
    },
    {
      id: 'cad_gdp_yoy',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.gdp.productId, STATCAN_SOURCES.gdp.coordinate, BACKFILL_MONTHS + 13), 12),
    },
    {
      id: 'cad_retail_sales',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.retail.productId, STATCAN_SOURCES.retail.coordinate, BACKFILL_MONTHS + 13), 1),
    },
    {
      id: 'cad_retail_sales_yoy',
      run: async () => pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.retail.productId, STATCAN_SOURCES.retail.coordinate, BACKFILL_MONTHS + 13), 12),
    },
    {
      id: 'cad_trade_balance',
      run: async () => levelByMonth(await fetchStatCanVector(STATCAN_SOURCES.tradeBalance.productId, STATCAN_SOURCES.tradeBalance.coordinate, BACKFILL_MONTHS)),
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
