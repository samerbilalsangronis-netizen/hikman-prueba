import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts
// / gbp-sync.ts / cad-sync.ts: Vercel empaqueta cada función de /api por
// separado y no rastrea imports que cruzan a /src).
//
// AUD se sincroniza desde la ABS Data API (data.api.abs.gov.au, SDMX 2.1,
// sin key) + el CSV público del RBA (sin key). PMI y encuestas de confianza
// (privados, sin API gratis) quedan manuales — ver indicatorsAud.ts.

const BACKFILL_MONTHS = 36;
const ABS_START_PERIOD_M = '2015-01';
const ABS_START_PERIOD_Q = '2015-Q1';

interface Observation {
  date: string; // YYYY-MM-01
  value: number;
}

// --- ABS Data API -----------------------------------------------------------

interface AbsObservation {
  period: string; // '2026-05' o '2026-Q1'
  value: number;
}

function periodToDate(period: string): string {
  if (period.includes('Q')) {
    const [y, q] = period.split('-Q');
    const month = (Number(q) - 1) * 3 + 1;
    return `${y}-${String(month).padStart(2, '0')}-01`;
  }
  const [y, m] = period.split('-');
  return `${y}-${m}-01`;
}

async function fetchAbsSeries(dataflow: string, key: string, startPeriod: string): Promise<AbsObservation[]> {
  const url = `https://data.api.abs.gov.au/rest/data/${dataflow}/${key}?format=jsondata&startPeriod=${startPeriod}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (HikmanDashboard sync bot)' } });
  if (!res.ok) throw new Error(`ABS ${dataflow}/${key}: HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      dataSets?: { series?: Record<string, { observations?: Record<string, [number | string | null, ...unknown[]]> }> }[];
      structures?: { dimensions?: { observation?: { values?: { id: string }[] }[] } }[];
    };
  };
  const series = json.data?.dataSets?.[0]?.series;
  const seriesKey = series ? Object.keys(series)[0] : undefined;
  if (!series || !seriesKey) throw new Error(`ABS ${dataflow}/${key}: sin series en la respuesta`);
  const observations = series[seriesKey].observations ?? {};
  const timeValues = json.data?.structures?.[0]?.dimensions?.observation?.[0]?.values ?? [];
  const out: AbsObservation[] = [];
  for (const [idx, obs] of Object.entries(observations)) {
    const raw = obs[0];
    if (raw === null || raw === undefined) continue;
    const period = timeValues[Number(idx)]?.id;
    if (!period) continue;
    out.push({ period, value: Number(raw) });
  }
  out.sort((a, b) => a.period.localeCompare(b.period));
  return out;
}

function shiftMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) - months;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

// Igual que shiftMonths pero para períodos trimestrales ABS ('YYYY-Qn') —
// shiftMonths no sirve acá porque intenta parsear "Qn" como número.
function shiftQuarters(yq: string, quarters: number): string {
  const [y, q] = yq.split('-Q').map(Number);
  const total = y * 4 + (q - 1) - quarters;
  const newY = Math.floor(total / 4);
  const newQ = (total % 4) + 1;
  return `${newY}-Q${newQ}`;
}

// Series de ABS que ya vienen como % (2.5 = 2.5%) -> se guardan como fracción.
async function pctSeries(dataflow: string, key: string, startPeriod: string): Promise<Observation[]> {
  const points = await fetchAbsSeries(dataflow, key, startPeriod);
  return points.map((p) => ({ date: periodToDate(p.period), value: p.value / 100 }));
}

// Empleo: ABS LF publica el nivel en miles de personas (M3) — se calcula la
// diferencia mes a mes y se multiplica x1000 para guardar en personas
// crudas, mismo transform que usa USD para NFP (diff_x1000).
async function employmentChangeSeries(): Promise<Observation[]> {
  const points = await fetchAbsSeries('LF', 'M3.3.1599.20.AUS.M', ABS_START_PERIOD_M);
  const byPeriod = new Map(points.map((p) => [p.period, p.value]));
  const out: Observation[] = [];
  for (const p of points) {
    const prev = byPeriod.get(shiftMonths(p.period, 1));
    if (prev !== undefined) out.push({ date: periodToDate(p.period), value: (p.value - prev) * 1000 });
  }
  return out;
}

// PIB a/a: ANA_AGG no publica el % interanual directo (solo t/t) — se
// deriva del nivel encadenado en volumen (M1), comparando contra el mismo
// trimestre del año anterior. Verificado contra el dato oficial (2.5% para
// el primer trimestre de 2026).
async function gdpYoySeries(): Promise<Observation[]> {
  const points = await fetchAbsSeries('ANA_AGG', 'M1.GPM.20.AUS.Q', ABS_START_PERIOD_Q);
  const byPeriod = new Map(points.map((p) => [p.period, p.value]));
  const out: Observation[] = [];
  for (const p of points) {
    const prev = byPeriod.get(shiftQuarters(p.period, 4));
    if (prev !== undefined && prev !== 0) out.push({ date: periodToDate(p.period), value: p.value / prev - 1 });
  }
  return out;
}

// Balanza comercial: ABS ITGS (International Trade in Goods), ya en
// millones de AUD, desestacionalizado — se guarda tal cual (mismo patrón
// que USD/CAD, format 'trade').
async function tradeBalanceSeries(): Promise<Observation[]> {
  const points = await fetchAbsSeries('ITGS', 'M1.170.20.AUS.M', ABS_START_PERIOD_M);
  return points.map((p) => ({ date: periodToDate(p.period), value: p.value }));
}

// --- RBA (CSV público, sin key) ---------------------------------------------

// Tabla F1.1 (Interest Rates and Yields — Money Market), columna Cash Rate
// Target, serie FIRMMCRT. CSV con BOM UTF-8, formato de fecha DD/MM/YYYY.
async function fetchRbaCashRate(): Promise<Observation[]> {
  const res = await fetch('https://www.rba.gov.au/statistics/tables/csv/f1.1-data.csv', {
    headers: { 'User-Agent': 'Mozilla/5.0 (HikmanDashboard sync bot)' },
  });
  if (!res.ok) throw new Error(`RBA F1.1: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buf).replace(/^﻿/, '');
  const lines = text.split('\n');
  const out: Observation[] = [];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - BACKFILL_MONTHS - 1);
  for (const line of lines) {
    const parts = line.split(',');
    const dateField = parts[0]?.trim();
    if (!dateField || !dateField.includes('/')) continue;
    const [d, m, y] = dateField.split('/');
    if (!d || !m || !y || Number.isNaN(Number(d)) || Number.isNaN(Number(m)) || Number.isNaN(Number(y))) continue;
    const val = parts[1]?.trim();
    if (!val) continue;
    const date = new Date(Number(y), Number(m) - 1, 1);
    if (date < cutoff) continue;
    out.push({ date: `${y}-${m.padStart(2, '0')}-01`, value: Number(val) / 100 });
  }
  return out;
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

  // Indicadores trimestrales de esta divisa (ver indicatorsAud.ts, frequency:
  // 'quarterly') — sus fechas siempre caen en enero/abril/julio/octubre. Si
  // alguna vez quedaron filas de un intento con otra granularidad (pasó con
  // aud_core_cpi/aud_weighted_median: una fuente mensual descartada dejó
  // filas huérfanas en meses "fuera de ciclo" que el frontend tomaba como
  // el dato más reciente por tener fecha más nueva que el trimestre real,
  // mostrando un número viejo/equivocado como si fuera el actual — ver
  // HANDOFF.md), se borran acá para que no puedan volver a colarse como "el
  // último punto" de la serie. aud_cpi/aud_cpi_yoy se sacaron de este set
  // al eliminar esos dos indicadores (ago-2026, ver indicatorsAud.ts
  // lección 8) — no hace falta la limpieza si ya no se sincronizan.
  const QUARTERLY_IDS = new Set([
    'aud_core_cpi', 'aud_core_cpi_yoy',
    'aud_weighted_median', 'aud_weighted_median_yoy',
    'aud_ppi_qoq', 'aud_ppi_yoy', 'aud_gdp_qoq', 'aud_gdp_yoy',
    'aud_wage_price_index', 'aud_wage_price_index_yoy',
  ]);

  async function cleanupOffCycleRows(indicatorId: string) {
    const { data, error } = await supabase
      .from('indicator_overrides')
      .select('date')
      .eq('indicator_id', indicatorId);
    if (error || !data) return;
    const offCycle = data
      .map((r) => r.date as string)
      .filter((d) => ![1, 4, 7, 10].includes(Number(d.slice(5, 7))));
    if (offCycle.length === 0) return;
    await supabase.from('indicator_overrides').delete().eq('indicator_id', indicatorId).in('date', offCycle);
  }

  async function syncSeries(indicatorId: string, series: Observation[]) {
    const trimmed = series.slice(-BACKFILL_MONTHS);
    if (trimmed.length === 0) return;
    const rows = trimmed.map((p) => ({ indicator_id: indicatorId, date: p.date, value: p.value }));
    const { error } = await supabase.from('indicator_overrides').upsert(rows);
    if (error) throw new Error(error.message);
    if (QUARTERLY_IDS.has(indicatorId)) await cleanupOffCycleRows(indicatorId);
    const latest = trimmed[trimmed.length - 1];
    updated.push({ indicatorId, date: latest.date, value: latest.value, points: trimmed.length });
  }

  const jobs: { id: string; run: () => Promise<Observation[]> }[] = [
    { id: 'aud_rba_rate', run: fetchRbaCashRate },
    // CPI headline trimestral (aud_cpi/aud_cpi_yoy) y CPI Mensual m/m
    // (aud_cpi_monthly) sacados del tablero a pedido del usuario (ago-2026,
    // ver indicatorsAud.ts lección 8) — Trimmed Mean/Weighted Median
    // (dataflow CPI_Q) y CPI Mensual Interanual (dataflow CPI v2.0.0,
    // FREQ=M) quedan.
    { id: 'aud_cpi_monthly_yoy', run: () => pctSeries('CPI', '3.10001.10.50.M', ABS_START_PERIOD_M) },
    { id: 'aud_core_cpi', run: () => pctSeries('CPI_Q', '2.999902.20.50.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_core_cpi_yoy', run: () => pctSeries('CPI_Q', '3.999902.20.50.Q', ABS_START_PERIOD_Q) },
    // Trimmed Mean MENSUAL a/a — mismo dataflow 'CPI' (no CPI_Q) que el
    // headline mensual de arriba, INDEX=999902 en vez de 10001. Verificado
    // contra la API en vivo antes de agregarla (ver lección 8). Solo el
    // a/a, no se pidió el m/m (MEASURE=2, también existe si hiciera falta).
    { id: 'aud_core_cpi_monthly_yoy', run: () => pctSeries('CPI', '3.999902.20.50.M', ABS_START_PERIOD_M) },
    { id: 'aud_weighted_median', run: () => pctSeries('CPI_Q', '2.999903.20.50.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_weighted_median_yoy', run: () => pctSeries('CPI_Q', '3.999903.20.50.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_ppi_qoq', run: () => pctSeries('PPI_FD', '2.TOT.TOT.TOTXE.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_ppi_yoy', run: () => pctSeries('PPI_FD', '3.TOT.TOT.TOTXE.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_unemployment', run: () => pctSeries('LF', 'M13.3.1599.20.AUS.M', ABS_START_PERIOD_M) },
    { id: 'aud_employment_change', run: employmentChangeSeries },
    // Wage Price Index — headline THRPEB ("Total hourly rates of pay
    // excluding bonuses"), no OHRPEB (ver indicatorsAud.ts lección 9: solo
    // THRPEB tiene la versión desestacionalizada, TSEST=20, vía esta API).
    { id: 'aud_wage_price_index', run: () => pctSeries('WPI', '2.THRPEB.7.TOT.20.AUS.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_wage_price_index_yoy', run: () => pctSeries('WPI', '3.THRPEB.7.TOT.20.AUS.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_retail_sales', run: () => pctSeries('HSI_M', '8.TOT.CUR.20.AUS.M', ABS_START_PERIOD_M) },
    { id: 'aud_retail_sales_yoy', run: () => pctSeries('HSI_M', '9.TOT.CUR.20.AUS.M', ABS_START_PERIOD_M) },
    { id: 'aud_gdp_qoq', run: () => pctSeries('ANA_AGG', 'M2.GPM.20.AUS.Q', ABS_START_PERIOD_Q) },
    { id: 'aud_gdp_yoy', run: gdpYoySeries },
    { id: 'aud_trade_balance', run: tradeBalanceSeries },
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
