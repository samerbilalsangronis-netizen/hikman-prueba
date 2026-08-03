import { useEffect, useMemo, useState } from 'react';
import type { IndicatorMeta, SeriesPoint } from '../types';
import { IndicatorChart } from './IndicatorChart';
import { ReleaseStageBadge } from './ChartCard';
import { formatValue } from '../lib/format';
import { availableHistoryIntervals, filterByInterval, INTERVAL_LABELS, type HistoryInterval } from '../lib/historyIntervals';

interface HistoryModalProps {
  meta: IndicatorMeta;
  points: SeriesPoint[];
  releaseStage?: 'preliminar' | 'final';
  onClose: () => void;
}

// z-[60], por encima del z-50 de SubcomponentModal — este modal también se
// puede abrir desde una tarjeta compacta DENTRO de SubcomponentModal (ver
// ChartCard.tsx), y necesita quedar arriba en ese caso anidado.
export function HistoryModal({ meta, points, releaseStage, onClose }: HistoryModalProps) {
  const intervals = useMemo(() => availableHistoryIntervals(points), [points]);
  const [range, setRange] = useState<HistoryInterval>('all');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => filterByInterval(points, range), [points, range]);
  const data = useMemo(() => filtered.map(([date, value]) => ({ date, value })), [filtered]);
  const last = points[points.length - 1];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Histórico de ${meta.label}`}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-1.5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.label}
              {releaseStage && <ReleaseStageBadge stage={releaseStage} />}
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {meta.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-xs"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ✕ Cerrar
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {intervals.map((i) => (
              <button
                key={i}
                onClick={() => setRange(i)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                style={
                  i === range
                    ? { background: 'var(--series-1)', color: 'var(--surface-1)' }
                    : { border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                }
              >
                {INTERVAL_LABELS[i]}
              </button>
            ))}
          </div>
          {last && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              Último dato: {formatValue(last[1], meta.format)} ({filtered.length} puntos en este rango)
            </span>
          )}
        </div>

        <IndicatorChart meta={meta} data={data} height={340} />

        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[11px] hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Fuente: {meta.source}
        </a>
      </div>
    </div>
  );
}
