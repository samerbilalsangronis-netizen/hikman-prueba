import type { Format } from '../types';

export function formatValue(value: number, format: Format): string {
  switch (format) {
    case 'pct':
      return `${(value * 100).toFixed(1)}%`;
    case 'pct1':
      return `${(value * 100).toFixed(2)}%`;
    case 'index':
      return value.toFixed(1);
    case 'thousands':
      return `${Math.round(value / 1000).toLocaleString('es-ES')}k`;
    case 'billions':
      // el valor se guarda en miles de millones (US$ billions); se muestra en trillones
      return `$${(value / 1000).toFixed(2)}T`;
    case 'ratio':
      return value.toFixed(2);
    default:
      return String(value);
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { year: '2-digit', month: 'short' });
}
