import type { Currency } from '../types';

// Un color fijo por divisa para poder "leer" cualquier gráfico multi-divisa
// de un vistazo — mismo color en leyenda, línea y ranking.
export const CURRENCY_COLORS: Record<Currency, string> = {
  USD: '#3b82f6',
  EUR: '#8b5cf6',
  GBP: '#ec4899',
  CAD: '#ef4444',
  AUD: '#22c55e',
  NZD: '#14b8a6',
  JPY: '#f97316',
  CHF: '#eab308',
  CNY: '#be123c',
};
