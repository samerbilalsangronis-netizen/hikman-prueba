import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IndicatorMeta, SeriesPoint } from '../types';
import { formatDate, formatMonth, formatValue } from '../lib/format';
import { getFreshness } from '../lib/freshness';
import { FreshnessBadge } from './FreshnessBadge';

function ChartTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean;
  payload?: { payload: { date: string; value: number } }[];
  format: IndicatorMeta['format'];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const { date, value } = payload[0].payload;
  return (
    <div
      className="rounded-md px-2.5 py-1.5 text-xs shadow-sm"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      <div style={{ color: 'var(--text-muted)' }}>{formatDate(date)}</div>
      <div className="font-semibold">{formatValue(value, format)}</div>
    </div>
  );
}

interface ChartCardProps {
  meta: IndicatorMeta;
  points: SeriesPoint[];
  months?: number;
  forecast?: number;
  expandControl?: { expanded: boolean; onToggle: () => void; childCount: number };
}

function ChartCardInner({ meta, points, months = 36, forecast, expandControl }: ChartCardProps) {
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

  const color = 'var(--series-1)';

  return (
    <div
      className="flex flex-col rounded-xl p-4"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      {expandControl ? (
        <button
          onClick={expandControl.onToggle}
          aria-expanded={expandControl.expanded}
          className="-m-1 flex w-full items-start justify-between gap-2 rounded-lg p-1 text-left transition-colors hover:bg-[var(--surface-2)]"
        >
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.label}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {meta.description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <FreshnessBadge freshness={freshness} />
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--series-1)', background: 'var(--surface-1)' }}
            >
              <span
                className="inline-block transition-transform"
                style={{ transform: expandControl.expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▸
              </span>
              {expandControl.childCount} subcomponentes
            </span>
          </div>
        </button>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.label}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {meta.description}
            </p>
          </div>
          <FreshnessBadge freshness={freshness} />
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg py-2" style={{ background: 'var(--surface-2)' }}>
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

      <div className="mt-2 h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {meta.chart === 'bar' ? (
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--gridline)" strokeDasharray="0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatMonth}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--baseline)' }}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v) => formatValue(v, meta.format)}
              />
              <Tooltip content={<ChartTooltip format={meta.format} />} cursor={{ fill: 'var(--gridline)' }} />
              <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={14} />
            </BarChart>
          ) : meta.chart === 'area' ? (
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${meta.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatMonth}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--baseline)' }}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v) => formatValue(v, meta.format)}
              />
              <Tooltip content={<ChartTooltip format={meta.format} />} cursor={{ stroke: 'var(--baseline)' }} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${meta.id})`} />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatMonth}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--baseline)' }}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v) => formatValue(v, meta.format)}
              />
              <Tooltip content={<ChartTooltip format={meta.format} />} cursor={{ stroke: 'var(--baseline)' }} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <a
        href={meta.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 text-[11px] hover:underline"
        style={{ color: 'var(--text-muted)' }}
      >
        Fuente: {meta.source}
      </a>
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
    prev.points.length === next.points.length &&
    samePoint(prev.points[prev.points.length - 1], next.points[next.points.length - 1]) &&
    samePoint(prev.points[prev.points.length - 2], next.points[next.points.length - 2]) &&
    prev.expandControl?.expanded === next.expandControl?.expanded &&
    prev.expandControl?.childCount === next.expandControl?.childCount
  );
}

export const ChartCard = memo(ChartCardInner, areEqual);
