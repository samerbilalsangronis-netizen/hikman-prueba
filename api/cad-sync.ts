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

// Anualiza el t/t trimestral: qué pasaría si el ritmo de este trimestre se
// repitiera 4 trimestres seguidos — (1+t/t)^4−1, sobre el nivel real (no el
// t/t ya redondeado) — misma fórmula que usa JPY para su "PIB Anualizado".
function annualizedQoqByMonth(points: StatCanPoint[]): Observation[] {
  const byMonth = new Map(points.map((p) => [p.refPer, p.value]));
  const out: Observation[] = [];
  for (const p of points) {
    const prev = byMonth.get(shiftMonths(p.refPer, 3));
    if (prev !== undefined && prev !== 0) out.push({ date: `${p.refPer}-01`, value: (p.value / prev) ** 4 - 1 });
  }
  return out;
}

// Coordenadas StatCan verificadas contra el dato real antes de automatizar
// (ver indicatorsCad.ts):
// - CPI headline: el m/m "titular" que reportan medios/Trading Economics es
//   la serie SIN desestacionalizar (NSA, tabla 18-10-0004) — 1.0% para
//   mayo-2026, no el 0.5% desestacionalizado (SA, tabla 18-10-0006) que
//   StatCan destaca en su propio comunicado.
// - "Core CPI": NO es "ex alimentos y energía" — es la definición del BoC
//   "ex 8 componentes más volátiles" (tabla 18-10-0256). Mezcla NSA/SA
//   distinta por transform: m/m matchea con NSA (0.6%), a/a con SA (2.2%).
const STATCAN_SOURCES = {
  cpiAll: { productId: 18100004, coordinate: '2.2.0.0.0.0.0.0.0.0' }, // CPI NSA, all-items
  cpiCoreNsa: { productId: 18100256, coordinate: '1.5.0.0.0.0.0.0.0.0' }, // CPI ex-8-volátiles (BoC), NSA — para m/m
  cpiCoreSa: { productId: 18100256, coordinate: '1.8.0.0.0.0.0.0.0.0' }, // CPI ex-8-volátiles (BoC), SA — para a/a
  // CPI-median/CPI-trim: misma tabla 18-10-0256, ya publicadas directo como
  // tasa a/a (miembros 2 y 3). Antes venían del Valet del BoC, pero el BoC
  // actualiza sus tablas con REZAGO respecto a StatCan (el día del release
  // de CPI de jun-2026, StatCan ya tenía 1.9%/1.8% y el Valet seguía en
  // mayo) — el usuario lo notó porque el resto de las series CAD sí
  // actualizó y estas dos no. StatCan publica el mismo número, el mismo día.
  cpiMedian: { productId: 18100256, coordinate: '1.2.0.0.0.0.0.0.0.0' }, // CPI-median (a/a directo)
  cpiTrim: { productId: 18100256, coordinate: '1.3.0.0.0.0.0.0.0.0' }, // CPI-trim (a/a directo)
  unemployment: { productId: 14100287, coordinate: '1.7.1.1.1.1.0.0.0.0' },
  employment: { productId: 14100287, coordinate: '1.3.1.1.1.1.0.0.0.0' },
  gdp: { productId: 36100434, coordinate: '1.1.1.1.0.0.0.0.0.0' }, // All industries, chained 2017$, SAAR
  retail: { productId: 20100056, coordinate: '1.1.1.2.0.0.0.0.0.0' }, // Total retail sales, SA
  tradeBalance: { productId: 12100011, coordinate: '1.3.2.2.1.0.0.0.0.0' }, // Balance of payments basis, SA
  // PIB TRIMESTRAL (by income and expenditure) — distinto del PIB mensual
  // por industria de arriba (tabla 36100434). Ver lección 4 en
  // indicatorsCad.ts. Tabla 36-10-0104-01 trae una dimensión "Prices" con
  // el % de cambio t/t YA CALCULADO (member 7) además del nivel (member 1)
  // — no todas las tablas de StatCan tienen esto, la mayoría solo trae
  // niveles. Estimate 30 = "Gross domestic product at market prices".
  gdpQuarterlyPctChange: { productId: 36100104, coordinate: '1.7.1.30.0.0.0.0.0.0' },
  gdpQuarterlyLevel: { productId: 36100104, coordinate: '1.1.1.30.0.0.0.0.0.0' },
  // Deflactor del PIB trimestral — tabla separada (36-10-0106-01, "GDP
  // price indexes"), sin el % de cambio directo, se deriva del nivel.
  gdpQuarterlyPriceIndex: { productId: 36100106, coordinate: '1.1.25.0.0.0.0.0.0.0' },
};

// --- Bank of Canada Valet ---------------------------------------------------

// Series a nivel (tasa objetivo overnight) o ya publicadas como tasa a/a
// (CPI-trim, CPI-median) — todas vienen del Valet como "2.25" (%), se
// guardan como fracción.
async function fetchBocSeries(seriesCode: string): Promise<Observation[]> {
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - BACKFILL_MONTHS - 1);
  const isoDate = dateFrom.toISOString().slice(0, 10);
  const res = await fetch(`https://www.bankofcanada.ca/valet/observations/${seriesCode}/json?start_date=${isoDate}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (HikmanDashboard sync bot)' },
  });
  if (!res.ok) throw new Error(`BoC Valet ${seriesCode}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { d: string; [key: string]: unknown }[] };
  const byMonth = new Map<string, number>();
  for (const obs of json.observations ?? []) {
    const seriesVal = obs[seriesCode] as { v?: string } | undefined;
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
    { id: 'cad_boc_rate', run: () => fetchBocSeries('V39079') }, // Target for the overnight rate
    {
      id: 'cad_cpi_median',
      run: async () =>
        levelByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiMedian.productId, STATCAN_SOURCES.cpiMedian.coordinate, BACKFILL_MONTHS)).map((o) => ({
          date: o.date,
          value: o.value / 100,
        })),
    },
    {
      id: 'cad_cpi_trim',
      run: async () =>
        levelByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiTrim.productId, STATCAN_SOURCES.cpiTrim.coordinate, BACKFILL_MONTHS)).map((o) => ({
          date: o.date,
          value: o.value / 100,
        })),
    },
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
      run: async () =>
        pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiCoreNsa.productId, STATCAN_SOURCES.cpiCoreNsa.coordinate, BACKFILL_MONTHS + 13), 1),
    },
    {
      id: 'cad_core_cpi_yoy',
      run: async () =>
        pctChangeByMonth(await fetchStatCanVector(STATCAN_SOURCES.cpiCoreSa.productId, STATCAN_SOURCES.cpiCoreSa.coordinate, BACKFILL_MONTHS + 13), 12),
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
      id: 'cad_gdp_qoq',
      run: async () =>
        levelByMonth(
          await fetchStatCanVector(STATCAN_SOURCES.gdpQuarterlyPctChange.productId, STATCAN_SOURCES.gdpQuarterlyPctChange.coordinate, BACKFILL_MONTHS + 13),
        ).map((o) => ({ date: o.date, value: o.value / 100 })),
    },
    {
      id: 'cad_gdp_annualized_qoq',
      run: async () =>
        annualizedQoqByMonth(
          await fetchStatCanVector(STATCAN_SOURCES.gdpQuarterlyLevel.productId, STATCAN_SOURCES.gdpQuarterlyLevel.coordinate, BACKFILL_MONTHS + 13),
        ),
    },
    {
      id: 'cad_gdp_expenditure_yoy',
      run: async () =>
        pctChangeByMonth(
          await fetchStatCanVector(STATCAN_SOURCES.gdpQuarterlyLevel.productId, STATCAN_SOURCES.gdpQuarterlyLevel.coordinate, BACKFILL_MONTHS + 13),
          12,
        ),
    },
    {
      id: 'cad_gdp_deflator',
      run: async () =>
        pctChangeByMonth(
          await fetchStatCanVector(STATCAN_SOURCES.gdpQuarterlyPriceIndex.productId, STATCAN_SOURCES.gdpQuarterlyPriceIndex.coordinate, BACKFILL_MONTHS + 13),
          3,
        ),
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
