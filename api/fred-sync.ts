import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { FRED_MAPPINGS, CBBS_MAPPING, type FredTransform } from '../src/data/fredMappings';

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
