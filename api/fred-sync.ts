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
  fetchLimit?: number;
}

const FRED_MAPPINGS: FredMapping[] = [
  // DFEDTARU = límite superior del rango objetivo del FOMC (lo que reportan
  // medios/Investing.com como "la tasa de la Fed"). Es diaria pero solo
  // cambia ~8 veces al año (en cada reunión), así que pedimos una ventana
  // larga (2 años) y luego comprimimos los días repetidos.
  { indicatorId: 'fed_funds_rate', seriesId: 'DFEDTARU', transform: 'level_pct', fetchLimit: 800 },
  { indicatorId: 't10y', seriesId: 'WGS10YR', transform: 'level_pct' },
  { indicatorId: 'gdp_qoq', seriesId: 'A191RL1Q225SBEA', transform: 'level_pct' },
  // m/m usa las series ajustadas estacionalmente (SA) — es la convención
  // para comparar un mes contra el inmediatamente anterior.
  { indicatorId: 'cpi', seriesId: 'CPIAUCSL', transform: 'pct_change' },
  { indicatorId: 'core_cpi', seriesId: 'CPILFESL', transform: 'pct_change' },
  // PPIFGS/PPILFE (las series "clásicas") fueron descontinuadas por BLS/FRED
  // en dic-2015. PPIFIS/PPIFES son su continuación bajo la metodología
  // "Final Demand" vigente.
  { indicatorId: 'ppi', seriesId: 'PPIFIS', transform: 'pct_change' },
  { indicatorId: 'core_ppi', seriesId: 'PPIFES', transform: 'pct_change' },
  // a/a usa las series SIN ajuste estacional (NSA) — así es como BLS/prensa
  // calculan el "interanual" (comparar el mismo mes cancela la
  // estacionalidad, así que no hace falta la serie ajustada; usarla da un
  // número distinto al que reportan los medios).
  { indicatorId: 'cpi_yoy', seriesId: 'CPIAUCNS', transform: 'pct_change_yoy' },
  { indicatorId: 'core_cpi_yoy', seriesId: 'CPILFENS', transform: 'pct_change_yoy' },
  { indicatorId: 'ppi_yoy', seriesId: 'PPIFID', transform: 'pct_change_yoy' },
  { indicatorId: 'core_ppi_yoy', seriesId: 'PPICOR', transform: 'pct_change_yoy' },
  { indicatorId: 'nfp', seriesId: 'PAYEMS', transform: 'diff_x1000' },
  { indicatorId: 'unemployment', seriesId: 'UNRATE', transform: 'level_pct' },
  { indicatorId: 'wage_pct', seriesId: 'CES0500000003', transform: 'pct_change' },
  { indicatorId: 'jolts', seriesId: 'JTSJOL', transform: 'level_div1000' },
  // Crecimiento
  // A diferencia de CPI/PPI (BLS usa NSA para el a/a), Census y la Fed
  // calculan el interanual de ventas minoristas y producción industrial
  // con la serie AJUSTADA (SA) — verificado contra el dato real: con NSA
  // daba 5.25%/1.63%, con SA da 6.88%/1.67%, que es lo que coincide con la
  // fuente oficial. Cada agencia tiene su propia convención, no es universal.
  { indicatorId: 'gdp_deflator', seriesId: 'A191RI1Q225SBEA', transform: 'level_pct' },
  { indicatorId: 'retail_sales', seriesId: 'RSAFS', transform: 'pct_change' },
  { indicatorId: 'retail_sales_yoy', seriesId: 'RSAFS', transform: 'pct_change_yoy' },
  { indicatorId: 'core_retail_sales', seriesId: 'RSFSXMV', transform: 'pct_change' },
  { indicatorId: 'industrial_production', seriesId: 'INDPRO', transform: 'pct_change' },
  { indicatorId: 'industrial_production_yoy', seriesId: 'INDPRO', transform: 'pct_change_yoy' },
  { indicatorId: 'trade_balance', seriesId: 'BOPGSTB', transform: 'level' },
  { indicatorId: 'empire_state', seriesId: 'GACDISA066MSFRBNY', transform: 'level' },
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

// Retrocede `months` meses calendario sobre una fecha "YYYY-MM-DD" (las
// series mensuales de FRED siempre caen en el día 01).
function shiftMonths(date: string, months: number): string {
  const [y, m] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}-01`;
}

// Compara cada observación contra la de `monthsBack` meses calendario atrás,
// buscando por FECHA (no por posición en el arreglo). Así el cálculo es
// correcto aunque la serie tenga huecos (FRED a veces publica observaciones
// en blanco que quedan filtradas antes de llegar acá, lo que correría los
// índices si comparáramos por posición).
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
    case 'pct_change_yoy':
      return pctChangeByMonth(obs, 12);
    case 'diff_x1000': {
      const byDate = new Map(obs.map((o) => [o.date, o.value]));
      const out: Observation[] = [];
      for (const cur of obs) {
        const prevValue = byDate.get(shiftMonths(cur.date, 1));
        if (prevValue !== undefined) out.push({ date: cur.date, value: (cur.value - prevValue) * 1000 });
      }
      return out;
    }
    default:
      return [];
  }
}

// Colapsa corridas de valores idénticos consecutivos (útil para series tipo
// "escalón" como la tasa objetivo de la Fed, que se publica a diario pero
// solo cambia en las reuniones del FOMC) — conserva la fecha en que cada
// valor empezó a regir, y siempre conserva el último punto.
function dedupeConsecutive(series: Observation[]): Observation[] {
  const out: Observation[] = [];
  for (const point of series) {
    const last = out[out.length - 1];
    if (!last || last.value !== point.value) out.push(point);
  }
  if (series.length > 0) {
    const lastComputed = series[series.length - 1];
    const lastKept = out[out.length - 1];
    if (!lastKept || lastKept.date !== lastComputed.date) out.push(lastComputed);
  }
  return out;
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
      const obs = await fetchObservations(mapping.seriesId, fredKey, mapping.fetchLimit ?? FETCH_LIMIT);
      const series = dedupeConsecutive(computeSeries(mapping.transform, obs)).slice(-BACKFILL_LIMIT);
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
