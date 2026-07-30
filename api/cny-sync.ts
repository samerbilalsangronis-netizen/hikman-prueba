import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que el resto de los
// *-sync.ts: Vercel empaqueta cada función de /api por separado y no
// rastrea imports que cruzan a /src).
//
// CNY se sincroniza desde **chinadata.live**, un agregador de terceros
// (no oficial) que republica datos de la NBS (National Bureau of
// Statistics of China) y la Aduanas china (GACC) vía JSON sin key. La API
// oficial de la NBS (data.stats.gov.cn) bloquea con un WAF cualquier IP no
// china (403 "UrlACL") — no se pudo usar directamente, ver
// indicatorsCny.ts para el detalle completo. Las 13 series están
// automatizadas — no hay ninguna manual para esta divisa (a pedido
// explícito del usuario: solo Inflación y Crecimiento, sin Tasas/Empleo/
// Confianza/Banqueros Centrales).

const BACKFILL_POINTS = 40;
const USER_AGENT = 'Mozilla/5.0 (HikmanDashboard sync bot)';
const BASE_URL = 'https://chinadata.live/api/v2/data';

interface Observation {
  date: string; // YYYY-MM-01
  value: number;
}

// chinadata.live usa fechas "YYYY-MM" para series mensuales y "YYYY-Qn"
// para trimestrales — ambas se normalizan a "YYYY-MM-01" (el trimestre usa
// el mes de inicio: Q1→01, Q2→04, Q3→07, Q4→10).
function normalizeDate(raw: string): string {
  const q = raw.match(/^(\d{4})-Q([1-4])$/);
  if (q) {
    const month = (Number(q[2]) - 1) * 3 + 1;
    return `${q[1]}-${String(month).padStart(2, '0')}-01`;
  }
  return `${raw}-01`;
}

function shiftDateByMonths(date: string, monthsBack: number): string {
  const [y, m] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) - monthsBack;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}

async function fetchChinaDataSeries(slug: string): Promise<Map<string, number>> {
  const res = await fetch(`${BASE_URL}/${slug}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`chinadata.live ${slug}: HTTP ${res.status}`);
  const json = (await res.json()) as { success?: boolean; data?: { data?: { date: string; value: number }[] } };
  const points = json.data?.data ?? [];
  const out = new Map<string, number>();
  for (const p of points) {
    if (typeof p.value !== 'number' || Number.isNaN(p.value)) continue;
    out.set(normalizeDate(p.date), p.value);
  }
  if (out.size === 0) throw new Error(`chinadata.live ${slug}: sin datos`);
  return out;
}

// Cada valor ya viene como % de cambio (no como índice) — solo hay que
// convertir a fracción.
function pctSeries(level: Map<string, number>): Observation[] {
  return [...level.entries()].map(([date, value]) => ({ date, value: value / 100 })).sort((a, b) => a.date.localeCompare(b.date));
}

// PMI (índice, no %) y trade balance (moneda) se guardan tal cual.
function rawSeries(level: Map<string, number>): Observation[] {
  return [...level.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

// china-gdp-index viene como "mismo trimestre del año anterior = 100".
function indexToYoySeries(level: Map<string, number>): Observation[] {
  return [...level.entries()].map(([date, value]) => ({ date, value: value / 100 - 1 })).sort((a, b) => a.date.localeCompare(b.date));
}

// China no publica una serie a/a de CPI headline mensual (solo el m/m ya
// calculado) — se deriva encadenando los % de cambio mensuales en un
// índice sintético y comparando contra 12 meses atrás. Introduce un margen
// de imprecisión de ~0.1-0.2pp frente a la cifra oficial (redondeo
// acumulado de 12 tasas ya redondeadas a 1 decimal), documentado en
// indicatorsCny.ts.
function deriveYoyFromChainedMom(momPct: Map<string, number>): Observation[] {
  const dates = [...momPct.keys()].sort();
  const level = new Map<string, number>();
  let prevDate: string | null = null;
  for (const date of dates) {
    if (prevDate === null) {
      level.set(date, 100);
    } else {
      level.set(date, level.get(prevDate)! * (1 + momPct.get(date)! / 100));
    }
    prevDate = date;
  }
  const out: Observation[] = [];
  for (const date of dates) {
    const prev = level.get(shiftDateByMonths(date, 12));
    if (prev !== undefined && prev !== 0) out.push({ date, value: level.get(date)! / prev - 1 });
  }
  return out;
}

// --- china-trade-monthly tiene un shape distinto (total/export/import/balance/ytd_*) ---

async function fetchTradeBalance(): Promise<Observation[]> {
  const res = await fetch(`${BASE_URL}/china-trade-monthly`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`chinadata.live china-trade-monthly: HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { data?: { date: string; balance: string }[] } };
  const points = json.data?.data ?? [];
  const out: Observation[] = [];
  for (const p of points) {
    const num = Number(p.balance);
    if (Number.isNaN(num)) continue;
    // Ya viene en USD millones — coincide con el formato 'trade' del dashboard.
    out.push({ date: normalizeDate(p.date), value: num });
  }
  if (out.length === 0) throw new Error('chinadata.live china-trade-monthly: sin datos');
  return out.sort((a, b) => a.date.localeCompare(b.date));
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
    const trimmed = series.slice(-BACKFILL_POINTS);
    if (trimmed.length === 0) return;
    const rows = trimmed.map((p) => ({ indicator_id: indicatorId, date: p.date, value: p.value }));
    const { error } = await supabase.from('indicator_overrides').upsert(rows);
    if (error) throw new Error(error.message);
    const latest = trimmed[trimmed.length - 1];
    updated.push({ indicatorId, date: latest.date, value: latest.value, points: trimmed.length });
  }

  let cpiMom: Map<string, number> | undefined;

  const jobs: { id: string; run: () => Promise<Observation[]> }[] = [
    {
      id: 'cny_cpi',
      run: async () => {
        cpiMom ??= await fetchChinaDataSeries('china-cpi-mom');
        return pctSeries(cpiMom);
      },
    },
    {
      id: 'cny_cpi_yoy',
      run: async () => {
        cpiMom ??= await fetchChinaDataSeries('china-cpi-mom');
        return deriveYoyFromChainedMom(cpiMom);
      },
    },
    { id: 'cny_ppi', run: async () => pctSeries(await fetchChinaDataSeries('china-ppi-mom')) },
    { id: 'cny_ppi_yoy', run: async () => pctSeries(await fetchChinaDataSeries('china-ppi')) },
    { id: 'cny_retail_sales_yoy', run: async () => pctSeries(await fetchChinaDataSeries('china-retail-sales-yoy')) },
    { id: 'cny_industrial_output_yoy', run: async () => pctSeries(await fetchChinaDataSeries('china-industrial-output')) },
    { id: 'cny_fixed_asset_investment', run: async () => pctSeries(await fetchChinaDataSeries('china-fai')) },
    { id: 'cny_pmi_manuf', run: async () => rawSeries(await fetchChinaDataSeries('china-pmi')) },
    { id: 'cny_pmi_non_manuf', run: async () => rawSeries(await fetchChinaDataSeries('china-pmi-non-manufacturing')) },
    { id: 'cny_pmi_composite', run: async () => rawSeries(await fetchChinaDataSeries('china-pmi-composite')) },
    { id: 'cny_gdp_qoq', run: async () => pctSeries(await fetchChinaDataSeries('china-gdp-growth-qoq')) },
    { id: 'cny_gdp_yoy', run: async () => indexToYoySeries(await fetchChinaDataSeries('china-gdp-index')) },
    { id: 'cny_trade_balance', run: fetchTradeBalance },
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
