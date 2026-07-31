import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Copia local e independiente de src/data/fredMappings.ts (mismo motivo que
// fred-sync.ts: Vercel empaqueta cada función de /api por separado y no
// rastrea imports que cruzan a /src). Si cambias un mapeo EUR, actualizá
// también src/data/fredMappings.ts.
type FredTransform = 'level_pct' | 'level' | 'level_div1000' | 'pct_change' | 'pct_change_yoy' | 'pct_change_quarter' | 'diff_x1000';

interface FredMapping {
  indicatorId: string;
  seriesId: string;
  transform: FredTransform;
}

// eur_cpi_yoy / eur_core_cpi_yoy quedaron afuera: verificado contra el dato
// FINAL publicado (18-jul-2026) que el a/a derivado del índice HICP de FRED
// (redondeado a 2 decimales por Eurostat) tiene un sesgo de ~0.1pp al
// componerse sobre 12 meses (dio 2.7%/2.4% vs el oficial 2.8%/2.4%). El
// dataset de Eurostat con la tasa a/a ya calculada (prc_hicp_manr) está
// discontinuado desde feb-2026. Carga manual — ver src/data/fredMappings.ts.
const EUR_FRED_MAPPINGS: FredMapping[] = [
  { indicatorId: 'eur_ecb_deposit_rate', seriesId: 'ECBDFR', transform: 'level_pct' },
  { indicatorId: 'eur_ecb_refi_rate', seriesId: 'ECBMRRFR', transform: 'level_pct' },
  { indicatorId: 'eur_ecb_marginal_rate', seriesId: 'ECBMLFR', transform: 'level_pct' },
  { indicatorId: 'eur_cpi', seriesId: 'CP0000EZ19M086NEST', transform: 'pct_change' },
  { indicatorId: 'eur_core_cpi', seriesId: 'TOTNRGFOODEA20MI15XM', transform: 'pct_change' },
  // Alemania/Francia (agregados 31-jul-2026): mismo patrón que eur_cpi,
  // solo m/m — verificado el a/a derivado contra el dato oficial de
  // junio-2026 (Destatis/INSEE) y descartado por el mismo sesgo de ~0.1pp
  // que ya excluye a eur_cpi_yoy/eur_core_cpi_yoy de este mapeo.
  { indicatorId: 'eur_de_hicp_mom', seriesId: 'CP0000DEM086NEST', transform: 'pct_change' },
  { indicatorId: 'eur_fr_hicp_mom', seriesId: 'CP0000FRM086NEST', transform: 'pct_change' },
  { indicatorId: 'eur_gdp_qoq', seriesId: 'CLVMNACSCAB1GQEA19', transform: 'pct_change_quarter' },
  { indicatorId: 'eur_gdp_yoy', seriesId: 'CLVMNACSCAB1GQEA19', transform: 'pct_change_yoy' },
];

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FETCH_LIMIT = 60;
const BACKFILL_LIMIT = 36;

interface Observation {
  date: string;
  value: number;
}

async function fetchFredObservations(seriesId: string, apiKey: string): Promise<Observation[]> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${FETCH_LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Retrocede `months` meses calendario sobre una fecha "YYYY-MM-DD".
function shiftMonths(date: string, months: number): string {
  const [y, m] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}-01`;
}

// Compara cada observación contra la de `monthsBack` meses calendario atrás,
// buscando por FECHA (no por posición), igual que fred-sync.ts.
function pctChangeByMonth(obs: Observation[], monthsBack: number): Observation[] {
  const byDate = new Map(obs.map((o) => [o.date, o.value]));
  const out: Observation[] = [];
  for (const cur of obs) {
    const prevValue = byDate.get(shiftMonths(cur.date, monthsBack));
    if (prevValue !== undefined && prevValue !== 0) {
      out.push({ date: cur.date, value: (cur.value - prevValue) / prevValue });
    }
  }
  return out;
}

function computeSeries(transform: FredTransform, obs: Observation[]): Observation[] {
  switch (transform) {
    case 'level_pct':
      return obs.map((o) => ({ date: o.date, value: o.value / 100 }));
    case 'level':
      return obs.map((o) => ({ date: o.date, value: o.value }));
    case 'level_div1000':
      return obs.map((o) => ({ date: o.date, value: o.value / 1000 }));
    case 'pct_change':
      return pctChangeByMonth(obs, 1);
    // PIB trimestral: Eurostat reporta t/t SIN anualizar (a diferencia de BEA),
    // así que basta comparar contra la observación de 3 meses atrás.
    case 'pct_change_quarter':
      return pctChangeByMonth(obs, 3);
    case 'pct_change_yoy':
      return pctChangeByMonth(obs, 12);
    default:
      return [];
  }
}

// Eurostat (JSON-stat) para desempleo de la Eurozona: FRED tiene esta serie
// discontinuada desde 2023 (verificado), Eurostat la sigue publicando cada
// mes. geo=EA21 es el código vigente de la Eurozona (Eurostat lo actualiza
// según la composición de miembros — antes era EA19/EA20).
const EUROSTAT_UNEMPLOYMENT_URL =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m' +
  '?format=JSON&lang=EN&geo=EA21&s_adj=SA&age=TOTAL&sex=T&unit=PC_ACT&sinceTimePeriod=2015-01';

interface EurostatJsonStat {
  value: Record<string, number>;
  dimension: { time: { category: { index: Record<string, number> } } };
}

async function fetchEurostatUnemployment(): Promise<Observation[]> {
  const res = await fetch(EUROSTAT_UNEMPLOYMENT_URL);
  if (!res.ok) throw new Error(`Eurostat une_rt_m: HTTP ${res.status}`);
  const json = (await res.json()) as EurostatJsonStat;
  const timeIndex = json.dimension.time.category.index;
  const out: Observation[] = [];
  for (const [period, idx] of Object.entries(timeIndex)) {
    const raw = json.value[String(idx)];
    if (raw === undefined) continue;
    out.push({ date: `${period}-01`, value: raw / 100 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const fredKey = process.env.FRED_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!fredKey) {
    res.status(500).json({ error: 'Falta la variable de entorno FRED_API_KEY en Vercel.' });
    return;
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Falta configurar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Vercel.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const updated: { indicatorId: string; date: string; value: number; points: number }[] = [];
  const errors: { indicatorId: string; error: string }[] = [];

  for (const mapping of EUR_FRED_MAPPINGS) {
    try {
      const obs = await fetchFredObservations(mapping.seriesId, fredKey);
      const series = computeSeries(mapping.transform, obs).slice(-BACKFILL_LIMIT);
      if (series.length === 0) continue;
      const rows = series.map((p) => ({ indicator_id: mapping.indicatorId, date: p.date, value: p.value }));
      const { error } = await supabase.from('indicator_overrides').upsert(rows);
      if (error) throw new Error(error.message);
      const latest = series[series.length - 1];
      updated.push({ indicatorId: mapping.indicatorId, date: latest.date, value: latest.value, points: series.length });
    } catch (err) {
      errors.push({ indicatorId: mapping.indicatorId, error: (err as Error).message });
    }
  }

  try {
    const series = (await fetchEurostatUnemployment()).slice(-BACKFILL_LIMIT);
    if (series.length > 0) {
      const rows = series.map((p) => ({ indicator_id: 'eur_unemployment', date: p.date, value: p.value }));
      const { error } = await supabase.from('indicator_overrides').upsert(rows);
      if (error) throw new Error(error.message);
      const latest = series[series.length - 1];
      updated.push({ indicatorId: 'eur_unemployment', date: latest.date, value: latest.value, points: series.length });
    }
  } catch (err) {
    errors.push({ indicatorId: 'eur_unemployment', error: (err as Error).message });
  }

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
