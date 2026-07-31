import type { Currency, Headline } from '../types';
import { IMPACT_COLORS, IMPACT_LABELS } from '../lib/impact';

const BIAS_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'CHF', 'CNY'];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface HeadlineCardProps {
  headline: Headline;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onSetBiasCurrency: (id: string, currency: Currency | undefined) => void;
}

export function HeadlineCard({ headline, onTogglePin, onDelete, onSetBiasCurrency }: HeadlineCardProps) {
  const color = IMPACT_COLORS[headline.impact];

  return (
    <div
      className="flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-start sm:justify-between"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color, border: `1px solid ${color}` }}
          >
            {IMPACT_LABELS[headline.impact]}
          </span>
          {headline.pinned && (
            <span className="text-[10px] font-semibold" style={{ color: 'var(--series-1)' }}>
              📌 Fijado
            </span>
          )}
          {headline.isManual && (
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Carga manual
            </span>
          )}
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {headline.url ? (
            <a href={headline.url} target="_blank" rel="noreferrer" className="hover:underline">
              {headline.title}
            </a>
          ) : (
            headline.title
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{headline.source}</span>
          <span>·</span>
          <span>{formatDateTime(headline.publishedAt)}</span>
          {headline.tags.map((tag) => (
            <span
              key={tag}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-start">
        <select
          value={headline.biasCurrency ?? ''}
          onChange={(e) => onSetBiasCurrency(headline.id, (e.target.value || undefined) as Currency | undefined)}
          className="rounded-md px-2 py-1 text-xs"
          style={{
            border: '1px solid var(--border)',
            background: headline.biasCurrency ? 'var(--series-1)' : 'transparent',
            color: headline.biasCurrency ? '#fff' : 'var(--text-secondary)',
          }}
          title="Fijar como motivo del sesgo de una divisa (también aparece en la cinta del Panel de Control)"
        >
          <option value="">Fijar a divisa…</option>
          {BIAS_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => onTogglePin(headline.id, !headline.pinned)}
          className="rounded-md px-2.5 py-1 text-xs font-semibold"
          style={{
            background: headline.pinned ? 'var(--series-1)' : 'transparent',
            color: headline.pinned ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          title="Fijar al Panel de Control (cinta corrediza)"
        >
          {headline.pinned ? 'Desfijar' : 'Fijar'}
        </button>
        <button
          onClick={() => onDelete(headline.id)}
          className="rounded-md px-2 py-1 text-xs"
          style={{ color: 'var(--delta-bad)', border: '1px solid var(--border)' }}
          title="Quitar de la lista"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
