import type { FreshnessInfo } from '../types';

const CONFIG = {
  ok: { label: 'Al día', dot: 'var(--status-good)', text: 'var(--delta-good)' },
  warning: { label: 'Revisar', dot: 'var(--status-warning)', text: 'var(--text-secondary)' },
  stale: { label: 'Desactualizado', dot: 'var(--status-critical)', text: 'var(--delta-bad)' },
};

export function FreshnessBadge({ freshness }: { freshness: FreshnessInfo }) {
  const cfg = CONFIG[freshness.level];
  const detail = freshness.lastDate
    ? freshness.daysSince <= 1
      ? 'hoy'
      : `hace ${freshness.daysSince}d`
    : 'sin datos';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: cfg.text, border: '1px solid var(--border)', background: 'var(--surface-2)' }}
      title={freshness.lastDate ? `Último dato: ${freshness.lastDate}` : 'Sin datos disponibles'}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label} · {detail}
    </span>
  );
}
