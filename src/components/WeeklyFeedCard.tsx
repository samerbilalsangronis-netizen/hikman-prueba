import { useState } from 'react';
import type { ImpactLevel, IndicatorMeta } from '../types';
import { formatDate, formatValue } from '../lib/format';
import { IMPACT_COLORS, IMPACT_LABELS } from '../lib/impact';
import { surpriseColor } from '../lib/weeklyHub';
import { useMacroData } from '../data/MacroDataContext';

interface WeeklyFeedCardProps {
  meta: IndicatorMeta;
  date: string;
  value: number;
  forecast?: number;
  previous?: number;
  updatedAt: string;
  impact: ImpactLevel;
  onOverrideImpact: (level: ImpactLevel) => void;
}

export function WeeklyFeedCard({ meta, date, value, forecast, previous, updatedAt, impact, onOverrideImpact }: WeeklyFeedCardProps) {
  const { addBiasReason } = useMacroData();
  const [linked, setLinked] = useState(false);
  const currency = meta.currency ?? 'USD';

  function handleLink() {
    const label = `${meta.shortLabel}: ${formatValue(value, meta.format)}${forecast !== undefined ? ` (prev. ${formatValue(forecast, meta.format)})` : ''}`;
    addBiasReason(currency, { label, color: surpriseColor(meta, value, forecast) });
    setLinked(true);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ background: 'var(--surface-2)', color: 'var(--series-1)', border: '1px solid var(--border)' }}
        >
          {currency}
        </span>
        <select
          value={impact}
          onChange={(e) => onOverrideImpact(e.target.value as ImpactLevel)}
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ color: IMPACT_COLORS[impact], border: `1px solid ${IMPACT_COLORS[impact]}`, background: 'transparent' }}
          title="Nivel de impacto — calculado automático por sorpresa, corregible a mano"
        >
          {(Object.keys(IMPACT_LABELS) as ImpactLevel[]).map((level) => (
            <option key={level} value={level}>
              {IMPACT_LABELS[level]}
            </option>
          ))}
        </select>
      </div>

      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {meta.label}
      </h3>

      <div className="flex flex-wrap items-baseline gap-3 text-sm">
        <span style={{ color: 'var(--text-muted)' }}>
          Anterior: <strong style={{ color: 'var(--text-secondary)' }}>{previous !== undefined ? formatValue(previous, meta.format) : '—'}</strong>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Previsión: <strong style={{ color: 'var(--text-secondary)' }}>{forecast !== undefined ? formatValue(forecast, meta.format) : '—'}</strong>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Real: <strong style={{ color: 'var(--text-primary)' }}>{formatValue(value, meta.format)}</strong>
        </span>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Período: {formatDate(date)} · Cargado: {formatDate(updatedAt.slice(0, 10))}
      </p>

      <button
        onClick={handleLink}
        disabled={linked}
        className="mt-1 self-start rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
        style={{ border: '1px solid var(--border)', color: linked ? 'var(--text-muted)' : 'var(--series-1)' }}
      >
        {linked ? '📌 Vinculado' : `📌 Vincular a Sesgo ${currency}`}
      </button>
    </div>
  );
}
