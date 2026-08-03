import { memo, useMemo, useState } from 'react';
import type { IndicatorMeta, SeriesPoint } from '../types';
import { formatValue } from '../lib/format';
import { getFreshness } from '../lib/freshness';
import { FreshnessBadge } from './FreshnessBadge';
import { IndicatorChart } from './IndicatorChart';
import { HistoryModal } from './HistoryModal';

// Exportado para reuso en HistoryModal (mismo badge en la tarjeta y en el modal).
export function ReleaseStageBadge({ stage }: { stage: NonNullable<IndicatorMeta['releaseStage']> }) {
  const cfg =
    stage === 'preliminar'
      ? { label: 'Preliminar', color: 'var(--status-warning)' }
      : { label: 'Final', color: 'var(--text-muted)' };
  return (
    <span
      className="inline-flex items-center rounded px-1 py-[1px] text-[9px] font-semibold uppercase tracking-wide"
      style={{ color: cfg.color, border: `1px solid ${cfg.color}` }}
      title={
        stage === 'preliminar'
          ? 'Lectura preliminar/adelantada — la fuente publica una revisión posterior de este mismo dato.'
          : 'Lectura final/revisada — la fuente publicó antes una versión preliminar de este mismo dato.'
      }
    >
      {cfg.label}
    </span>
  );
}

interface ChartCardProps {
  meta: IndicatorMeta;
  points: SeriesPoint[];
  months?: number;
  forecast?: number;
  // Etapa (preliminar/final) del último punto realmente cargado, resuelta
  // por el padre vía getReleaseStage(meta.id) — cae a meta.releaseStage si
  // el punto más reciente no tiene etapa propia registrada. Se pasa como
  // prop (no se lee el context acá adentro) para no romper el memo de abajo.
  releaseStage?: 'preliminar' | 'final';
  // Si el indicador tiene subcomponentes, tocar la tarjeta abre un modal con
  // el detalle (SubcomponentModal) en vez de expandir algo inline — ver
  // Crecimiento.tsx. childCount solo se usa para el badge "N subcomponentes".
  subcomponentsControl?: { onOpen: () => void; childCount: number };
  // Versión más chica (menos padding, sin descripción, gráfico más bajo) —
  // usada dentro de SubcomponentModal, donde varias tarjetas completas
  // ocupaban demasiada pantalla (pedido explícito del usuario).
  compact?: boolean;
}

function ChartCardInner({ meta, points, months = 36, forecast, releaseStage, subcomponentsControl, compact = false }: ChartCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const stage = releaseStage ?? meta.releaseStage;
  const freshness = getFreshness(points, meta.frequency);
  const windowed = points.slice(-months);
  // Clave de contenido (no de referencia): points siempre es un arreglo nuevo
  // en cada render del padre, aunque los datos no cambien. Sin esto, Recharts
  // ve un array "nuevo" cada vez que esta tarjeta se re-renderiza por algo no
  // relacionado (ej. el propio toggle del acordeón) y reinicia su animación
  // de entrada, dejando el gráfico en blanco por un instante.
  const dataKey = windowed.map(([d, v]) => `${d}:${v}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => windowed.map(([date, value]) => ({ date, value })), [dataKey]);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last && prev ? last[1] - prev[1] : null;
  const deltaGood =
    delta === null || meta.goodDirection === 'neutral'
      ? null
      : meta.goodDirection === 'up'
        ? delta >= 0
        : delta <= 0;

  return (
    <div
      className={compact ? 'flex flex-col rounded-xl p-3' : 'flex flex-col rounded-xl p-4'}
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      {subcomponentsControl ? (
        <button
          onClick={subcomponentsControl.onOpen}
          className="-m-1 flex w-full flex-wrap items-start justify-between gap-2 rounded-lg p-1 text-left transition-colors hover:bg-[var(--surface-2)]"
        >
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.label}
              {stage && <ReleaseStageBadge stage={stage} />}
            </h3>
            {!compact && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {meta.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <FreshnessBadge freshness={freshness} />
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--series-1)', background: 'var(--surface-1)' }}
            >
              {subcomponentsControl.childCount} subcomponentes ⤢
            </span>
          </div>
        </button>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.label}
              {stage && <ReleaseStageBadge stage={stage} />}
            </h3>
            {!compact && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {meta.description}
              </p>
            )}
          </div>
          <FreshnessBadge freshness={freshness} />
        </div>
      )}

      <div
        className={compact ? 'mt-2 grid grid-cols-3 gap-1 rounded-lg py-1' : 'mt-3 grid grid-cols-3 gap-1 rounded-lg py-2'}
        style={{ background: 'var(--surface-2)' }}
      >
        <div className="flex flex-col items-center gap-0.5 border-r px-1 text-center" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Anterior
          </span>
          <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {prev ? formatValue(prev[1], meta.format) : '—'}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 border-r px-1 text-center" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Previsión
          </span>
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: forecast !== undefined ? 'var(--series-5)' : 'var(--text-muted)' }}
          >
            {forecast !== undefined ? formatValue(forecast, meta.format) : '—'}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-1 text-center">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Actual
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {last ? formatValue(last[1], meta.format) : '—'}
            </span>
            {delta !== null && (
              <span
                className="text-[10px] font-medium tabular-nums"
                style={{
                  color: deltaGood === null ? 'var(--text-secondary)' : deltaGood ? 'var(--delta-good)' : 'var(--delta-bad)',
                }}
              >
                {delta >= 0 ? '▲' : '▼'}
              </span>
            )}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={points.length === 0}
        onClick={() => setHistoryOpen(true)}
        title={points.length > 0 ? 'Ver histórico completo' : undefined}
        className={
          'relative mt-2 w-full rounded-lg text-left transition-colors' +
          (points.length > 0 ? ' cursor-pointer hover:bg-[var(--surface-2)]' : ' cursor-default')
        }
      >
        {points.length > 0 && (
          <span
            className="pointer-events-none absolute right-1 top-1 z-10 text-[9px]"
            style={{ color: 'var(--text-muted)' }}
          >
            ⤢
          </span>
        )}
        <IndicatorChart meta={meta} data={data} height={compact ? 80 : 140} />
      </button>

      <a
        href={meta.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 text-[11px] hover:underline"
        style={{ color: 'var(--text-muted)' }}
      >
        Fuente: {meta.source}
      </a>

      {historyOpen && (
        <HistoryModal meta={meta} points={points} releaseStage={stage} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}

function samePoint(a: SeriesPoint | undefined, b: SeriesPoint | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1];
}

// El padre (SectionGrid, Ism, Dashboard) llama a getSeries(id) en cada render,
// que siempre devuelve un arreglo nuevo aunque los datos no hayan cambiado.
// Sin este memo, cualquier cambio de estado ajeno (ej. expandir otra tarjeta
// del acordeón) hace que Recharts vea "datos nuevos" en todas las tarjetas y
// reinicie su animación de entrada — se ve como que el gráfico "se rompe" o
// parpadea en blanco. Comparamos por contenido (largo + últimos puntos) en
// vez de por referencia.
function areEqual(prev: ChartCardProps, next: ChartCardProps): boolean {
  return (
    prev.meta.id === next.meta.id &&
    prev.months === next.months &&
    prev.forecast === next.forecast &&
    prev.releaseStage === next.releaseStage &&
    prev.points.length === next.points.length &&
    samePoint(prev.points[prev.points.length - 1], next.points[next.points.length - 1]) &&
    samePoint(prev.points[prev.points.length - 2], next.points[next.points.length - 2]) &&
    prev.subcomponentsControl?.childCount === next.subcomponentsControl?.childCount &&
    prev.compact === next.compact
  );
}

export const ChartCard = memo(ChartCardInner, areEqual);
