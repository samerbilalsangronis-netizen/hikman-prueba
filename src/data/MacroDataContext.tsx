import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import historicalSeries from './historical-series.json';
import { SCORE_SEED } from './scoreSeed';
import type { ScoreRow, SeriesPoint } from '../types';

type SeriesMap = Record<string, SeriesPoint[]>;

const OVERRIDES_KEY = 'macro-dashboard:overrides:v1';
const SCORE_KEY = 'macro-dashboard:score:v1';

function loadOverrides(): SeriesMap {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as SeriesMap) : {};
  } catch {
    return {};
  }
}

function loadScore(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    return raw ? (JSON.parse(raw) as ScoreRow[]) : SCORE_SEED;
  } catch {
    return SCORE_SEED;
  }
}

function mergeSeries(base: SeriesPoint[], overrides: SeriesPoint[]): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const [date, value] of base) map.set(date, value);
  for (const [date, value] of overrides) map.set(date, value);
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

interface MacroDataContextValue {
  getSeries: (id: string) => SeriesPoint[];
  addPoint: (id: string, date: string, value: number) => void;
  removeLastPoint: (id: string) => void;
  scoreRows: ScoreRow[];
  updateScoreValoracion: (id: string, valoracion: number) => void;
  resetOverrides: () => void;
  exportJson: () => string;
}

const MacroDataContext = createContext<MacroDataContextValue | null>(null);

export function MacroDataProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<SeriesMap>(loadOverrides);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>(loadScore);

  const base = historicalSeries as unknown as SeriesMap;

  const getSeries = useCallback(
    (id: string) => mergeSeries(base[id] ?? [], overrides[id] ?? []),
    [base, overrides],
  );

  const addPoint = useCallback((id: string, date: string, value: number) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: [...(prev[id] ?? []), [date, value] as SeriesPoint] };
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeLastPoint = useCallback((id: string) => {
    setOverrides((prev) => {
      const list = prev[id] ?? [];
      if (list.length === 0) return prev;
      const next = { ...prev, [id]: list.slice(0, -1) };
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateScoreValoracion = useCallback((id: string, valoracion: number) => {
    setScoreRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, valoracion } : r));
      localStorage.setItem(SCORE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetOverrides = useCallback(() => {
    localStorage.removeItem(OVERRIDES_KEY);
    localStorage.removeItem(SCORE_KEY);
    setOverrides({});
    setScoreRows(SCORE_SEED);
  }, []);

  const exportJson = useCallback(() => {
    const merged: SeriesMap = {};
    for (const id of Object.keys(base)) merged[id] = mergeSeries(base[id] ?? [], overrides[id] ?? []);
    for (const id of Object.keys(overrides)) if (!merged[id]) merged[id] = mergeSeries([], overrides[id]);
    return JSON.stringify(merged, null, 2);
  }, [base, overrides]);

  const value = useMemo(
    () => ({ getSeries, addPoint, removeLastPoint, scoreRows, updateScoreValoracion, resetOverrides, exportJson }),
    [getSeries, addPoint, removeLastPoint, scoreRows, updateScoreValoracion, resetOverrides, exportJson],
  );

  return <MacroDataContext.Provider value={value}>{children}</MacroDataContext.Provider>;
}

export function useMacroData() {
  const ctx = useContext(MacroDataContext);
  if (!ctx) throw new Error('useMacroData must be used within MacroDataProvider');
  return ctx;
}
