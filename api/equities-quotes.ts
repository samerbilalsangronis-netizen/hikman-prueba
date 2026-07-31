import type { VercelRequest, VercelResponse } from '@vercel/node';

// Función serverless autocontenida (mismo motivo que el resto de los
// *-sync.ts: Vercel empaqueta cada función de /api por separado). A
// diferencia de los *-sync.ts, esta NO escribe en Supabase — la cotización
// se pide fresca en cada carga de la página de Renta Variable, no se
// guarda como serie histórica (no tiene sentido acumular "puntos" de un
// precio que cambia en vivo).
//
// Dos fuentes (ver src/data/equities.ts para el detalle de por qué):
// - Finnhub (api oficial, con key, tier gratis) — SOLO acciones de EE.UU.
// - Yahoo Finance (API no oficial, sin key) — todo lo demás, incluidos
//   TODOS los índices (Finnhub free no cotiza bien índices).

const USER_AGENT = 'Mozilla/5.0 (HikmanDashboard sync bot)';

interface QuoteResult {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  asOf: string;
}

async function fetchYahooQuote(symbol: string, label: string): Promise<QuoteResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Yahoo Finance ${symbol}: HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: {
        meta?: {
          regularMarketPrice?: number;
          previousClose?: number;
          chartPreviousClose?: number;
          currency?: string;
          regularMarketTime?: number;
        };
      }[];
      error?: { description?: string } | null;
    };
  };
  const meta = json.chart?.result?.[0]?.meta;
  if (!meta || meta.regularMarketPrice === undefined) {
    throw new Error(`Yahoo Finance ${symbol}: ${json.chart?.error?.description ?? 'sin datos'}`);
  }
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  let price = meta.regularMarketPrice;
  let currency = meta.currency ?? '';
  let prev = prevClose;
  // Las acciones de Londres cotizan en peniques (GBp/GBX), no en libras —
  // hay que dividir por 100 para que quede consistente con el resto de la
  // divisa GBP del dashboard.
  if (currency === 'GBp' || currency === 'GBX') {
    price = price / 100;
    if (prev !== undefined) prev = prev / 100;
    currency = 'GBP';
  }
  const change = prev !== undefined ? price - prev : 0;
  const changePercent = prev ? change / prev : 0;
  return {
    symbol,
    label,
    price,
    change,
    changePercent,
    currency,
    asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
  };
}

async function fetchFinnhubQuote(symbol: string, label: string, token: string): Promise<QuoteResult> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Finnhub ${symbol}: HTTP ${res.status}`);
  const json = (await res.json()) as { c?: number; d?: number; dp?: number; pc?: number; t?: number };
  if (json.c === undefined || json.c === 0) throw new Error(`Finnhub ${symbol}: sin datos`);
  return {
    symbol,
    label,
    price: json.c,
    change: json.d ?? 0,
    changePercent: (json.dp ?? 0) / 100,
    currency: 'USD',
    asOf: json.t ? new Date(json.t * 1000).toISOString() : new Date().toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const symbolsParam = req.query.symbols;
  const sourcesParam = req.query.sources;
  const labelsParam = req.query.labels;
  const symbols = (Array.isArray(symbolsParam) ? symbolsParam[0] : symbolsParam ?? '').split(',').filter(Boolean);
  const sources = (Array.isArray(sourcesParam) ? sourcesParam[0] : sourcesParam ?? '').split(',');
  const labels = (Array.isArray(labelsParam) ? labelsParam[0] : labelsParam ?? '').split(',');

  if (symbols.length === 0) {
    res.status(400).json({ error: 'Falta el parámetro symbols (lista separada por comas).' });
    return;
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  const quotes: QuoteResult[] = [];
  const errors: { symbol: string; error: string }[] = [];

  await Promise.all(
    symbols.map(async (symbol, i) => {
      const source = sources[i] ?? 'yahoo';
      const label = decodeURIComponent(labels[i] ?? symbol);
      try {
        if (source === 'finnhub') {
          if (!finnhubKey) throw new Error('Falta configurar FINNHUB_API_KEY en Vercel.');
          quotes.push(await fetchFinnhubQuote(symbol, label, finnhubKey));
        } else {
          quotes.push(await fetchYahooQuote(symbol, label));
        }
      } catch (err) {
        errors.push({ symbol, error: (err as Error).message });
      }
    }),
  );

  res.status(200).json({ quotes, errors, fetchedAt: new Date().toISOString() });
}
