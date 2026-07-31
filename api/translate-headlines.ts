import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Backfill de traducción: api/headlines-sync.ts solo traduce titulares
// NUEVOS al insertarlos (el upsert usa ignoreDuplicates, así que un
// titular que ya existía nunca se vuelve a tocar). Esta función aparte
// busca los que quedaron sin traducir — típicamente porque ya estaban
// cargados desde antes de que existiera esta funcionalidad, o porque
// MyMemory falló puntualmente en su momento — y los traduce ahora. No
// toca cargas manuales (`is_manual = true`, ya están en español).
//
// Mismo motivo de función serverless autocontenida que el resto de /api
// (Vercel empaqueta cada una por separado, no rastrea imports a /src).

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

  const { data: pending, error: fetchError } = await supabase
    .from('headlines')
    .select('id, title')
    .eq('is_manual', false)
    .is('title_es', null)
    .limit(200); // tope por corrida para no pasarse del tiempo máximo de la función serverless

  if (fetchError) {
    res.status(500).json({ error: fetchError.message });
    return;
  }

  let translated = 0;
  const errors: string[] = [];
  for (const row of pending ?? []) {
    const titleEs = await translateToSpanish(row.title);
    if (!titleEs) {
      errors.push(`${row.id}: no se pudo traducir`);
      continue;
    }
    const { error: updateError } = await supabase.from('headlines').update({ title_es: titleEs }).eq('id', row.id);
    if (updateError) {
      errors.push(`${row.id}: ${updateError.message}`);
    } else {
      translated += 1;
    }
  }

  res.status(200).json({ found: pending?.length ?? 0, translated, errors });
}
