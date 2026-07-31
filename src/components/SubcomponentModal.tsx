import { useEffect } from 'react';
import type { IndicatorMeta, SeriesPoint } from '../types';
import { ChartCard } from './ChartCard';

interface SubcomponentModalProps {
  parent: IndicatorMeta;
  children: IndicatorMeta[];
  getSeries: (id: string) => SeriesPoint[];
  forecasts: Record<string, number>;
  onClose: () => void;
}

export function SubcomponentModal({ parent, children, getSeries, forecasts, onClose }: SubcomponentModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Subcomponentes de ${parent.label}`}
    >
      <div
        className="my-8 w-full max-w-4xl rounded-xl p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {parent.label}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {children.length} subcomponentes — dato actual y anterior de cada uno
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md px-2.5 py-1.5 text-sm"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ✕ Cerrar
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <ChartCard key={child.id} meta={child} points={getSeries(child.id)} months={36} forecast={forecasts[child.id]} />
          ))}
        </div>
      </div>
    </div>
  );
}
