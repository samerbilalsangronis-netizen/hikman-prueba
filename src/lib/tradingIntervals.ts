import type { EquityPoint } from './trading';

// Filtro de temporalidad para las curvas de equity de la Bitácora de Trading
// (4-oct-2026, pedido del usuario) — a diferencia de historyIntervals.ts
// (años, para series de indicadores con un punto por mes/trimestre), acá la
// granularidad es mucho más fina porque EquityPoint.date es la hora exacta
// de cierre de cada trade, no una fecha de calendario.
export type EquityInterval = '1h' | '1d' | '1w' | '1m' | '1y' | 'all';

export const EQUITY_INTERVAL_LABELS: Record<EquityInterval, string> = {
  '1h': '1H',
  '1d': '1D',
  '1w': 'S1',
  '1m': '1M',
  '1y': '1A',
  all: 'Todo',
};

export const EQUITY_INTERVALS: EquityInterval[] = ['1h', '1d', '1w', '1m', '1y', 'all'];

const INTERVAL_MS: Record<Exclude<EquityInterval, 'all'>, number> = {
  '1h': 3600_000,
  '1d': 24 * 3600_000,
  '1w': 7 * 24 * 3600_000,
  '1m': 30 * 24 * 3600_000,
  '1y': 365 * 24 * 3600_000,
};

/** Filtra contra el cierre del ÚLTIMO trade de la curva (no "ahora") — así
 * el filtro sigue siendo útil para revisar una racha pasada, no solo hoy. */
export function filterEquityByInterval(points: EquityPoint[], interval: EquityInterval): EquityPoint[] {
  if (interval === 'all' || points.length === 0) return points;
  const lastMs = new Date(points[points.length - 1].date).getTime();
  const cutoff = lastMs - INTERVAL_MS[interval];
  return points.filter((p) => new Date(p.date).getTime() >= cutoff);
}
