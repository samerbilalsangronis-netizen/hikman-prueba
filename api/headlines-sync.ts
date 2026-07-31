import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts / etc.:
// Vercel empaqueta cada función de /api por separado y no rastrea imports
// que cruzan a /src).
//
// Trae titulares de alto impacto de Finnhub (categoría "forex", requiere
// FINNHUB_API_KEY, free tier en finnhub.io) — noticias reales, no
// releases programados de calendario económico (eso va en "Actualizar
// Datos"/DATOS_ECO, no en Titulares — pedido explícito del usuario:
// Titulares es para noticias, no para datos económicos). Se filtra para
// quedarse solo con lo que afecta G10 + CNY + rendimientos de bonos +
// renta variable mayor — todo lo demás se descarta antes de llegar a
// Supabase.
//
// Antes también traía el calendario económico de Forex Factory (sin key) —
// se sacó a pedido del usuario (31-jul-2026): esos releases programados
// (CPI, NFP, PMI, etc.) no son "titulares", son datos económicos, y
// generaban ruido en la sección. Si se quiere retomar, ver el historial de
// git de este archivo (`fetchForexFactoryHeadlines`, con el bug de la URL
// `cdn-nfs.faireconomy.media` ya corregido a `nfs.faireconomy.media`).

// Hash corto y determinístico (no criptográfico, no hace falta) para armar
// un id estable a partir de fuente+título+fecha — permite upsertear sin
// duplicar el mismo titular en cada corrida del sync.
function stableId(prefix: string, parts: string[]): string {
  const input = parts.join('|');
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

interface HeadlineRow {
  id: string;
  title: string;
  source: string;
  url: string | null;
  published_at: string;
  impact: 'alto' | 'medio' | 'bajo';
  tags: string[];
  is_manual: boolean;
  pinned: boolean;
  title_es: string | null;
}

// MyMemory (mymemory.translated.net): gratis, sin API key, confirmado con
// una prueba manual antes de usarlo (mismo criterio que con Forex
// Factory/Frankfurter — no asumir que una API de terceros funciona sin
// probarla). Límite generoso para este volumen (unas pocas decenas de
// titulares por sync) en el tier anónimo. Si falla o se corta, no rompe el
// sync — el titular queda sin traducción (title_es null) en vez de
// bloquear el resto.
async function translateToSpanish(text: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { responseData?: { translatedText?: string } };
    return json.responseData?.translatedText || null;
  } catch {
    return null;
  }
}

interface FinnhubNewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number; // unix seconds
}

const CURRENCY_KEYWORDS: Record<string, string[]> = {
  USD: ['dollar', 'usd', 'fed ', 'federal reserve', 'fomc', 'powell'],
  EUR: ['euro', 'eur', 'ecb', 'lagarde', 'eurozone'],
  GBP: ['pound', 'sterling', 'gbp', 'boe', 'bank of england'],
  JPY: ['yen', 'jpy', 'boj', 'bank of japan'],
  CHF: ['franc', 'chf', 'snb', 'swiss national bank'],
  CAD: ['loonie', 'cad', 'bank of canada', 'boc '],
  AUD: ['aussie', 'aud', 'rba', 'reserve bank of australia'],
  NZD: ['kiwi', 'nzd', 'rbnz'],
  SEK: ['krona', 'sek', 'riksbank'],
  NOK: ['krone', 'nok', 'norges bank'],
  CNY: ['yuan', 'renminbi', 'cny', 'china', 'pboc', "people's bank of china"],
};

const BOND_EQUITY_KEYWORDS = [
  'treasury',
  'yield',
  'bond',
  'gilt',
  'bund',
  'jgb',
  's&p 500',
  'nasdaq',
  'dow jones',
  'stock market',
  'equities',
  'wall street',
];

const HIGH_IMPACT_KEYWORDS = [
  'rate decision',
  'interest rate',
  'rate hike',
  'rate cut',
  'cpi',
  'inflation',
  'nonfarm payrolls',
  'nfp',
  'gdp',
  'recession',
  'war',
  'invasion',
  'default',
  'crisis',
  'tariff',
];

const MEDIUM_IMPACT_KEYWORDS = ['pmi', 'retail sales', 'unemployment', 'trade balance', 'consumer confidence', 'business confidence', 'sanctions'];

function classifyFinnhubHeadline(text: string): { impact: 'alto' | 'medio' | 'bajo'; tags: string[] } | null {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const [currency, keywords] of Object.entries(CURRENCY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) tags.push(currency);
  }
  const mentionsBondsOrEquities = BOND_EQUITY_KEYWORDS.some((k) => lower.includes(k));
  if (mentionsBondsOrEquities) tags.push('Bonos/Renta variable');

  if (tags.length === 0) return null; // no relevante: no menciona G10/CNY ni bonos/renta variable

  if (HIGH_IMPACT_KEYWORDS.some((k) => lower.includes(k))) return { impact: 'alto', tags };
  if (MEDIUM_IMPACT_KEYWORDS.some((k) => lower.includes(k))) return { impact: 'medio', tags };
  return { impact: 'bajo', tags };
}

async function fetchFinnhubHeadlines(apiKey: string): Promise<HeadlineRow[]> {
  const url = `https://finnhub.io/api/v1/news?category=forex&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub: HTTP ${res.status}`);
  const items = (await res.json()) as FinnhubNewsItem[];

  const out: HeadlineRow[] = [];
  for (const item of items) {
    const classified = classifyFinnhubHeadline(`${item.headline} ${item.summary ?? ''}`);
    if (!classified) continue;
    out.push({
      id: stableId('finnhub', [String(item.id)]),
      title: item.headline,
      source: item.source || 'Finnhub',
      url: item.url || null,
      published_at: new Date(item.datetime * 1000).toISOString(),
      impact: classified.impact,
      tags: classified.tags,
      is_manual: false,
      pinned: false,
      title_es: await translateToSpanish(item.headline),
    });
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
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Falta configurar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Vercel.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const errors: { fuente: string; error: string }[] = [];
  let rows: HeadlineRow[] = [];

  if (!finnhubKey) {
    errors.push({ fuente: 'Finnhub', error: 'Falta la variable de entorno FINNHUB_API_KEY en Vercel (key gratis en finnhub.io).' });
  } else {
    try {
      rows = rows.concat(await fetchFinnhubHeadlines(finnhubKey));
    } catch (err) {
      errors.push({ fuente: 'Finnhub', error: (err as Error).message });
    }
  }

  let inserted = 0;
  if (rows.length > 0) {
    // No pisa pinned/is_manual si el titular ya existía (upsert normal
    // actualizaría todas las columnas) — se filtran esas dos columnas del
    // payload y se dejan como están la primera vez que se insertan (false).
    const { error } = await supabase.from('headlines').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      errors.push({ fuente: 'Supabase', error: error.message });
    } else {
      inserted = rows.length;
    }
  }

  res.status(200).json({ found: rows.length, inserted, errors, syncedAt: new Date().toISOString() });
}
