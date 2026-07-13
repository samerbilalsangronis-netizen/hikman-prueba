import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Copia local e independiente de src/data/fredMappings.ts. Vercel empaqueta
// cada función de /api por separado y no logra rastrear imports que cruzan
// a /src (falla en runtime con ERR_MODULE_NOT_FOUND), así que esta función
// necesita su propia copia autocontenida. Si cambias el mapeo, actualiza
// también src/data/fredMappings.ts (se usa ahí solo para mostrar la
// insignia "FRED" en la UI).
type FredTransform = 'level_pct' | 'level' | 'level_div1000' | 'pct_change' | 'diff_x1000';

interface FredMapping {
  indicatorId: string;
  seriesId: string;
  transform: FredTransform;
}

const FRED_MAPPINGS: FredMapping[] = [
  { indicatorId: 'fed_funds_rate', seriesId: 'FEDFUNDS', transform: 'level_pct' },
  { indicatorId: 't10y', seriesId: 'WGS10YR', transform: 'level_pct' },
  { indicatorId: 'm2_value', seriesId: 'WM2NS', transform: 'level' },
  { indicatorId: 'gdp_qoq', seriesId: 'A191RL1Q225SBEA', transform: 'level_pct' },
  { indicatorId: 'cpi', seriesId: 'CPIAUCSL', transform: 'pct_change' },
  { indicatorId: 'core_cpi', seriesId: 'CPILFESL', transform: 'pct_change' },
  // PPIFGS/PPILFE (las series "clásicas") fueron descontinuadas por BLS/FRED
  // en dic-2015. PPIFIS/PPIFES son su continuación bajo la metodología
  // "Final Demand" vigente.
  { indicatorId: 'ppi', seriesId: 'PPIFIS', transform: 'pct_change' },
  { indicatorId: 'core_ppi', seriesId: 'PPIFES', transform: 'pct_change' },
  { indicatorId: 'nfp', seriesId: 'PAYEMS', transform: 'diff_x1000' },
  { indicatorId: 'unemployment', seriesId: 'UNRATE', transform: 'level_pct' },
  { indicatorId: 'wage_pct', seriesId: 'CES0500000003', transform: 'pct_change' },
  { indicatorId: 'jolts', seriesId: 'JTSJOL', transform: 'level_div1000' },
];

const CBBS_MAPPING = {
  indicatorId: 'cbbs_pct_gdp',
  balanceSheetSeriesId: 'WALCL',
  gdpSeriesId: 'GDP',
};

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

interface Observation {
  date: string;
  value: number;
}

async function fetchObservations(seriesId: string, apiKey: string, limit = 6): Promise<Observation[]> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeValue(transform: FredTransform, obs: Observation[]): Observation | null {
  if (obs.length === 0) return null;
  const latest = obs[obs.length - 1];
  const prev = obs.length >= 2 ? obs[obs.length - 2] : null;
  switch (transform) {
    case 'level_pct':
      return { date: latest.date, value: latest.value / 100 };
    case 'level':
      return { date: latest.date, value: latest.value };
    case 'level_div1000':
      return { date: latest.date, value: latest.value / 1000 };
    case 'pct_change':
      if (!prev || prev.value === 0) return null;
      return { date: latest.date, value: (latest.value - prev.value) / prev.value };
    case 'diff_x1000':
      if (!prev) return null;
      return { date: latest.date, value: (latest.value - prev.value) * 1000 };
    default:
      return null;
  }
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
    res
      .status(500)
      .json({ error: 'Falta configurar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Vercel.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const updated: { indicatorId: string; date: string; value: number }[] = [];
  const errors: { indicatorId: string; error: string }[] = [];

  for (const mapping of FRED_MAPPINGS) {
    try {
      const obs = await fetchObservations(mapping.seriesId, fredKey);
      const computed = computeValue(mapping.transform, obs);
      if (!computed) continue;
      const { error } = await supabase
        .from('indicator_overrides')
        .upsert({ indicator_id: mapping.indicatorId, date: computed.date, value: computed.value });
      if (error) throw new Error(error.message);
      updated.push({ indicatorId: mapping.indicatorId, ...computed });
    } catch (err) {
      errors.push({ indicatorId: mapping.indicatorId, error: (err as Error).message });
    }
  }

  try {
    const [walcl, gdp] = await Promise.all([
      fetchObservations(CBBS_MAPPING.balanceSheetSeriesId, fredKey, 4),
      fetchObservations(CBBS_MAPPING.gdpSeriesId, fredKey, 4),
    ]);
    if (walcl.length > 0 && gdp.length > 0) {
      const latestWalcl = walcl[walcl.length - 1];
      const latestGdp = gdp[gdp.length - 1];
      const pctGdp = latestWalcl.value / 1000 / latestGdp.value;
      const { error } = await supabase
        .from('indicator_overrides')
        .upsert({ indicator_id: CBBS_MAPPING.indicatorId, date: latestWalcl.date, value: pctGdp });
      if (error) throw new Error(error.message);
      updated.push({ indicatorId: CBBS_MAPPING.indicatorId, date: latestWalcl.date, value: pctGdp });
    }
  } catch (err) {
    errors.push({ indicatorId: CBBS_MAPPING.indicatorId, error: (err as Error).message });
  }

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
