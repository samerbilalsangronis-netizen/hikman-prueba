import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Función serverless autocontenida (mismo motivo que fred-sync.ts: Vercel
// empaqueta cada función de /api por separado y no rastrea imports que
// cruzan a /src).
//
// Trae el tipo de cambio SPOT diario de cada divisa contra el USD desde el
// H.10 de la Reserva Federal (vía FRED, mismo FRED_API_KEY que ya usa
// fred-sync.ts) — a diferencia del resto de la app, esto NO son
// indicadores económicos (releases puntuales), es precio de mercado
// continuo, para el índice de Fortaleza de Divisa "estilo EMA" que pidió
// el usuario (ago-2026), calculado por triangulación de cruces en el
// frontend a partir de estas 8 series.
//
// Ojo con la convención de cada serie — la Fed no es consistente: algunas
// cotizan USD por 1 unidad de la divisa (EUR/GBP/AUD/NZD), otras cotizan la
// divisa por 1 USD (JPY/CAD/CHF/CNY). Se guardan TODAS ya normalizadas a
// "USD por 1 unidad de la divisa" (invirtiendo estas últimas 4) para que el
// frontend no tenga que pensar en la convención de cada una — verificado
// serie por serie contra la página pública de FRED antes de escribir esto
// (unidades exactas, no wikipedia/memoria):
//   DEXUSEU "U.S. Dollars to One Euro"            -> USD/EUR directo
//   DEXUSUK "U.S. Dollars to One U.K. Pound"       -> USD/GBP directo
//   DEXUSAL "U.S. Dollars to One Australian Dollar"-> USD/AUD directo
//   DEXUSNZ "U.S. Dollars to One New Zealand Dollar"-> USD/NZD directo
//   DEXJPUS "Japanese Yen to One U.S. Dollar"      -> JPY/USD, invertir
//   DEXCAUS "Canadian Dollars to One U.S. Dollar"  -> CAD/USD, invertir
//   DEXSZUS "Swiss Francs to One U.S. Dollar"      -> CHF/USD, invertir
//   DEXCHUS "Chinese Yuan Renminbi to One U.S. Dollar" -> CNY/USD, invertir
// USD mismo no necesita fila — vale 1 por definición, el frontend lo trata
// como caso especial.
interface FxMapping {
  indicatorId: string;
  seriesId: string;
  invert: boolean;
}

const FX_MAPPINGS: FxMapping[] = [
  { indicatorId: 'fx_eur_usd', seriesId: 'DEXUSEU', invert: false },
  { indicatorId: 'fx_gbp_usd', seriesId: 'DEXUSUK', invert: false },
  { indicatorId: 'fx_aud_usd', seriesId: 'DEXUSAL', invert: false },
  { indicatorId: 'fx_nzd_usd', seriesId: 'DEXUSNZ', invert: false },
  { indicatorId: 'fx_jpy_usd', seriesId: 'DEXJPUS', invert: true },
  { indicatorId: 'fx_cad_usd', seriesId: 'DEXCAUS', invert: true },
  { indicatorId: 'fx_chf_usd', seriesId: 'DEXSZUS', invert: true },
  { indicatorId: 'fx_cny_usd', seriesId: 'DEXCHUS', invert: true },
];

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
// ~4 meses de días hábiles de margen — alcanza para la ventana más larga
// que ofrece el frontend (1A pide igual, pero el sync corre cada 30min así
// que 1A se termina completando solo con el correr de los días; lo
// importante acá es no quedarse corto para 1M/3M).
const FETCH_LIMIT = 260;
const BACKFILL_LIMIT = 250;

interface Observation {
  date: string;
  value: number;
}

async function fetchObservations(seriesId: string, apiKey: string): Promise<Observation[]> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${FETCH_LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
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

  for (const mapping of FX_MAPPINGS) {
    try {
      const obs = await fetchObservations(mapping.seriesId, fredKey);
      const series = obs.map((o) => ({ date: o.date, value: mapping.invert ? 1 / o.value : o.value })).slice(-BACKFILL_LIMIT);
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

  res.status(200).json({ updated, errors, syncedAt: new Date().toISOString() });
}
