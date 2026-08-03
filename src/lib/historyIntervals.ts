import type { SeriesPoint } from '../types';

export type HistoryInterval = '1y' | '3y' | '5y' | '10y' | 'all';

export const INTERVAL_LABELS: Record<HistoryInterval, string> = {
  '1y': '1A',
  '3y': '3A',
  '5y': '5A',
  '10y': '10A',
  all: 'Histórico completo',
};

function yearsBetween(a: string, b: string): number {
  const d1 = new Date(a + 'T00:00:00').getTime();
  const d2 = new Date(b + 'T00:00:00').getTime();
  return Math.abs(d2 - d1) / (365.25 * 24 * 3600 * 1000);
}

// Qué botones de intervalo mostrar según cuánta historia tiene realmente la
// serie — 1A y "histórico completo" siempre están (pedido explícito del
// usuario), 3A/5A/10A solo aparecen si la serie efectivamente cubre ese rango.
export function availableHistoryIntervals(points: SeriesPoint[]): HistoryInterval[] {
  if (points.length === 0) return ['all'];
  const span = yearsBetween(points[0][0], points[points.length - 1][0]);
  const intervals: HistoryInterval[] = ['1y'];
  if (span >= 3) intervals.push('3y');
  if (span >= 5) intervals.push('5y');
  if (span >= 10) intervals.push('10y');
  intervals.push('all');
  return intervals;
}

const INTERVAL_YEARS: Record<Exclude<HistoryInterval, 'all'>, number> = { '1y': 1, '3y': 3, '5y': 5, '10y': 10 };

export function filterByInterval(points: SeriesPoint[], interval: HistoryInterval): SeriesPoint[] {
  if (interval === 'all' || points.length === 0) return points;
  const cutoff = new Date(points[points.length - 1][0] + 'T00:00:00');
  cutoff.setFullYear(cutoff.getFullYear() - INTERVAL_YEARS[interval]);
  return points.filter(([date]) => new Date(date + 'T00:00:00') >= cutoff);
}
