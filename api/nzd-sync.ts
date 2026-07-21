import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { inflateRawSync } from 'node:zlib';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / eur-sync.ts
// / gbp-sync.ts / cad-sync.ts / aud-sync.ts: Vercel empaqueta cada función de
// /api por separado y no rastrea imports que cruzan a /src).
//
// NZD se sincroniza desde CSV públicos de Stats NZ (sin key) — CPI, PIB y
// Ventas Minoristas (Electronic Card Transactions). El RBNZ está bloqueado
// para fetch automatizado (Cloudflare devuelve 403 en todo el dominio) —
// OCR queda manual. Desempleo/Empleo (HLFS) y Balanza Comercial también
// quedan manuales — ver indicatorsNzd.ts para el detalle de cada decisión.
//
// Los releases de Stats NZ viven en una URL por trimestre/mes ("Download-
// data" de cada /information-releases/), no hay endpoint "dame el último
// dato" — se prueba el período actual y se retrocede si el release
// todavía no salió (fetchLatestQuarterly/fetchLatestMonthly).

const BACKFILL_POINTS = 40;
const USER_AGENT = 'Mozilla/5.0 (HikmanDashboard sync bot)';

interface Observation {
  date: string; // YYYY-MM-01
  value: number;
}

// --- Utilidades de fecha / período ------------------------------------------

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const QUARTER_END_MONTHS = [3, 6, 9, 12];

function currentQuarterEnd(d: Date): { year: number; month: number } {
  const m = d.getMonth() + 1;
  const q = Math.ceil(m / 3);
  return { year: d.getFullYear(), month: q * 3 };
}

function shiftQuarterEnd(year: number, month: number, quartersBack: number): { year: number; month: number } {
  let idx = QUARTER_END_MONTHS.indexOf(month) - quartersBack;
  let y = year;
  while (idx < 0) {
    idx += 4;
    y -= 1;
  }
  return { year: y, month: QUARTER_END_MONTHS[idx] };
}

function shiftMonthEnd(year: number, month: number, monthsBack: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) - monthsBack;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

// "2026.06" (formato de período de Stats NZ, mensual o trimestral) -> fecha.
function periodDotToDate(p: string): string {
  const [y, m] = p.split('.');
  return `${y}-${m.padStart(2, '0')}-01`;
}

function shiftPeriodDot(p: string, monthsBack: number): string {
  const [y, m] = p.split('.').map(Number);
  const total = y * 12 + (m - 1) - monthsBack;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}.${String(nm).padStart(2, '0')}`;
}

// "2026Q1" (formato de período del CSV de PIB) -> fecha.
function periodQToDate(p: string): string {
  const [y, q] = p.split('Q');
  const month = (Number(q) - 1) * 3 + 1;
  return `${y}-${String(month).padStart(2, '0')}-01`;
}

function shiftPeriodQ(p: string, quartersBack: number): string {
  const [y, q] = p.split('Q').map(Number);
  const total = y * 4 + (q - 1) - quartersBack;
  const ny = Math.floor(total / 4);
  const nq = (total % 4) + 1;
  return `${ny}Q${nq}`;
}

// --- CSV (quote-aware, Stats NZ a veces cita campos con comas) -------------

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

// --- Fetch con reintento hacia atrás (el release del período actual puede
// no haber salido todavía) ---------------------------------------------------

async function fetchLatestQuarterlyText(
  buildUrl: (year: number, monthName: string) => string,
  maxBack = 5,
): Promise<{ text: string; year: number; month: number }> {
  const start = currentQuarterEnd(new Date());
  let lastError = '';
  for (let back = 0; back <= maxBack; back++) {
    const { year, month } = shiftQuarterEnd(start.year, start.month, back);
    const monthName = MONTH_NAMES[month - 1];
    const url = buildUrl(year, monthName);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return { text: await res.text(), year, month };
    lastError = `HTTP ${res.status} en ${url}`;
  }
  throw new Error(`No se encontró release trimestral reciente de Stats NZ (${lastError})`);
}

async function fetchLatestMonthlyZipCsv(
  buildUrl: (year: number, monthName: string) => string,
  maxBack = 4,
): Promise<{ text: string; year: number; month: number }> {
  const now = new Date();
  const start = { year: now.getFullYear(), month: now.getMonth() + 1 };
  let lastError = '';
  for (let back = 0; back <= maxBack; back++) {
    const { year, month } = shiftMonthEnd(start.year, start.month, back);
    const monthName = MONTH_NAMES[month - 1];
    const url = buildUrl(year, monthName);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const csvBuf = extractSingleCsvFromZip(buf);
      return { text: csvBuf.toString('utf-8'), year, month };
    }
    lastError = `HTTP ${res.status} en ${url}`;
  }
  throw new Error(`No se encontró release mensual reciente de Stats NZ (${lastError})`);
}

// --- ZIP mínimo (sin dependencias) — busca la entrada .csv vía el Central
// Directory (robusto a streaming/data-descriptor, a diferencia de leer solo
// el local file header inicial). Los ZIP de Stats NZ traen un único CSV. ---

function extractSingleCsvFromZip(buf: Buffer): Buffer {
  const EOCD_SIG = 0x06054b50;
  const CD_SIG = 0x02014b50;
  let eocdOffset = -1;
  const minOffset = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('ZIP inválido: no se encontró el End Of Central Directory');

  const entryCount = buf.readUInt16LE(eocdOffset + 10);
  let offset = buf.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(offset) !== CD_SIG) throw new Error('ZIP inválido: central directory corrupto');
    const compressionMethod = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const fileNameLength = buf.readUInt16LE(offset + 28);
    const extraFieldLength = buf.readUInt16LE(offset + 30);
    const fileCommentLength = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const fileName = buf.toString('utf-8', offset + 46, offset + 46 + fileNameLength);

    if (fileName.toLowerCase().endsWith('.csv')) {
      const lfhFileNameLength = buf.readUInt16LE(localHeaderOffset + 26);
      const lfhExtraLength = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + lfhFileNameLength + lfhExtraLength;
      const compressedData = buf.subarray(dataStart, dataStart + compressedSize);
      if (compressionMethod === 0) return Buffer.from(compressedData);
      if (compressionMethod === 8) return inflateRawSync(compressedData);
      throw new Error(`ZIP: método de compresión no soportado (${compressionMethod})`);
    }
    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }
  throw new Error('ZIP: no se encontró un archivo .csv adentro');
}

// --- CPI (trimestral) — Consumers Price Index, "All Groups" (CPIQ.SE9A) ---

async function fetchCpiLevel(): Promise<Map<string, number>> {
  const { text } = await fetchLatestQuarterlyText(
    (year, monthName) =>
      `https://www.stats.govt.nz/assets/Uploads/Consumers-price-index/Consumers-price-index-${monthName}-${year}-quarter/Download-data/consumers-price-index-${monthName.toLowerCase()}-${year}-quarter-index-numbers.csv`,
  );
  const level = new Map<string, number>();
  for (const line of text.split('\n')) {
    const cols = parseCsvLine(line);
    if (cols[0] !== 'CPIQ.SE9A') continue;
    const value = Number(cols[2]);
    if (!cols[1] || Number.isNaN(value)) continue;
    level.set(cols[1], value);
  }
  if (level.size === 0) throw new Error('CPI de Stats NZ: no se encontró la serie CPIQ.SE9A en el CSV');
  return level;
}

function cpiQoqSeries(level: Map<string, number>): Observation[] {
  const out: Observation[] = [];
  for (const [period, value] of level) {
    const prev = level.get(shiftPeriodDot(period, 3));
    if (prev !== undefined && prev !== 0) out.push({ date: periodDotToDate(period), value: value / prev - 1 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function cpiYoySeries(level: Map<string, number>): Observation[] {
  const out: Observation[] = [];
  for (const [period, value] of level) {
    const prev = level.get(shiftPeriodDot(period, 12));
    if (prev !== undefined && prev !== 0) out.push({ date: periodDotToDate(period), value: value / prev - 1 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// --- PIB (trimestral) — Total GDP, chain-volume desestacionalizado --------

async function fetchGdpLevel(): Promise<Map<string, number>> {
  const { text } = await fetchLatestQuarterlyText(
    (year, monthName) =>
      `https://www.stats.govt.nz/assets/Uploads/Gross-domestic-product/Gross-domestic-product-${monthName}-${year}-quarter/Download-data/gross-domestic-product-${monthName.toLowerCase()}-${year}-quarter-visualisation.csv`,
  );
  const level = new Map<string, number>();
  for (const line of text.split('\n')) {
    const cols = parseCsvLine(line);
    if (cols[0] !== 'Total GDP') continue;
    const period = cols[3];
    const value = Number(cols[5]);
    if (!period || Number.isNaN(value)) continue;
    level.set(period, value);
  }
  if (level.size === 0) throw new Error('PIB de Stats NZ: no se encontró la serie "Total GDP" en el CSV');
  return level;
}

function gdpQoqSeries(level: Map<string, number>): Observation[] {
  const out: Observation[] = [];
  for (const [period, value] of level) {
    const prev = level.get(shiftPeriodQ(period, 1));
    if (prev !== undefined && prev !== 0) out.push({ date: periodQToDate(period), value: value / prev - 1 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function gdpYoySeries(level: Map<string, number>): Observation[] {
  const out: Observation[] = [];
  for (const [period, value] of level) {
    const prev = level.get(shiftPeriodQ(period, 4));
    if (prev !== undefined && prev !== 0) out.push({ date: periodQToDate(period), value: value / prev - 1 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// --- Ventas Minoristas (mensual) — Electronic Card Transactions, "RTS core
// industries" desestacionalizado (ECTM.S19S2 = nivel, ECTM.S19S2PC = m/m%) -

async function fetchEctSeries(): Promise<{ level: Map<string, number>; pctChange: Map<string, number> }> {
  const { text } = await fetchLatestMonthlyZipCsv(
    (year, monthName) =>
      `https://www.stats.govt.nz/assets/Uploads/Electronic-card-transactions/Electronic-card-transactions-${monthName}-${year}/Download-data/electronic-card-transactions-${monthName.toLowerCase()}-${year}.zip`,
  );
  const level = new Map<string, number>();
  const pctChange = new Map<string, number>();
  for (const line of text.split('\n')) {
    const cols = parseCsvLine(line);
    const ref = cols[0];
    const period = cols[1];
    const value = Number(cols[2]);
    if (!period || Number.isNaN(value)) continue;
    if (ref === 'ECTM.S19S2') level.set(period, value);
    if (ref === 'ECTM.S19S2PC') pctChange.set(period, value / 100);
  }
  if (level.size === 0 || pctChange.size === 0) throw new Error('Electronic Card Transactions: no se encontraron las series ECTM.S19S2 / ECTM.S19S2PC');
  return { level, pctChange };
}

function retailSalesMomSeries(pctChange: Map<string, number>): Observation[] {
  return [...pctChange.entries()].map(([period, value]) => ({ date: periodDotToDate(period), value })).sort((a, b) => a.date.localeCompare(b.date));
}

function retailSalesYoySeries(level: Map<string, number>): Observation[] {
  const out: Observation[] = [];
  for (const [period, value] of level) {
    const prev = level.get(shiftPeriodDot(period, 12));
    if (prev !== undefined && prev !== 0) out.push({ date: periodDotToDate(period), value: value / prev - 1 });
  }
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

  let cpiLevel: Map<string, number> | undefined;
  let gdpLevel: Map<string, number> | undefined;
  let ect: { level: Map<string, number>; pctChange: Map<string, number> } | undefined;

  const jobs: { id: string; run: () => Promise<Observation[]> }[] = [
    {
      id: 'nzd_cpi',
      run: async () => {
        cpiLevel ??= await fetchCpiLevel();
        return cpiQoqSeries(cpiLevel);
      },
    },
    {
      id: 'nzd_cpi_yoy',
      run: async () => {
        cpiLevel ??= await fetchCpiLevel();
        return cpiYoySeries(cpiLevel);
      },
    },
    {
      id: 'nzd_gdp_qoq',
      run: async () => {
        gdpLevel ??= await fetchGdpLevel();
        return gdpQoqSeries(gdpLevel);
      },
    },
    {
      id: 'nzd_gdp_yoy',
      run: async () => {
        gdpLevel ??= await fetchGdpLevel();
        return gdpYoySeries(gdpLevel);
      },
    },
    {
      id: 'nzd_retail_sales',
      run: async () => {
        ect ??= await fetchEctSeries();
        return retailSalesMomSeries(ect.pctChange);
      },
    },
    {
      id: 'nzd_retail_sales_yoy',
      run: async () => {
        ect ??= await fetchEctSeries();
        return retailSalesYoySeries(ect.level);
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
