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
import type { IndicatorMeta } from '../types';
import { formatDate, formatMonth, formatValue } from '../lib/format';

export function ChartTooltip({
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

interface IndicatorChartProps {
  meta: IndicatorMeta;
  data: { date: string; value: number }[];
  height: number;
}

// Gráfico compartido entre la tarjeta (mini, ventana de N meses) y HistoryModal
// (grande, ventana elegida por el usuario) — mismo tipo de gráfico (line/bar/area)
// y mismo estilo, solo cambia el alto y los datos que reciben.
export function IndicatorChart({ meta, data, height }: IndicatorChartProps) {
  const color = 'var(--series-1)';

  return (
    <div style={{ height }} className="w-full">
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
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
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
            <Area
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${meta.id})`}
              dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
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
            <Line
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
