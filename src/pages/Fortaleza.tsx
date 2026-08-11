import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useXAxisScale,
  useYAxisScale,
  useYAxisInverseScale,
} from 'recharts';
import type { InverseScaleFunction, MouseHandlerDataParam } from 'recharts';
import { useMacroData } from '../data/MacroDataContext';
import { CURRENCIES } from '../data/CurrencyContext';
import { CURRENCY_COLORS } from '../lib/currencyColors';
import { ema } from '../lib/ema';
import { formatDate } from '../lib/format';
import type { Currency } from '../types';

// Un tipo de cambio spot diario por divisa (ya normalizado a "USD por 1
// unidad de la divisa" en api/fred-sync.ts, sea cual sea la convención de
// cotización real de la Fed para esa serie) — USD no tiene fila propia,
// vale 1 por definición.
const FX_INDICATOR_ID: Partial<Record<Currency, string>> = {
  EUR: 'fx_eur_usd',
  GBP: 'fx_gbp_usd',
  AUD: 'fx_aud_usd',
  NZD: 'fx_nzd_usd',
  JPY: 'fx_jpy_usd',
  CAD: 'fx_cad_usd',
  CHF: 'fx_chf_usd',
  CNY: 'fx_cny_usd',
};

const EMA_PERIOD = 5;

const RANGES = [
  { key: '1d', label: '1D', days: 1 },
  { key: '1s', label: '1S', days: 7 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1a', label: '1A', days: 365 },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

// Herramientas de edición al estilo "backtest" manual: marcar niveles,
// trazar tendencias y medir variación % / días entre dos puntos del propio
// gráfico, sin salir de la app.
type DrawTool = 'cursor' | 'horizontal' | 'trend' | 'measure';

const TOOLS: { key: DrawTool; label: string; hint: string }[] = [
  { key: 'cursor', label: '🖱 Cursor', hint: 'Modo normal — solo hover para ver el detalle' },
  { key: 'horizontal', label: '— Nivel', hint: 'Clic para marcar un nivel horizontal (%)' },
  { key: 'trend', label: '📈 Tendencia', hint: 'Clic en dos puntos para trazar una línea entre ellos' },
  { key: 'measure', label: '📏 Medir', hint: 'Clic en dos puntos para medir variación % y días' },
];

interface Point {
  date: string;
  value: number;
}

type Drawing =
  | { id: string; type: 'horizontal'; value: number }
  | { id: string; type: 'trend'; a: Point; b: Point }
  | { id: string; type: 'measure'; a: Point; b: Point };

let drawingSeq = 0;
function nextDrawingId(): string {
  drawingSeq += 1;
  return `draw-${drawingSeq}`;
}

// Puente hacia adentro del contexto del gráfico: los hooks de escala de
// recharts (useYAxisInverseScale, etc.) solo funcionan en un componente
// renderizado DENTRO de <LineChart>, no en el padre que simplemente lo
// declara — este componente no dibuja nada, solo publica la función de
// escala inversa vigente en cada render hacia una ref que el handler de
// clic (que sí vive en el padre) puede leer de forma imperativa.
function ScaleBridge({ yInverseRef }: { yInverseRef: MutableRefObject<InverseScaleFunction | undefined> }) {
  const yInverse = useYAxisInverseScale();
  useEffect(() => {
    yInverseRef.current = yInverse;
  });
  return null;
}

// Dibuja las líneas de tendencia y de medición como SVG puro, convirtiendo
// cada punto (fecha, %) a píxeles con las escalas vigentes del gráfico en
// cada render — así se mantienen alineadas aunque la ventana cambie de
// tamaño (a diferencia de guardar coordenadas de píxel fijas al momento
// del clic).
function TrendDrawingsLayer({ drawings }: { drawings: Drawing[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const segments = drawings.filter((d): d is Extract<Drawing, { type: 'trend' | 'measure' }> => d.type !== 'horizontal');
  if (!xScale || !yScale || segments.length === 0) return null;

  return (
    <g>
      {segments.map((d) => {
        const x1 = xScale(d.a.date);
        const y1 = yScale(d.a.value);
        const x2 = xScale(d.b.date);
        const y2 = yScale(d.b.value);
        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;
        const isMeasure = d.type === 'measure';
        const color = isMeasure ? 'var(--status-warning)' : 'var(--series-1)';
        const deltaPct = d.b.value - d.a.value;
        const days = Math.round((new Date(d.b.date).getTime() - new Date(d.a.date).getTime()) / 86400000);
        return (
          <g key={d.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeDasharray={isMeasure ? '5 3' : undefined} />
            <circle cx={x1} cy={y1} r={3.5} fill={color} />
            <circle cx={x2} cy={y2} r={3.5} fill={color} />
            {isMeasure && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 8}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--text-primary)"
                stroke="var(--surface-1)"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {deltaPct >= 0 ? '+' : ''}
                {deltaPct.toFixed(2)}% · {days}d
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function Fortaleza() {
  const { getSeries } = useMacroData();
  const [range, setRange] = useState<RangeKey>('1m');
  const [hiddenCurrencies, setHiddenCurrencies] = useState<Set<Currency>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [tool, setTool] = useState<DrawTool>('cursor');
  const [pendingPoint, setPendingPoint] = useState<Point | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const yInverseRef = useRef<InverseScaleFunction | undefined>(undefined);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  // Precio spot diario suavizado (EMA) por divisa, indexado por fecha —
  // USD queda afuera del mapa, se trata como caso especial (vale 1 siempre).
  const smoothedByCurrency = useMemo(() => {
    const result = new Map<Currency, Map<string, number>>();
    for (const currency of CURRENCIES) {
      const id = FX_INDICATOR_ID[currency];
      if (!id) continue;
      const points = getSeries(id); // [date, value][], ya ordenado
      const smoothed = ema(
        points.map((p) => p[1]),
        EMA_PERIOD,
      );
      const byDate = new Map<string, number>();
      points.forEach(([date], i) => byDate.set(date, smoothed[i]));
      result.set(currency, byDate);
    }
    return result;
  }, [getSeries]);

  const axisDates = useMemo(() => {
    const all = new Set<string>();
    for (const byDate of smoothedByCurrency.values()) {
      for (const date of byDate.keys()) all.add(date);
    }
    return [...all].sort();
  }, [smoothedByCurrency]);

  // Fortaleza por triangulación: cada divisa se compara contra el PROMEDIO
  // de las otras 8 (no solo contra USD) — c/d = (c/USD)/(d/USD), así que en
  // logaritmos el término USD se cancela y no hace falta armar los 36 pares
  // cruzados explícitamente, con el mismo resultado matemático. USD entra
  // en la cuenta como una divisa más, con retorno 0 contra sí misma.
  const chartData = useMemo(() => {
    const rangeDays = RANGES.find((r) => r.key === range)!.days;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    const visibleDates = axisDates.filter((d) => d >= cutoffIso);
    if (visibleDates.length === 0) return [];

    // Último valor conocido de cada divisa en o antes de la fecha base —
    // si una divisa no publicó ese día exacto (fin de semana/feriado), se
    // usa el cierre anterior, no se deja un hueco.
    function valueAt(currency: Currency, date: string): number | undefined {
      if (currency === 'USD') return 1;
      const byDate = smoothedByCurrency.get(currency);
      if (!byDate) return undefined;
      if (byDate.has(date)) return byDate.get(date);
      let fallback: number | undefined;
      for (const [d, v] of byDate) {
        if (d > date) break;
        fallback = v;
      }
      return fallback;
    }

    const baseDate = visibleDates[0];
    const base: Partial<Record<Currency, number>> = {};
    for (const c of CURRENCIES) base[c] = valueAt(c, baseDate);

    return visibleDates.map((date) => {
      const logReturns: Partial<Record<Currency, number>> = {};
      for (const c of CURRENCIES) {
        const b = base[c];
        const v = valueAt(c, date);
        logReturns[c] = b && v ? Math.log(v / b) : 0;
      }
      const avgAll = CURRENCIES.reduce((sum, c) => sum + (logReturns[c] ?? 0), 0) / CURRENCIES.length;
      const row: Record<string, string | number> = { date };
      for (const c of CURRENCIES) {
        // Fortaleza de c = su retorno vs. el promedio del resto (equivale a
        // promediar c contra cada una de las otras 8 por separado).
        const relative = (logReturns[c] ?? 0) - avgAll;
        row[c] = Number(((Math.exp(relative) - 1) * 100).toFixed(3));
      }
      return row;
    });
  }, [axisDates, smoothedByCurrency, range]);

  const ranking = useMemo(() => {
    const last = chartData[chartData.length - 1] as Record<string, number> | undefined;
    return [...CURRENCIES].map((c) => ({ currency: c, value: (last?.[c] as number) ?? 0 })).sort((a, b) => b.value - a.value);
  }, [chartData]);

  function toggleCurrency(c: Currency) {
    setHiddenCurrencies((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function selectTool(next: DrawTool) {
    setTool(next);
    setPendingPoint(null);
  }

  function handleChartClick(state: MouseHandlerDataParam) {
    if (tool === 'cursor') return;
    const { activeLabel, activeCoordinate } = state;
    if (activeLabel === undefined || !activeCoordinate || !yInverseRef.current) return;
    const rawValue = yInverseRef.current(activeCoordinate.y);
    if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) return;
    const value = Number(rawValue.toFixed(3));

    if (tool === 'horizontal') {
      setDrawings((prev) => [...prev, { id: nextDrawingId(), type: 'horizontal', value }]);
      return;
    }

    const point: Point = { date: String(activeLabel), value };
    if (!pendingPoint) {
      setPendingPoint(point);
      return;
    }
    setDrawings((prev) => [...prev, { id: nextDrawingId(), type: tool, a: pendingPoint, b: point }]);
    setPendingPoint(null);
  }

  function handleUndo() {
    if (pendingPoint) {
      setPendingPoint(null);
      return;
    }
    setDrawings((prev) => prev.slice(0, -1));
  }

  function handleClearDrawings() {
    setDrawings([]);
    setPendingPoint(null);
  }

  const hasDrawingState = drawings.length > 0 || pendingPoint !== null;
  const chartAreaHeight = expanded ? 'calc(100vh - 230px)' : 560;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Fortaleza de Divisa
          </h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
            Rendimiento de cada divisa contra el promedio de las otras 8 (triangulando los cruces, no solo vs. USD), a
            partir del tipo de cambio spot real de la Reserva Federal (FRED, H.10) — no de datos económicos cargados en
            el sistema. Precio suavizado con una EMA de {EMA_PERIOD} ruedas antes de calcular el retorno.
          </p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title={expanded ? 'Reducir (Esc)' : 'Ampliar a pantalla completa'}
        >
          {expanded ? '✕ Reducir' : '⛶ Ampliar'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full p-1" style={{ background: 'var(--surface-2)' }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: range === r.key ? 'var(--series-1)' : 'transparent', color: range === r.key ? '#fff' : 'var(--text-secondary)' }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-full p-1" style={{ background: 'var(--surface-2)' }}>
          {TOOLS.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTool(t.key)}
              title={t.hint}
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: tool === t.key ? 'var(--series-1)' : 'transparent', color: tool === t.key ? '#fff' : 'var(--text-secondary)' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleUndo}
          disabled={!hasDrawingState}
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', opacity: hasDrawingState ? 1 : 0.4 }}
        >
          ↩ Deshacer
        </button>
        <button
          onClick={handleClearDrawings}
          disabled={!hasDrawingState}
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', opacity: hasDrawingState ? 1 : 0.4 }}
        >
          🗑 Borrar todo
        </button>

        {tool !== 'cursor' && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {tool === 'horizontal'
              ? 'Clic en el gráfico para fijar un nivel horizontal.'
              : pendingPoint
                ? 'Ahora clic en el segundo punto.'
                : 'Clic en el primer punto.'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        {CURRENCIES.map((c) => {
          const hidden = hiddenCurrencies.has(c);
          return (
            <button key={c} onClick={() => toggleCurrency(c)} className="flex items-center gap-1 text-xs font-semibold" style={{ opacity: hidden ? 0.35 : 1, color: 'var(--text-secondary)' }}>
              <span style={{ width: 14, height: 3, background: CURRENCY_COLORS[c], display: 'inline-block', borderRadius: 2 }} />
              {c}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: chartAreaHeight,
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 8,
            cursor: tool !== 'cursor' ? 'crosshair' : 'default',
          }}
        >
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Todavía no hay tipo de cambio sincronizado para este rango — el sync de FRED corre cada 30 min.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} onClick={handleChartClick}>
                <CartesianGrid vertical={false} stroke="var(--gridline)" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} minTickGap={40} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, label, payload }) => {
                    if (!active || !payload) return null;
                    const row = payload[0]?.payload as Record<string, number> | undefined;
                    if (!row) return null;
                    const sorted = [...CURRENCIES].filter((c) => !hiddenCurrencies.has(c)).sort((a, b) => (row[b] ?? 0) - (row[a] ?? 0));
                    return (
                      <div className="rounded-md px-2.5 py-1.5 text-xs shadow-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{formatDate(label as string)}</div>
                        <div className="flex flex-col gap-0.5">
                          {sorted.map((c) => (
                            <div key={c} className="flex items-center gap-2">
                              <span className="rounded px-1 text-[9px] font-bold text-white" style={{ background: CURRENCY_COLORS[c] }}>
                                {c}
                              </span>
                              <span className="ml-auto font-semibold" style={{ color: (row[c] ?? 0) >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>
                                {(row[c] ?? 0) >= 0 ? '+' : ''}
                                {row[c]}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                {CURRENCIES.map((c) => (
                  <Line key={c} type="linear" dataKey={c} stroke={CURRENCY_COLORS[c]} strokeWidth={2} dot={false} isAnimationActive={false} hide={hiddenCurrencies.has(c)} />
                ))}
                <ScaleBridge yInverseRef={yInverseRef} />
                {drawings
                  .filter((d): d is Extract<Drawing, { type: 'horizontal' }> => d.type === 'horizontal')
                  .map((d) => (
                    <ReferenceLine
                      key={d.id}
                      y={d.value}
                      stroke="var(--series-1)"
                      strokeDasharray="4 2"
                      label={{ value: `${d.value >= 0 ? '+' : ''}${d.value}%`, position: 'insideTopRight', fill: 'var(--text-secondary)', fontSize: 10 }}
                    />
                  ))}
                <TrendDrawingsLayer drawings={drawings} />
                {pendingPoint && tool !== 'horizontal' && (
                  <ReferenceDot x={pendingPoint.date} y={pendingPoint.value} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
                )}
                <Brush dataKey="date" height={26} tickFormatter={formatDate} travellerWidth={9} stroke="var(--series-1)" fill="var(--surface-2)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ width: 260, flexShrink: 0 }}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            🏆 Ranking del período
          </h3>
          <div className="flex flex-col gap-1">
            {ranking.map((r, i) => (
              <div key={r.currency} className="flex items-center gap-2 rounded-md px-2 py-1" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <span className="w-4 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: CURRENCY_COLORS[r.currency] }}>
                  {r.currency}
                </span>
                <span className="ml-auto text-xs font-bold" style={{ color: r.value > 0 ? 'var(--status-good)' : r.value < 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}>
                  {r.value > 0 ? '+' : ''}
                  {r.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col gap-4 overflow-auto p-4" style={{ background: 'var(--page)' }}>
        {content}
      </div>
    );
  }

  return <div className="flex flex-col gap-4">{content}</div>;
}
