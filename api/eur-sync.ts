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

// El HICP (CPI/core CPI de Eurozona/Alemania/Francia) se sincroniza vía
// prc_hicp_fpd (ver HICP_FPD_MAPPINGS más abajo), no FRED — FRED solo
// republica el dato FINAL de Eurostat con ~1 mes de rezago respecto al
// flash. Quedan acá solo las tasas del BCE y el PIB.
const EUR_FRED_MAPPINGS: FredMapping[] = [
  { indicatorId: 'eur_ecb_deposit_rate', seriesId: 'ECBDFR', transform: 'level_pct' },
  { indicatorId: 'eur_ecb_refi_rate', seriesId: 'ECBMRRFR', transform: 'level_pct' },
  { indicatorId: 'eur_ecb_marginal_rate', seriesId: 'ECBMLFR', transform: 'level_pct' },
  { indicatorId: 'eur_gdp_qoq', seriesId: 'CLVMNACSCAB1GQEA19', transform: 'pct_change_quarter' },
  { indicatorId: 'eur_gdp_yoy', seriesId: 'CLVMNACSCAB1GQEA19', transform: 'pct_change_yoy' },
];

// HICP vía Eurostat prc_hicp_fpd ("first released data") — a diferencia de
// prc_hicp_manr (discontinuado feb-2026) o de re-derivar desde el índice de
// FRED (sesgo de ~0.1pp, ver historial de commits), este dataset trae la
// tasa m/m y a/a YA CALCULADA por Eurostat, separada por vuelta de
// publicación (`release`: FLS=flash, ~1 semana después de terminado el mes;
// FIN=final/revisado, ~2-3 semanas después del flash). Pedimos las dos
// vueltas juntas (FIN+FLS) y nos quedamos con FIN cuando existe para un
// período, si no con FLS — como se guarda con la fecha del PERÍODO
// (YYYY-MM-01), no la de publicación, el upsert (indicator_id, date) hace
// que la corrida siguiente pise el valor flash con el final automáticamente
// en la MISMA fila apenas Eurostat lo publique, sin intervención manual.
// Verificado 1-ago-2026: EA20 headline flash jul-2026 2.9% (coincide con el
// comunicado de Eurostat del 31-jul), DE flash 2.8%, FR flash 2.4% (INSEE
// "résultats provisoires"), FIN de jun-2026 headline 2.7% (revisado a la
// baja desde el flash de 2.8% — la revisión real que motiva este cambio).
interface HicpFpdMapping {
  indicatorId: string;
  geo: string;
  coicop: string;
  unit: 'RCH_M' | 'RCH_A';
}

const HICP_FPD_MAPPINGS: HicpFpdMapping[] = [
  { indicatorId: 'eur_cpi', geo: 'EA20', coicop: 'TOTAL', unit: 'RCH_M' },
  { indicatorId: 'eur_cpi_yoy', geo: 'EA20', coicop: 'TOTAL', unit: 'RCH_A' },
  { indicatorId: 'eur_core_cpi', geo: 'EA20', coicop: 'TOT_X_NRG_FOOD', unit: 'RCH_M' },
  { indicatorId: 'eur_core_cpi_yoy', geo: 'EA20', coicop: 'TOT_X_NRG_FOOD', unit: 'RCH_A' },
  { indicatorId: 'eur_de_hicp_mom', geo: 'DE', coicop: 'TOTAL', unit: 'RCH_M' },
  { indicatorId: 'eur_de_hicp_yoy', geo: 'DE', coicop: 'TOTAL', unit: 'RCH_A' },
  { indicatorId: 'eur_fr_hicp_mom', geo: 'FR', coicop: 'TOTAL', unit: 'RCH_M' },
  { indicatorId: 'eur_fr_hicp_yoy', geo: 'FR', coicop: 'TOTAL', unit: 'RCH_A' },
];

const HICP_FPD_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/prc_hicp_fpd';

interface JsonStatDataset {
  id: string[];
  size: number[];
  value: Record<string, number>;
  status?: Record<string, string>;
  dimension: Record<string, { category: { index: Record<string, number> } }>;
}

async function fetchHicpFpd(mapping: HicpFpdMapping): Promise<Observation[]> {
  const url = `${HICP_FPD_BASE}/M.${mapping.unit}.${mapping.coicop}.FIN+FLS.${mapping.geo}?format=JSON`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Eurostat prc_hicp_fpd ${mapping.geo}/${mapping.coicop}/${mapping.unit}: HTTP ${res.status}`);
  const json = (await res.json()) as JsonStatDataset;
  const timeIndex = json.dimension.time.category.index;
  const releaseIndex = json.dimension.release.category.index;
  const nTime = json.size[json.id.indexOf('time')];
  const nRelease = json.size[json.id.indexOf('release')];
  const timeByPos = new Map(Object.entries(timeIndex).map(([k, v]) => [v, k]));
  const finPos = releaseIndex['FIN'];
  const flsPos = releaseIndex['FLS'];

  // period -> valor, prioridad FIN sobre FLS (se recorre FLS primero y se
  // pisa con FIN si también está disponible para ese mismo período).
  const byPeriod = new Map<string, number>();
  for (const releasePos of [flsPos, finPos]) {
    if (releasePos === undefined) continue;
    for (const [key, value] of Object.entries(json.value)) {
      const idx = Number(key);
      const timePos = idx % nTime;
      const thisReleasePos = Math.floor(idx / nTime) % nRelease;
      if (thisReleasePos !== releasePos) continue;
      const period = timeByPos.get(timePos);
      if (period === undefined) continue;
      byPeriod.set(`${period}-01`, value / 100);
    }
  }

  return Array.from(byPeriod.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Subcomponentes del PIB por el lado del gasto — Eurostat namq_10_gdp con
// unit=CON_PPCH_PRE ("contribution, percentage point change, previous
// period") YA trae la contribución calculada por Eurostat, dentro del
// mismo dataset que ya se usaba para los niveles (namq_10_exi solo tenía
// niveles, no contribución — CON_PPCH_PRE vive en namq_10_gdp). Igual que
// HICP: se guarda con la fecha del PERÍODO, así que quedar desactualizado
// respecto al headline (que sí se sincroniza rápido vía FRED) se corrige
// solo apenas Eurostat publique el detalle trimestral (~5-7 semanas
// después del flash, la "estimación regular"). Verificado 1-ago-2026:
// Q1-2026 Consumo +0.12pp + Gobierno +0.13pp + Inversión -0.07pp +
// Exp.Netas (P6+P7) -0.30pp ≈ -0.2% (coincide con el PIB real).
const NAMQ_GDP_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/namq_10_gdp';

const QUARTER_TO_MONTH: Record<string, string> = { Q1: '01', Q2: '04', Q3: '07', Q4: '10' };

async function fetchNamqContribution(naItem: string): Promise<Observation[]> {
  const url = `${NAMQ_GDP_BASE}/Q.CON_PPCH_PRE.SCA.${naItem}.EA20?format=JSON`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Eurostat namq_10_gdp ${naItem}: HTTP ${res.status}`);
  const json = (await res.json()) as JsonStatDataset;
  const timeIndex = json.dimension.time.category.index;
  const timeByPos = new Map(Object.entries(timeIndex).map(([k, v]) => [v, k]));
  const out: Observation[] = [];
  for (const [key, value] of Object.entries(json.value)) {
    const period = timeByPos.get(Number(key)); // "2026-Q1"
    if (period === undefined) continue;
    const [year, quarter] = period.split('-');
    out.push({ date: `${year}-${QUARTER_TO_MONTH[quarter]}-01`, value: value / 100 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function sumSeries(a: Observation[], b: Observation[]): Observation[] {
  const byDate = new Map(b.map((o) => [o.date, o.value]));
  const out: Observation[] = [];
  for (const oa of a) {
    const ob = byDate.get(oa.date);
    if (ob !== undefined) out.push({ date: oa.date, value: oa.value + ob });
  }
  return out;
}

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

// Producción industrial de la Eurozona: dataset sts_inpr_m, índice de nivel
// (I21, 2021=100), ajustado por estacionalidad y calendario (SCA), industria
// total sin construcción (nace_r2 B-D), Eurozona vigente (EA21, mismo
// motivo que EUROSTAT_UNEMPLOYMENT_URL). El m/m se deriva del nivel —
// Eurostat no lo publica ya calculado en este dataset (pctChangeByMonth,
// misma función que ya usa computeSeries para FRED).
//
// Reemplaza la carga manual anterior (17-ago-2026) — el usuario reportó el
// dato desactualizado, y al investigar resultó que la serie manual estaba
// MAL para prácticamente toda su historia (71 de 77 meses recientes no
// coincidían con este mismo dataset), no solo desactualizada. La causa más
// probable: el intento anterior de automatizar esto uso indic_bt='PROD'
// (código inválido para este dataset — la API lo acepta sin error mostrando
// la categoría vacía, en vez de rechazar la consulta) en vez de 'PRD', y
// geo='EA20' (código de Eurozona ya viejo) en vez de 'EA21' — exactamente
// el "no coincidió con el valor de referencia" que dejó anotado el código.
// Verificado 17-ago-2026 contra el comunicado oficial de Eurostat
// (13-ago-2026): jun-2026 0.0% m/m (estable) y may-2026 revisado a +0.3%
// (antes -0.2%) — ambos coinciden exacto con esta consulta.
const EUROSTAT_INDUSTRIAL_PRODUCTION_URL =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_inpr_m' +
  '?format=JSON&lang=EN&geo=EA21&s_adj=SCA&indic_bt=PRD&nace_r2=B-D&unit=I21&sinceTimePeriod=2015-01';

async function fetchEurostatIndustrialProductionLevel(): Promise<Observation[]> {
  const res = await fetch(EUROSTAT_INDUSTRIAL_PRODUCTION_URL);
  if (!res.ok) throw new Error(`Eurostat sts_inpr_m: HTTP ${res.status}`);
  const json = (await res.json()) as EurostatJsonStat;
  const timeIndex = json.dimension.time.category.index;
  const out: Observation[] = [];
  for (const [period, idx] of Object.entries(timeIndex)) {
    const raw = json.value[String(idx)];
    if (raw === undefined) continue;
    out.push({ date: `${period}-01`, value: raw });
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

  for (const mapping of HICP_FPD_MAPPINGS) {
    try {
      const series = (await fetchHicpFpd(mapping)).slice(-BACKFILL_LIMIT);
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

  const NAMQ_MAPPINGS: { indicatorId: string; naItem: string }[] = [
    { indicatorId: 'eur_gdp_consumption', naItem: 'P31_S14_S15' },
    { indicatorId: 'eur_gdp_government', naItem: 'P3_S13' },
    { indicatorId: 'eur_gdp_investment', naItem: 'P51G' },
  ];
  for (const mapping of NAMQ_MAPPINGS) {
    try {
      const series = (await fetchNamqContribution(mapping.naItem)).slice(-BACKFILL_LIMIT);
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
  // Exportaciones Netas = contribución de exportaciones (P6) + contribución
  // de importaciones (P7) — P7 ya viene con el signo correcto (negativo
  // cuando las importaciones suben), no hay que restar.
  try {
    const [xgs, mgs] = await Promise.all([fetchNamqContribution('P6'), fetchNamqContribution('P7')]);
    const series = sumSeries(xgs, mgs).slice(-BACKFILL_LIMIT);
    if (series.length > 0) {
      const rows = series.map((p) => ({ indicator_id: 'eur_gdp_net_exports', date: p.date, value: p.value }));
      const { error } = await supabase.from('indicator_overrides').upsert(rows);
      if (error) throw new Error(error.message);
      const latest = series[series.length - 1];
      updated.push({ indicatorId: 'eur_gdp_net_exports', date: latest.date, value: latest.value, points: series.length });
    }
  } catch (err) {
    errors.push({ indicatorId: 'eur_gdp_net_exports', error: (err as Error).message });
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

  // m/m y a/a comparten el mismo nivel — se pide una sola vez y se derivan
  // los dos, cada uno con su propio try/catch para que un error de escritura
  // en uno no tumbe al otro (mismo criterio que el resto de este archivo).
  try {
    const level = await fetchEurostatIndustrialProductionLevel();
    try {
      const series = pctChangeByMonth(level, 1).slice(-BACKFILL_LIMIT);
      if (series.length > 0) {
        const rows = series.map((p) => ({ indicator_id: 'eur_industrial_production', date: p.date, value: p.value }));
        const { error } = await supabase.from('indicator_overrides').upsert(rows);
        if (error) throw new Error(error.message);
        const latest = series[series.length - 1];
        updated.push({ indicatorId: 'eur_industrial_production', date: latest.date, value: latest.value, points: series.length });
      }
    } catch (err) {
      errors.push({ indicatorId: 'eur_industrial_production', error: (err as Error).message });
    }
    try {
      const series = pctChangeByMonth(level, 12).slice(-BACKFILL_LIMIT);
      if (series.length > 0) {
        const rows = series.map((p) => ({ indicator_id: 'eur_industrial_production_yoy', date: p.date, value: p.value }));
        const { error } = await supabase.from('indicator_overrides').upsert(rows);
        if (error) throw new Error(error.message);
        const latest = series[series.length - 1];
        updated.push({ indicatorId: 'eur_industrial_production_yoy', date: latest.date, value: latest.value, points: series.length });
      }
    } catch (err) {
      errors.push({ indicatorId: 'eur_industrial_production_yoy', error: (err as Error).message });
    }
  } catch (err) {
    errors.push({ indicatorId: 'eur_industrial_production', error: (err as Error).message });
    errors.push({ indicatorId: 'eur_industrial_production_yoy', error: (err as Error).message });
  }

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
