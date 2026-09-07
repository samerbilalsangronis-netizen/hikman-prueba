import type { TradingAlertSeverity } from '../../types';

// Helpers compartidos entre las 4 sub-pestañas de la Bitácora de Trading —
// formato de fecha/hora (24h, con fecha, por si el trade cruza más de un
// día) y el color de las insignias de alerta.

export function severityColor(severity: TradingAlertSeverity): string {
  if (severity === 'breached') return 'var(--status-critical)';
  if (severity === 'warning') return 'var(--status-warning)';
  return 'var(--status-good)';
}

/** Convierte un ISO (UTC) a texto legible en hora militar 24h + fecha. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Valor por defecto para un <input type="datetime-local"> = ahora, en hora local. */
export function nowLocalInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** ISO (UTC) -> valor de <input type="datetime-local"> (hora local, sin zona). */
export function isoToLocalInputValue(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Valor de <input type="datetime-local"> (interpretado como hora local del
 * navegador) -> ISO UTC para guardar. */
export function localInputValueToIso(value: string): string {
  return new Date(value).toISOString();
}

export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

export const cardStyle = { background: 'var(--surface-1)', border: '1px solid var(--border)' } as const;
export const inputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as const;
