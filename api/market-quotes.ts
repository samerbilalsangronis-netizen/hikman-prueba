import type { VercelRequest, VercelResponse } from '@vercel/node';

// Función serverless autocontenida (mismo motivo que fred-sync.ts/etc.:
// Vercel empaqueta cada función de /api por separado y no rastrea imports
// que crucen a /src). Reemplaza los widgets embebidos de TradingView —
// después de tres vueltas (Single Ticker: "solo disponible en TradingView"
// para bonos/futuros; Market Overview: oculta la columna de precio en
// anchos angostos como el celular; Symbol Overview: el usuario seguía sin
// ver el precio) se decidió traer los datos nosotros mismos con fuentes
// gratuitas verificadas:
// - Rendimientos 10Y: FRED (igual que el resto del dashboard), series OECD
//   "IRLTLT01_M156N" por país — todas confirmadas reales antes de cargarlas
//   (ver HANDOFF.md, sesión de este arreglo).
// - Acciones/ETF: Finnhub /quote (mismo proveedor que ya usa
//   headlines-sync.ts, necesita FINNHUB_API_KEY).
// - Divisas: Frankfurter.app (BCE, gratis, sin API key, sin límite de uso
//   documentado) — sustituye a los futuros de CME porque no existe una
//   fuente gratuita de futuros en tiempo real.

type Source = { type: 'fred'; seriesId: string } | { type: 'finnhub'; symbol: string } | { type: 'fx'; ccy: string; invert: boolean };

// "invert: true" = Frankfurter da "cuántos X por 1 USD" (base=USD); para las
// divisas que convencionalmente se cotizan como "cuántos USD por 1 X"
// (EUR, GBP, AUD, NZD) invertimos para mostrar el número en el formato
// habitual.
const SOURCES: Record<string, Source> = {
  nz10y: { type: 'fred', seriesId: 'IRLTLT01NZM156N' },
  de10y: { type: 'fred', seriesId: 'IRLTLT01DEM156N' },
  au10y: { type: 'fred', seriesId: 'IRLTLT01AUM156N' },
  us10y: { type: 'fred', seriesId: 'WGS10YR' },
  gb10y: { type: 'fred', seriesId: 'IRLTLT01GBM156N' },
  ca10y: { type: 'fred', seriesId: 'IRLTLT01CAM156N' },
  jp10y: { type: 'fred', seriesId: 'IRLTLT01JPM156N' },

  usdjpy: { type: 'fx', ccy: 'JPY', invert: false },
  audusd: { type: 'fx', ccy: 'AUD', invert: true },
  eurusd: { type: 'fx', ccy: 'EUR', invert: true },
  gbpusd: { type: 'fx', ccy: 'GBP', invert: true },
  nzdusd: { type: 'fx', ccy: 'NZD', invert: true },
  usdcad: { type: 'fx', ccy: 'CAD', invert: false },
  usdchf: { type: 'fx', ccy: 'CHF', invert: false },

  vwo: { type: 'finnhub', symbol: 'VWO' },
  dji: { type: 'finnhub', symbol: '^DJI' },
  nvda: { type: 'finnhub', symbol: 'NVDA' },
  aapl: { type: 'finnhub', symbol: 'AAPL' },
  lly: { type: 'finnhub', symbol: 'LLY' },
  meta: { type: 'finnhub', symbol: 'META' },
  brk_b: { type: 'finnhub', symbol: 'BRK.B' },
  tsla: { type: 'finnhub', symbol: 'TSLA' },
  avgo: { type: 'finnhub', symbol: 'AVGO' },
  amzn: { type: 'finnhub', symbol: 'AMZN' },
  msft: { type: 'finnhub', symbol: 'MSFT' },
  meli: { type: 'finnhub', symbol: 'MELI' },
  googl: { type: 'finnhub', symbol: 'GOOGL' },
  aal: { type: 'finnhub', symbol: 'AAL' },
};

interface Quote {
  /** Valor a mostrar (precio o rendimiento en %). */
  value: number;
  /** Cambio respecto al dato/cierre anterior. Para rendimientos es en puntos
   * porcentuales (pp); para acciones/divisas es % relativo. */
  delta: number;
  unit: 'pct' | 'price' | 'fx';
}

type QuoteResult = Quote | { error: string };

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchFredQuotes(ids: string[], apiKey: string): Promise<Record<string, QuoteResult>> {
  const out: Record<string, QuoteResult> = {};
  await Promise.all(
    ids.map(async (id) => {
      const source = SOURCES[id];
      if (source.type !== 'fred') return;
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${source.seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { observations?: { date: string; value: string }[] };
        const obs = (json.observations ?? []).filter((o) => o.value !== '.');
        if (obs.length === 0) throw new Error('sin observaciones');
        const value = Number.parseFloat(obs[0].value);
        const previous = obs.length > 1 ? Number.parseFloat(obs[1].value) : value;
        out[id] = { value, delta: value - previous, unit: 'pct' };
      } catch (err) {
        out[id] = { error: (err as Error).message };
      }
    }),
  );
  return out;
}

async function fetchFinnhubQuotes(ids: string[], apiKey: string): Promise<Record<string, QuoteResult>> {
  const out: Record<string, QuoteResult> = {};
  await Promise.all(
    ids.map(async (id) => {
      const source = SOURCES[id];
      if (source.type !== 'finnhub') return;
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(source.symbol)}&token=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { c?: number; dp?: number };
        if (!json.c || json.c === 0) throw new Error('sin cotización (símbolo no soportado en el plan free de Finnhub)');
        out[id] = { value: json.c, delta: json.dp ?? 0, unit: 'price' };
      } catch (err) {
        out[id] = { error: (err as Error).message };
      }
    }),
  );
  return out;
}

async function fetchFxQuotes(ids: string[]): Promise<Record<string, QuoteResult>> {
  const out: Record<string, QuoteResult> = {};
  const currencies = ids.map((id) => (SOURCES[id] as Extract<Source, { type: 'fx' }>).ccy);
  const list = currencies.join(',');
  try {
    const [latestRes, pastRes] = await Promise.all([
      fetch(`https://api.frankfurter.dev/v1/latest?from=USD&to=${list}`),
      fetch(`https://api.frankfurter.dev/v1/${daysAgoIso(7)}?from=USD&to=${list}`),
    ]);
    if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
    const latest = (await latestRes.json()) as { rates: Record<string, number> };
    const past = pastRes.ok ? ((await pastRes.json()) as { rates: Record<string, number> }) : null;

    for (const id of ids) {
      const source = SOURCES[id] as Extract<Source, { type: 'fx' }>;
      const rate = latest.rates[source.ccy];
      if (rate === undefined) {
        out[id] = { error: 'moneda no encontrada en Frankfurter' };
        continue;
      }
      const priorRate = past?.rates[source.ccy];
      const value = source.invert ? 1 / rate : rate;
      const priorValue = priorRate ? (source.invert ? 1 / priorRate : priorRate) : value;
      const delta = priorValue !== 0 ? ((value - priorValue) / priorValue) * 100 : 0;
      out[id] = { value, delta, unit: 'fx' };
    }
  } catch (err) {
    for (const id of ids) out[id] = { error: (err as Error).message };
  }
  return out;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const fredKey = process.env.FRED_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  const fredIds = Object.keys(SOURCES).filter((id) => SOURCES[id].type === 'fred');
  const finnhubIds = Object.keys(SOURCES).filter((id) => SOURCES[id].type === 'finnhub');
  const fxIds = Object.keys(SOURCES).filter((id) => SOURCES[id].type === 'fx');

  const quotes: Record<string, QuoteResult> = {};
  const errors: string[] = [];

  if (fredKey) {
    Object.assign(quotes, await fetchFredQuotes(fredIds, fredKey));
  } else {
    errors.push('Falta FRED_API_KEY en Vercel — sin eso no se pueden traer los rendimientos 10Y.');
    for (const id of fredIds) quotes[id] = { error: 'falta FRED_API_KEY' };
  }

  if (finnhubKey) {
    Object.assign(quotes, await fetchFinnhubQuotes(finnhubIds, finnhubKey));
  } else {
    errors.push('Falta FINNHUB_API_KEY en Vercel — sin eso no se pueden traer acciones/ETF (free en finnhub.io/register).');
    for (const id of finnhubIds) quotes[id] = { error: 'falta FINNHUB_API_KEY' };
  }

  Object.assign(quotes, await fetchFxQuotes(fxIds));

  // Cache corto en el edge de Vercel: estos precios no cambian segundo a
  // segundo para el uso de este dashboard, y así evitamos pegarle a
  // FRED/Finnhub/Frankfurter en cada visita a la página.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
  res.status(200).json({ quotes, errors, fetchedAt: new Date().toISOString() });
}
