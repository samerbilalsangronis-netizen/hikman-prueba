import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts
// / gbp-sync.ts / cad-sync.ts / aud-sync.ts / nzd-sync.ts / jpy-sync.ts:
// Vercel empaqueta cada función de /api por separado y no rastrea imports
// que cruzan a /src).
//
// CHF se sincroniza desde tres fuentes sin key:
// - SNB Data Portal (data.snb.ch) — tasa de política y CPI/Core CPI
//   (nivel de índice para m/m, tasa a/a oficial del SFSO ya calculada).
// - Feed CSV de SECO expuesto vía scheduler.swissdatas.ch (encontrado
//   raspando el HTML de seco.admin.ch, no documentado formalmente) — PIB
//   real y confianza del consumidor (Konsumentenstimmungsindex).
// - KOF Time Series Database API v2 (ETH Zúrich) — KOF Economic Barometer
//   (confianza empresarial).
// Desempleo, Cambios en el Empleo, Ventas Minoristas, PMI y la Balanza
// Comercial mensual quedan manuales — ver indicatorsChf.ts para el detalle
// de cada decisión.

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

function pctChangeSeries(level: Map<string, number>, monthsBack: number): Observation[] {
  const out: Observation[] = [];
  for (const [date, value] of level) {
    const prev = level.get(shiftDateByMonths(date, monthsBack));
    if (prev !== undefined && prev !== 0) out.push({ date, value: value / prev - 1 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function directPctSeries(level: Map<string, number>): Observation[] {
  return [...level.entries()].map(([date, value]) => ({ date, value: value / 100 })).sort((a, b) => a.date.localeCompare(b.date));
}

function directLevelSeries(level: Map<string, number>): Observation[] {
  return [...level.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

// --- SNB Data Portal (data.snb.ch, sin key) ---------------------------------

// Cada cubo trae una o más series bajo timeseries[].header[0].dimItem — hay
// que matchear por el texto exacto (no por posición, un mismo cubo puede
// traer varias series como plkoprex o plkoprinfla). Fechas vienen "YYYY-MM".
async function fetchSnbCube(cubeId: string, dimItem: string): Promise<Map<string, number>> {
  const url = `https://data.snb.ch/api/cube/${cubeId}/data/json/en`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`SNB ${cubeId}: HTTP ${res.status}`);
  const json = (await res.json()) as {
    timeseries?: { header: { dim: string; dimItem: string }[]; values: { date: string; value: number }[] }[];
  };
  const series = json.timeseries?.find((t) => t.header[0]?.dimItem === dimItem);
  if (!series) throw new Error(`SNB ${cubeId}: no se encontró la serie "${dimItem}"`);
  const out = new Map<string, number>();
  for (const v of series.values) {
    if (typeof v.value !== 'number' || Number.isNaN(v.value)) continue;
    out.set(`${v.date}-01`, v.value);
  }
  if (out.size === 0) throw new Error(`SNB ${cubeId}: sin datos para "${dimItem}"`);
  return out;
}

// --- SECO, vía el feed CSV de scheduler.swissdatas.ch -----------------------

// Formato: "structure,type,seas_adj,date,value" con header. Filtra por
// structure/type/seas_adj exactos y devuelve Map<date, value>.
async function fetchSwissdatasSeries(url: string, structure: string, type: string, seasAdj: string): Promise<Map<string, number>> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`swissdatas ${url}: HTTP ${res.status}`);
  const text = await res.text();
  const out = new Map<string, number>();
  for (const line of text.split('\n').slice(1)) {
    const parts = line.trim().split(',');
    if (parts.length < 5) continue;
    const [rowStructure, rowType, rowSeasAdj, date, value] = parts;
    if (rowStructure !== structure || rowType !== type || rowSeasAdj !== seasAdj) continue;
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    out.set(date, num);
  }
  if (out.size === 0) throw new Error(`swissdatas ${url}: sin datos para ${structure}/${type}/${seasAdj}`);
  return out;
}

// --- KOF Time Series Database API v2 (tsdb-api.kof.ethz.ch, sin key) -------

// Formato: "date,ch.kof.barometer" con header. Acceso público vía
// access_type=public (sin API key).
async function fetchKofBarometer(): Promise<Observation[]> {
  const res = await fetch('https://tsdb-api.kof.ethz.ch/v2/ts?keys=ch.kof.barometer&mime=csv&access_type=public', {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`KOF Barometer: HTTP ${res.status}`);
  const text = await res.text();
  const out: Observation[] = [];
  for (const line of text.split('\n').slice(1)) {
    const [date, value] = line.trim().split(',');
    if (!date || !value) continue;
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    out.push({ date, value: num });
  }
  if (out.length === 0) throw new Error('KOF Barometer: sin datos');
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

  const GDP_CSV = 'https://scheduler.swissdatas.ch/scheduled/ch-seco-gdp.csv';
  const KS_Q_CSV = 'https://scheduler.swissdatas.ch/scheduled/ks-q.csv';

  let cpiLevel: Map<string, number> | undefined;
  let coreCpiLevel: Map<string, number> | undefined;
  let gdpLevel: Map<string, number> | undefined;

  const jobs: { id: string; run: () => Promise<Observation[]> }[] = [
    {
      id: 'chf_snb_rate',
      run: async () => directPctSeries(await fetchSnbCube('snboffzisa', 'Switzerland - SNB policy rate')),
    },
    {
      id: 'chf_cpi',
      run: async () => {
        cpiLevel ??= await fetchSnbCube('plkopr', 'National index – December 2025 = 100');
        return pctChangeSeries(cpiLevel, 1);
      },
    },
    {
      id: 'chf_cpi_yoy',
      run: async () =>
        directPctSeries(await fetchSnbCube('plkoprinfla', 'SFSO - Inflation according to the national consumer price index')),
    },
    {
      id: 'chf_core_cpi',
      run: async () => {
        coreCpiLevel ??= await fetchSnbCube('plkoprex', 'Core inflation 1');
        return pctChangeSeries(coreCpiLevel, 1);
      },
    },
    {
      id: 'chf_core_cpi_yoy',
      run: async () => directPctSeries(await fetchSnbCube('plkoprinfla', 'SFSO - Core inflation 1')),
    },
    {
      id: 'chf_business_confidence',
      run: fetchKofBarometer,
    },
    {
      id: 'chf_consumer_confidence',
      run: async () => directLevelSeries(await fetchSwissdatasSeries(KS_Q_CSV, 'ks_i62_index_q', 'index', 'csa')),
    },
    {
      id: 'chf_gdp_qoq',
      run: async () => {
        gdpLevel ??= await fetchSwissdatasSeries(GDP_CSV, 'gdp', 'real', 'cssa');
        return pctChangeSeries(gdpLevel, 3);
      },
    },
    {
      id: 'chf_gdp_yoy',
      run: async () => {
        gdpLevel ??= await fetchSwissdatasSeries(GDP_CSV, 'gdp', 'real', 'cssa');
        return pctChangeSeries(gdpLevel, 12);
      },
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
