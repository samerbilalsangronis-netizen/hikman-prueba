import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabaseClient';
import type { JournalColor, JournalEntry, JournalEntryKind, MentorAiAnalysis, MentorWeeklySynthesis, PinnedImage } from '../types';

// Cuaderno de Economía + Informe Diario de Mentoría (2-oct-2026) — mismo
// patrón que TradingJournalContext.tsx: Supabase como fuente de verdad, con
// localStorage de respaldo cuando Supabase no está configurado. Provider
// propio (no se suma a MacroDataContext, que ya es enorme) porque es otro
// dominio de datos independiente.

const ENTRIES_KEY = 'journal:entries:v1';
const SYNTHESES_KEY = 'journal:syntheses:v1';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms) esperando ${label}`)), ms))]);
}

function loadLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

interface JournalValue {
  entries: JournalEntry[];
  syntheses: MentorWeeklySynthesis[];
  loading: boolean;
  /** Crea o actualiza la entrada de (kind, date) — upsert por diseño, un solo registro por día. */
  saveEntry: (kind: JournalEntryKind, date: string, patch: { color?: JournalColor; text?: string; imageUrls?: string[]; pinnedImages?: PinnedImage[] }) => Promise<JournalEntry>;
  deleteEntry: (id: string) => Promise<void>;
  setAiAnalysis: (id: string, analysis: MentorAiAnalysis) => Promise<void>;
  uploadJournalImage: (file: File) => Promise<string>;
  addSynthesis: (weekStart: string, content: string) => Promise<void>;
}

const JournalContext = createContext<JournalValue | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadLocal(ENTRIES_KEY));
  const [syntheses, setSyntheses] = useState<MentorWeeklySynthesis[]>(() => loadLocal(SYNTHESES_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabaseEnabled || !supabase) {
        setLoading(false);
        return;
      }
      try {
        const [entriesRes, synthesesRes] = await withTimeout(
          Promise.all([
            supabase.from('journal_entries').select('*').order('entry_date', { ascending: true }),
            supabase.from('mentor_weekly_syntheses').select('*').order('week_start', { ascending: false }),
          ]),
          15000,
          'el Cuaderno de Economía',
        );
        if (cancelled) return;
        if (entriesRes.error || synthesesRes.error) throw entriesRes.error || synthesesRes.error;

        const loadedEntries: JournalEntry[] = (entriesRes.data ?? []).map((e) => ({
          id: e.id,
          kind: e.kind,
          date: e.entry_date,
          color: e.color,
          text: e.text ?? '',
          imageUrls: e.image_urls ?? [],
          pinnedImages: e.pinned_images ?? [],
          aiAnalysis: e.ai_analysis ?? undefined,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }));
        const loadedSyntheses: MentorWeeklySynthesis[] = (synthesesRes.data ?? []).map((s) => ({
          id: s.id,
          weekStart: s.week_start,
          content: s.content,
          createdAt: s.created_at,
        }));
        setEntries(loadedEntries);
        setSyntheses(loadedSyntheses);
      } catch (err) {
        console.error('No se pudo cargar el Cuaderno de Economía desde Supabase', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveEntry = useCallback(
    async (kind: JournalEntryKind, date: string, patch: { color?: JournalColor; text?: string; imageUrls?: string[]; pinnedImages?: PinnedImage[] }) => {
      const now = new Date().toISOString();
      let result!: JournalEntry;
      setEntries((prev) => {
        const existing = prev.find((e) => e.kind === kind && e.date === date);
        const next: JournalEntry = existing
          ? { ...existing, ...patch, updatedAt: now }
          : {
              id: crypto.randomUUID(),
              kind,
              date,
              color: patch.color ?? 'gris',
              text: patch.text ?? '',
              imageUrls: patch.imageUrls ?? [],
              pinnedImages: patch.pinnedImages ?? [],
              createdAt: now,
              updatedAt: now,
            };
        result = next;
        const updated = existing ? prev.map((e) => (e.id === existing.id ? next : e)) : [...prev, next];
        if (!supabaseEnabled) localStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
        return updated;
      });
      if (supabaseEnabled && supabase) {
        try {
          await supabase.from('journal_entries').upsert(
            {
              id: result.id,
              kind: result.kind,
              entry_date: result.date,
              color: result.color,
              text: result.text,
              image_urls: result.imageUrls,
              pinned_images: result.pinnedImages,
              updated_at: now,
            },
            { onConflict: 'kind,entry_date' },
          );
        } catch (err) {
          console.error('No se pudo guardar la entrada del cuaderno en Supabase', err);
        }
      }
      return result;
    },
    [],
  );

  const deleteEntry = useCallback(async (id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (!supabaseEnabled) localStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('journal_entries').delete().eq('id', id);
    } catch (err) {
      console.error('No se pudo borrar la entrada del cuaderno en Supabase', err);
    }
  }, []);

  const setAiAnalysis = useCallback(async (id: string, analysis: MentorAiAnalysis) => {
    const now = new Date().toISOString();
    setEntries((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, aiAnalysis: analysis, updatedAt: now } : e));
      if (!supabaseEnabled) localStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('journal_entries').update({ ai_analysis: analysis, updated_at: now }).eq('id', id);
    } catch (err) {
      console.error('No se pudo guardar el análisis de IA en Supabase', err);
    }
  }, []);

  const uploadJournalImage = useCallback(async (file: File) => {
    if (!supabaseEnabled || !supabase) {
      throw new Error('Subir imágenes necesita Supabase configurado.');
    }
    const path = `journal/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const addSynthesis = useCallback(async (weekStart: string, content: string) => {
    const next: MentorWeeklySynthesis = { id: crypto.randomUUID(), weekStart, content, createdAt: new Date().toISOString() };
    setSyntheses((prev) => {
      const updated = [next, ...prev.filter((s) => s.weekStart !== weekStart)];
      if (!supabaseEnabled) localStorage.setItem(SYNTHESES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('mentor_weekly_syntheses').upsert({ id: next.id, week_start: next.weekStart, content: next.content }, { onConflict: 'week_start' });
    } catch (err) {
      console.error('No se pudo guardar la síntesis semanal en Supabase', err);
    }
  }, []);

  const value = useMemo<JournalValue>(
    () => ({ entries, syntheses, loading, saveEntry, deleteEntry, setAiAnalysis, uploadJournalImage, addSynthesis }),
    [entries, syntheses, loading, saveEntry, deleteEntry, setAiAnalysis, uploadJournalImage, addSynthesis],
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal debe usarse dentro de JournalProvider');
  return ctx;
}
