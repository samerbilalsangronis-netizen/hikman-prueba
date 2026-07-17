import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import historicalSeries from './historical-series.json';
import { SCORE_SEED as USD_SCORE_SEED } from './scoreSeed';
import { EUR_SCORE_SEED } from './scoreSeedEur';

const SCORE_SEED = [...USD_SCORE_SEED, ...EUR_SCORE_SEED];
import { supabase, supabaseEnabled } from '../lib/supabaseClient';
import type { BankerNote, FomcProbabilities, ScoreRow, SeriesPoint } from '../types';

type SeriesMap = Record<string, SeriesPoint[]>;
type ForecastMap = Record<string, number>;
type FomcWatchMap = Record<string, FomcProbabilities>;
type BankerNotesMap = Record<string, BankerNote>;

const OVERRIDES_KEY = 'macro-dashboard:overrides:v1';
const SCORE_KEY = 'macro-dashboard:score:v1';
const FORECASTS_KEY = 'macro-dashboard:forecasts:v1';
const FOMC_WATCH_KEY = 'macro-dashboard:fomc-watch:v1';
const BANKER_NOTES_KEY = 'macro-dashboard:banker-notes:v1';

function loadLocalOverrides(): SeriesMap {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as SeriesMap) : {};
  } catch {
    return {};
  }
}

function loadLocalScore(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    return raw ? (JSON.parse(raw) as ScoreRow[]) : SCORE_SEED;
  } catch {
    return SCORE_SEED;
  }
}

function loadLocalForecasts(): ForecastMap {
  try {
    const raw = localStorage.getItem(FORECASTS_KEY);
    return raw ? (JSON.parse(raw) as ForecastMap) : {};
  } catch {
    return {};
  }
}

function loadLocalFomcWatch(): FomcWatchMap {
  try {
    const raw = localStorage.getItem(FOMC_WATCH_KEY);
    return raw ? (JSON.parse(raw) as FomcWatchMap) : {};
  } catch {
    return {};
  }
}

function loadLocalBankerNotes(): BankerNotesMap {
  try {
    const raw = localStorage.getItem(BANKER_NOTES_KEY);
    return raw ? (JSON.parse(raw) as BankerNotesMap) : {};
  } catch {
    return {};
  }
}

function mergeSeries(base: SeriesPoint[], overrides: SeriesPoint[]): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const [date, value] of base) map.set(date, value);
  for (const [date, value] of overrides) map.set(date, value);
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

// PostgREST (la API REST de Supabase) tiene un límite por página (db-max-rows,
// 1000 en este proyecto) — un solo .select() sin .range() se trunca en
// silencio, sin error, una vez que la tabla supera esa cantidad de filas. Con
// 41 indicadores USD + 20 EUR sincronizados mes a mes, indicator_overrides ya
// pasó los 1000 registros; sin paginar, los indicadores que quedan "después"
// del corte (según el orden que devuelva Postgres) se ven con menos
// historial del real, o directamente con el último dato de varios meses
// atrás. Se pagina hasta traer todas las filas.
async function fetchAllRows<T>(
  query: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

interface MacroDataContextValue {
  getSeries: (id: string) => SeriesPoint[];
  addPoint: (id: string, date: string, value: number) => Promise<void>;
  removeLastPoint: (id: string) => Promise<void>;
  scoreRows: ScoreRow[];
  updateScoreValoracion: (id: string, valoracion: number) => Promise<void>;
  forecasts: ForecastMap;
  updateForecast: (id: string, value: number) => Promise<void>;
  fomcWatch: FomcWatchMap;
  updateFomcWatch: (meetingDate: string, probabilities: FomcProbabilities) => Promise<void>;
  bankerNotes: BankerNotesMap;
  updateBankerNote: (bankerId: string, note: BankerNote) => Promise<void>;
  resetOverrides: () => Promise<void>;
  exportJson: () => string;
  loading: boolean;
  syncMode: 'cloud' | 'local';
  refresh: () => Promise<void>;
}

const MacroDataContext = createContext<MacroDataContextValue | null>(null);

export function MacroDataProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<SeriesMap>({});
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>(SCORE_SEED);
  const [forecasts, setForecasts] = useState<ForecastMap>({});
  const [fomcWatch, setFomcWatch] = useState<FomcWatchMap>({});
  const [bankerNotes, setBankerNotes] = useState<BankerNotesMap>({});
  const [loading, setLoading] = useState(supabaseEnabled);

  const base = historicalSeries as unknown as SeriesMap;

  const refresh = useCallback(async () => {
    if (!supabaseEnabled || !supabase) {
      setOverrides(loadLocalOverrides());
      setScoreRows(loadLocalScore());
      setForecasts(loadLocalForecasts());
      setFomcWatch(loadLocalFomcWatch());
      setBankerNotes(loadLocalBankerNotes());
      setLoading(false);
      return;
    }

    const client = supabase;
    const [pointsRows, scoreRes, forecastsRes, fomcRes, bankerRes] = await Promise.all([
      fetchAllRows<{ indicator_id: string; date: string; value: number }>(async (from, to) =>
        client.from('indicator_overrides').select('indicator_id, date, value').range(from, to),
      ),
      supabase.from('score_overrides').select('id, valoracion'),
      supabase.from('indicator_forecasts').select('indicator_id, forecast'),
      supabase.from('fomc_watch').select('meeting_date, prob_cut, prob_hold, prob_hike, note'),
      // banker_statements es una tabla nueva — si todavía no corriste el SQL
      // en Supabase (ver supabase/schema.sql), esto simplemente da error y se
      // ignora, sin romper el resto de la carga.
      supabase.from('banker_statements').select('banker_id, photo_url, statement_date, stance, summary, source_url'),
    ]);

    {
      const map: SeriesMap = {};
      for (const row of pointsRows) {
        (map[row.indicator_id] ??= []).push([row.date, row.value]);
      }
      setOverrides(map);
    }

    if (!scoreRes.error && scoreRes.data && scoreRes.data.length > 0) {
      const overridesById = new Map(
        (scoreRes.data as { id: string; valoracion: number }[]).map((r) => [r.id, r.valoracion]),
      );
      setScoreRows(SCORE_SEED.map((row) => ({ ...row, valoracion: overridesById.get(row.id) ?? row.valoracion })));
    }

    if (!forecastsRes.error && forecastsRes.data) {
      const map: ForecastMap = {};
      for (const row of forecastsRes.data as { indicator_id: string; forecast: number }[]) {
        map[row.indicator_id] = row.forecast;
      }
      setForecasts(map);
    }

    if (!fomcRes.error && fomcRes.data) {
      const map: FomcWatchMap = {};
      for (const row of fomcRes.data as {
        meeting_date: string;
        prob_cut: number;
        prob_hold: number;
        prob_hike: number;
        note: string | null;
      }[]) {
        map[row.meeting_date] = {
          probCut: row.prob_cut,
          probHold: row.prob_hold,
          probHike: row.prob_hike,
          note: row.note ?? '',
        };
      }
      setFomcWatch(map);
    }

    if (!bankerRes.error && bankerRes.data) {
      const map: BankerNotesMap = {};
      for (const row of bankerRes.data as {
        banker_id: string;
        photo_url: string | null;
        statement_date: string | null;
        stance: 'hawkish' | 'dovish' | 'neutral' | null;
        summary: string | null;
        source_url: string | null;
      }[]) {
        map[row.banker_id] = {
          photoUrl: row.photo_url ?? undefined,
          statementDate: row.statement_date ?? undefined,
          stance: row.stance ?? undefined,
          summary: row.summary ?? undefined,
          sourceUrl: row.source_url ?? undefined,
        };
      }
      setBankerNotes(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const getSeries = useCallback(
    (id: string) => mergeSeries(base[id] ?? [], overrides[id] ?? []),
    [base, overrides],
  );

  const addPoint = useCallback(async (id: string, date: string, value: number) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('indicator_overrides').upsert({ indicator_id: id, date, value });
    }
    setOverrides((prev) => {
      const next = { ...prev, [id]: [...(prev[id] ?? []).filter(([d]) => d !== date), [date, value] as SeriesPoint] };
      if (!supabaseEnabled) localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeLastPoint = useCallback(async (id: string) => {
    setOverrides((prev) => {
      const list = prev[id] ?? [];
      if (list.length === 0) return prev;
      const sorted = [...list].sort(([a], [b]) => a.localeCompare(b));
      const removedDate = sorted[sorted.length - 1][0];
      const next = { ...prev, [id]: list.filter(([d]) => d !== removedDate) };
      if (supabaseEnabled && supabase) {
        supabase.from('indicator_overrides').delete().eq('indicator_id', id).eq('date', removedDate);
      } else {
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const updateScoreValoracion = useCallback(async (id: string, valoracion: number) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('score_overrides').upsert({ id, valoracion });
    }
    setScoreRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, valoracion } : r));
      if (!supabaseEnabled) localStorage.setItem(SCORE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateForecast = useCallback(async (id: string, value: number) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('indicator_forecasts').upsert({ indicator_id: id, forecast: value });
    }
    setForecasts((prev) => {
      const next = { ...prev, [id]: value };
      if (!supabaseEnabled) localStorage.setItem(FORECASTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateFomcWatch = useCallback(async (meetingDate: string, probabilities: FomcProbabilities) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('fomc_watch').upsert({
        meeting_date: meetingDate,
        prob_cut: probabilities.probCut,
        prob_hold: probabilities.probHold,
        prob_hike: probabilities.probHike,
        note: probabilities.note || null,
      });
    }
    setFomcWatch((prev) => {
      const next = { ...prev, [meetingDate]: probabilities };
      if (!supabaseEnabled) localStorage.setItem(FOMC_WATCH_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateBankerNote = useCallback(async (bankerId: string, note: BankerNote) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('banker_statements').upsert({
        banker_id: bankerId,
        photo_url: note.photoUrl || null,
        statement_date: note.statementDate || null,
        stance: note.stance || null,
        summary: note.summary || null,
        source_url: note.sourceUrl || null,
      });
    }
    setBankerNotes((prev) => {
      const next = { ...prev, [bankerId]: note };
      if (!supabaseEnabled) localStorage.setItem(BANKER_NOTES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetOverrides = useCallback(async () => {
    if (supabaseEnabled && supabase) {
      await supabase.from('indicator_overrides').delete().neq('indicator_id', '');
      await supabase.from('score_overrides').delete().neq('id', '');
      await supabase.from('indicator_forecasts').delete().neq('indicator_id', '');
      await supabase.from('fomc_watch').delete().not('meeting_date', 'is', null);
      await supabase.from('banker_statements').delete().neq('banker_id', '');
    } else {
      localStorage.removeItem(OVERRIDES_KEY);
      localStorage.removeItem(SCORE_KEY);
      localStorage.removeItem(FORECASTS_KEY);
      localStorage.removeItem(FOMC_WATCH_KEY);
      localStorage.removeItem(BANKER_NOTES_KEY);
    }
    setOverrides({});
    setScoreRows(SCORE_SEED);
    setForecasts({});
    setFomcWatch({});
    setBankerNotes({});
  }, []);

  const exportJson = useCallback(() => {
    const merged: SeriesMap = {};
    for (const id of Object.keys(base)) merged[id] = mergeSeries(base[id] ?? [], overrides[id] ?? []);
    for (const id of Object.keys(overrides)) if (!merged[id]) merged[id] = mergeSeries([], overrides[id]);
    return JSON.stringify(merged, null, 2);
  }, [base, overrides]);

  const value = useMemo(
    () => ({
      getSeries,
      addPoint,
      removeLastPoint,
      scoreRows,
      updateScoreValoracion,
      forecasts,
      updateForecast,
      fomcWatch,
      updateFomcWatch,
      bankerNotes,
      updateBankerNote,
      resetOverrides,
      exportJson,
      loading,
      syncMode: (supabaseEnabled ? 'cloud' : 'local') as 'cloud' | 'local',
      refresh,
    }),
    [
      getSeries,
      addPoint,
      removeLastPoint,
      scoreRows,
      updateScoreValoracion,
      forecasts,
      updateForecast,
      fomcWatch,
      updateFomcWatch,
      bankerNotes,
      updateBankerNote,
      resetOverrides,
      exportJson,
      loading,
      refresh,
    ],
  );

  return <MacroDataContext.Provider value={value}>{children}</MacroDataContext.Provider>;
}

export function useMacroData() {
  const ctx = useContext(MacroDataContext);
  if (!ctx) throw new Error('useMacroData must be used within MacroDataProvider');
  return ctx;
}
