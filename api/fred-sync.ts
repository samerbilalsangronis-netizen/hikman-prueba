import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Copia local e independiente de src/data/fredMappings.ts. Vercel empaqueta
// cada función de /api por separado y no logra rastrear imports que cruzan
// a /src (falla en runtime con ERR_MODULE_NOT_FOUND), así que esta función
// necesita su propia copia autocontenida. Si cambias el mapeo, actualiza
// también src/data/fredMappings.ts (se usa ahí solo para mostrar la
// insignia "FRED" en la UI).
type FredTransform = 'level_pct' | 'level' | 'level_div1000' | 'pct_change' | 'pct_change_yoy' | 'diff_x1000';

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
  { indicatorId: 'cpi_yoy', seriesId: 'CPIAUCSL', transform: 'pct_change_yoy' },
  { indicatorId: 'core_cpi_yoy', seriesId: 'CPILFESL', transform: 'pct_change_yoy' },
  { indicatorId: 'ppi_yoy', seriesId: 'PPIFIS', transform: 'pct_change_yoy' },
  { indicatorId: 'core_ppi_yoy', seriesId: 'PPIFES', transform: 'pct_change_yoy' },
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
// Cuántas observaciones traer de FRED para poder recalcular una ventana de
// histórico (no solo el último punto) y así darle a los gráficos más
// contexto reciente real.
const FETCH_LIMIT = 60;
// Cuántos puntos calculados guardamos como máximo por indicador en cada sync.
const BACKFILL_LIMIT = 36;

interface Observation {
  date: string;
  value: number;
}

async function fetchObservations(seriesId: string, apiKey: string, limit = FETCH_LIMIT): Promise<Observation[]> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeSeries(transform: FredTransform, obs: Observation[]): Observation[] {
  switch (transform) {
    case 'level_pct':
      return obs.map((o) => ({ date: o.date, value: o.value / 100 }));
    case 'level':
      return obs.map((o) => ({ date: o.date, value: o.value }));
    case 'level_div1000':
      return obs.map((o) => ({ date: o.date, value: o.value / 1000 }));
    case 'pct_change': {
      const out: Observation[] = [];
      for (let i = 1; i < obs.length; i++) {
        const prev = obs[i - 1];
        const cur = obs[i];
        if (prev.value !== 0) out.push({ date: cur.date, value: (cur.value - prev.value) / prev.value });
      }
      return out;
    }
    case 'pct_change_yoy': {
      // Asume observaciones mensuales sin huecos, así que compara contra el
      // valor 12 posiciones atrás (mismo mes, año anterior).
      const out: Observation[] = [];
      for (let i = 12; i < obs.length; i++) {
        const prev = obs[i - 12];
        const cur = obs[i];
        if (prev.value !== 0) out.push({ date: cur.date, value: (cur.value - prev.value) / prev.value });
      }
      return out;
    }
    case 'diff_x1000': {
      const out: Observation[] = [];
      for (let i = 1; i < obs.length; i++) {
        out.push({ date: obs[i].date, value: (obs[i].value - obs[i - 1].value) * 1000 });
      }
      return out;
    }
    default:
      return [];
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
  const updated: { indicatorId: string; date: string; value: number; points: number }[] = [];
  const errors: { indicatorId: string; error: string }[] = [];

  for (const mapping of FRED_MAPPINGS) {
    try {
      const obs = await fetchObservations(mapping.seriesId, fredKey);
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
    const [walcl, gdp] = await Promise.all([
      fetchObservations(CBBS_MAPPING.balanceSheetSeriesId, fredKey, 24),
      fetchObservations(CBBS_MAPPING.gdpSeriesId, fredKey, 12),
    ]);
    if (walcl.length > 0 && gdp.length > 0) {
      // Para cada fecha semanal de WALCL, usa el PIB nominal trimestral más
      // reciente disponible hasta esa fecha.
      const rows = walcl
        .map((w) => {
          const gdpAtDate = [...gdp].reverse().find((g) => g.date <= w.date);
          if (!gdpAtDate) return null;
          return {
            indicator_id: CBBS_MAPPING.indicatorId,
            date: w.date,
            value: w.value / 1000 / gdpAtDate.value,
          };
        })
        .filter((r): r is { indicator_id: string; date: string; value: number } => r !== null)
        .slice(-BACKFILL_LIMIT);
      if (rows.length > 0) {
        const { error } = await supabase.from('indicator_overrides').upsert(rows);
        if (error) throw new Error(error.message);
        const latest = rows[rows.length - 1];
        updated.push({ indicatorId: CBBS_MAPPING.indicatorId, date: latest.date, value: latest.value, points: rows.length });
      }
    }
  } catch (err) {
    errors.push({ indicatorId: CBBS_MAPPING.indicatorId, error: (err as Error).message });
  }

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
