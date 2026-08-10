import { useCallback, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMacroData } from '../data/MacroDataContext';
import { INDICATORS } from '../data/indicators';
import { CURRENCIES } from '../data/CurrencyContext';
import { CENTRAL_BANK_BY_CURRENCY } from '../lib/bias';
import { CURRENCY_COLORS, crossCurrencyLinks } from '../lib/currencyColors';
import { computeImpact, startOfWeek, surpriseColor } from '../lib/weeklyHub';
import { formatDate, formatValue } from '../lib/format';
import type { Currency, CurrencyBias, Format, Headline, IndicatorMeta } from '../types';

const INDICATORS_BY_ID = new Map(INDICATORS.map((m) => [m.id, m]));
const OVERRIDES_KEY = 'hikman-strength:overrides:v1';
const ANNOTATIONS_KEY = 'hikman-strength:annotations:v1';
const DIGEST_WEEKS = 3;

const RANGES = [
  { key: '1d', label: '1D', days: 2 },
  { key: '1s', label: '1S', days: 7 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1a', label: '1A', days: 365 },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

const ECONOMY_STICKERS = ['💰', '📈', '📉', '🏦', '🛢️', '🔥', '⚠️', '🧭', '🐂', '🐻', '⭐', '📌'];
const BANK_SHORT: Record<Currency, string> = {
  USD: 'Fed',
  EUR: 'BCE',
  GBP: 'BoE',
  CAD: 'BoC',
  AUD: 'RBA',
  NZD: 'RBNZ',
  JPY: 'BOJ',
  CHF: 'SNB',
  CNY: 'PBoC',
};
const BANKER_FACES = ['🧑‍💼', '🧔', '👩‍💼', '👨🏻‍💼', '👩🏽‍💼', '🧑🏾‍💼', '🧕', '👨🏼‍💼', '👩🏻‍💼'];
const BANKER_STICKERS = CURRENCIES.map((currency, i) => ({ emoji: BANKER_FACES[i % BANKER_FACES.length], label: BANK_SHORT[currency], currency }));

// Sorpresa (real vs. previsión) -> delta de puntos, misma escala -2..+2 que
// la "valoración" manual del resto de la app (ScorePanel), para que el
// número se lea igual aunque la fuente sea distinta.
function autoDelta(meta: IndicatorMeta, actual: number, forecast: number | undefined): number {
  const impact = computeImpact(actual, forecast);
  const magnitude = impact === 'alto' ? 2 : impact === 'medio' ? 1 : 0;
  const direction = surpriseColor(meta, actual, forecast);
  const sign = direction === 'neutral_alcista' ? 1 : direction === 'neutral_bajista' ? -1 : 0;
  return magnitude * sign;
}

// Muchos indicadores de tasas de política monetaria (sección "tasas") no
// tienen previsión cargada en este proyecto — no hay "consenso" para eso,
// lo que importa es si subió, bajó o se mantuvo respecto de la reunión
// anterior, no una sorpresa contra un número que nadie estimó. Sin este
// fallback, computeImpact trata "sin previsión" como "sin sorpresa" y el
// puntaje queda siempre en 0 — que es justamente lo que se veía en producción
// pese a haber datos reales cargándose (el resumen diario los mostraba, el
// gráfico no se movía). Un cambio de nivel de tasa es alto impacto per se;
// otro indicador sin previsión que igual cambió de valor, impacto medio.
function previousValueDelta(meta: IndicatorMeta, actual: number, previousValue: number | undefined): number {
  if (previousValue === undefined || meta.goodDirection === 'neutral') return 0;
  const diff = actual - previousValue;
  if (diff === 0) return 0;
  const magnitude = meta.section === 'tasas' ? 2 : 1;
  const sign = meta.goodDirection === 'up' ? Math.sign(diff) : -Math.sign(diff);
  return magnitude * sign;
}

// Un titular no trae "real vs. previsión" — la magnitud sale de su impacto
// (mismo criterio que Titulares) y la dirección solo se conoce si ya está
// fijado como motivo del sesgo de esa divisa (Panel de Control). Si no está
// fijado, arranca en 0 — el usuario lo corrige a mano en el nodo, no
// inventamos un tono que nadie clasificó.
function headlineAutoDelta(headline: Headline, currency: Currency, biases: Partial<Record<Currency, CurrencyBias>>): number {
  const magnitude = headline.impact === 'alto' ? 2 : headline.impact === 'medio' ? 1 : 0;
  if (magnitude === 0) return 0;
  const reason = biases[currency]?.current.reasons.find((r) => r.headlineId === headline.id);
  if (!reason) return 0;
  const sign = reason.color === 'hawkish' || reason.color === 'neutral_alcista' ? 1 : reason.color === 'dovish' || reason.color === 'neutral_bajista' ? -1 : 0;
  return magnitude * sign;
}

interface StrengthEvent {
  id: string;
  currency: Currency;
  date: string;
  kind: 'indicator' | 'headline';
  indicatorLabel: string;
  actual?: number;
  forecast?: number;
  previousValue?: number;
  format?: Format;
  headlineUrl?: string;
  headlineSource?: string;
  autoDeltaValue: number;
  isCross: boolean;
  reason?: string;
  sourceCurrency?: Currency;
}

interface Annotation {
  id: string;
  type: 'sticker' | 'text';
  emoji?: string;
  label?: string;
  color?: string;
  text?: string;
  xPct: number;
  yPct: number;
}

function loadOverrides(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function saveOverrides(data: Record<string, number>) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno/deshabilitado — sigue andando en memoria nomás.
  }
}
function loadAnnotations(): Annotation[] {
  try {
    return JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function saveAnnotations(data: Annotation[]) {
  try {
    localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno/deshabilitado — sigue andando en memoria nomás.
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface DotClickInfo {
  date: string;
  currency: Currency;
  events: StrengthEvent[];
}

function EventDot(props: {
  cx?: number;
  cy?: number;
  payload?: { events?: Partial<Record<Currency, StrengthEvent[]>> };
  dataKey?: string | number | ((obj: unknown) => unknown);
  color: string;
  showEvents: boolean;
  onDotClick: (info: DotClickInfo) => void;
}) {
  const { cx, cy, payload, dataKey, color, showEvents, onDotClick } = props;
  if (!showEvents || cx === undefined || cy === undefined || !payload || typeof dataKey !== 'string') return null;
  const evts = payload.events?.[dataKey as Currency];
  if (!evts || evts.length === 0) return null;
  const hasAlto = evts.some((e) => Math.abs(e.autoDeltaValue) >= 2);
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onDotClick({ date: evts[0].date, currency: dataKey as Currency, events: evts })}>
      {hasAlto && <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.28} className="pulse-glow" style={{ '--glow-color': color } as CSSProperties} />}
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="var(--surface-1)" strokeWidth={2} />
    </g>
  );
}

export function CurrencyStrengthChart() {
  const { recentUpdates, forecasts, headlines, biases } = useMacroData();
  const [range, setRange] = useState<RangeKey>('3m');
  const [showEvents, setShowEvents] = useState(true);
  const [hiddenCurrencies, setHiddenCurrencies] = useState<Set<Currency>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, number>>(() => loadOverrides());
  const [annotations, setAnnotations] = useState<Annotation[]>(() => loadAnnotations());
  const [dotInfo, setDotInfo] = useState<DotClickInfo | null>(null);
  const [stickerMenu, setStickerMenu] = useState<null | 'economia' | 'banqueros'>(null);
  const chartAreaRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ id: string; rect: DOMRect } | null>(null);

  const rangeDays = RANGES.find((r) => r.key === range)!.days;
  const rangeStartIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.toISOString().slice(0, 10);
  }, [rangeDays]);

  // Valor anterior por (indicador, fecha) usando TODO el historial cargado
  // (no solo la ventana visible) — hace falta para el fallback de indicadores
  // sin previsión, incluso si su punto anterior quedó fuera de la ventana.
  const previousValueByKey = useMemo(() => {
    const byIndicator = new Map<string, { date: string; value: number }[]>();
    for (const u of recentUpdates) {
      if (!byIndicator.has(u.indicatorId)) byIndicator.set(u.indicatorId, []);
      byIndicator.get(u.indicatorId)!.push({ date: u.date, value: u.value });
    }
    const result = new Map<string, number>();
    for (const [id, list] of byIndicator) {
      list.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < list.length; i++) {
        result.set(`${id}:${list[i].date}`, list[i - 1].value);
      }
    }
    return result;
  }, [recentUpdates]);

  // Un evento por dato real (dedupeado por indicador+fecha, se queda con el
  // más reciente si se recargó) dentro de la ventana elegida.
  const indicatorEvents = useMemo<StrengthEvent[]>(() => {
    const byId = new Map<string, (typeof recentUpdates)[number]>();
    for (const u of recentUpdates) {
      if (u.date < rangeStartIso) continue;
      const key = `${u.indicatorId}:${u.date}`;
      const existing = byId.get(key);
      if (!existing || existing.updatedAt < u.updatedAt) byId.set(key, u);
    }
    const events: StrengthEvent[] = [];
    for (const u of byId.values()) {
      const meta = INDICATORS_BY_ID.get(u.indicatorId);
      if (!meta) continue;
      const forecast = forecasts[u.indicatorId];
      const previousValue = previousValueByKey.get(`${u.indicatorId}:${u.date}`);
      const delta = forecast !== undefined ? autoDelta(meta, u.value, forecast) : previousValueDelta(meta, u.value, previousValue);
      events.push({
        id: `ev:${u.indicatorId}:${u.date}`,
        currency: meta.currency ?? 'USD',
        date: u.date,
        kind: 'indicator',
        indicatorLabel: meta.shortLabel,
        actual: u.value,
        forecast,
        previousValue: forecast === undefined ? previousValue : undefined,
        format: meta.format,
        autoDeltaValue: delta,
        isCross: false,
      });
    }
    return events;
  }, [recentUpdates, forecasts, rangeStartIso, previousValueByKey]);

  // Un evento por divisa etiquetada en cada titular (un mismo titular puede
  // tocar varias) dentro de la ventana elegida — mismas tags que ya clasifica
  // el sync de Finnhub, no inventamos relevancia nueva.
  const headlineEvents = useMemo<StrengthEvent[]>(() => {
    const events: StrengthEvent[] = [];
    for (const h of headlines) {
      const date = h.publishedAt.slice(0, 10);
      if (date < rangeStartIso) continue;
      for (const tag of h.tags) {
        if (!(CURRENCIES as readonly string[]).includes(tag)) continue;
        const currency = tag as Currency;
        events.push({
          id: `hl:${h.id}:${currency}`,
          currency,
          date,
          kind: 'headline',
          indicatorLabel: h.titleEs ?? h.title,
          headlineUrl: h.url,
          headlineSource: h.source,
          autoDeltaValue: headlineAutoDelta(h, currency, biases),
          isCross: false,
        });
      }
    }
    return events;
  }, [headlines, biases, rangeStartIso]);

  const baseEvents = useMemo(
    () => [...indicatorEvents, ...headlineEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [indicatorEvents, headlineEvents],
  );

  // Efectivo = lo que el usuario haya sobrescrito, si no el automático. Si un
  // dato ECONÓMICO de alto impacto (efectivo, no solo el automático) pega en
  // su propia divisa, también genera un eco menor en las divisas con vínculo
  // conocido — los titulares no: el clasificador de Finnhub ya etiqueta
  // directamente todas las divisas que toca, sumar un eco encima sería
  // contar dos veces lo mismo.
  const allEvents = useMemo<StrengthEvent[]>(() => {
    const withCross: StrengthEvent[] = [];
    for (const ev of baseEvents) {
      withCross.push(ev);
      const effective = overrides[ev.id] ?? ev.autoDeltaValue;
      if (ev.kind === 'indicator' && Math.abs(effective) >= 2) {
        for (const link of crossCurrencyLinks(ev.currency)) {
          const crossId = `cross:${ev.id}:${link.currency}`;
          withCross.push({
            id: crossId,
            currency: link.currency,
            date: ev.date,
            kind: 'indicator',
            indicatorLabel: ev.indicatorLabel,
            actual: ev.actual,
            forecast: ev.forecast,
            format: ev.format,
            autoDeltaValue: Math.sign(effective) * 1,
            isCross: true,
            reason: link.reason,
            sourceCurrency: ev.currency,
          });
        }
      }
    }
    return withCross;
  }, [baseEvents, overrides]);

  const effectiveDelta = useCallback((ev: StrengthEvent) => overrides[ev.id] ?? ev.autoDeltaValue, [overrides]);

  // Serie acumulada por divisa, en formato "ancho" para recharts — cada fila
  // es una fecha con evento en CUALQUIER divisa; las divisas sin evento ese
  // día quedan en su último valor (así se mantiene la fortaleza salvo que
  // algo — propio o de un tercero — la mueva).
  const chartData = useMemo(() => {
    const byCurrency = new Map<Currency, StrengthEvent[]>();
    for (const c of CURRENCIES) byCurrency.set(c, []);
    for (const ev of allEvents) byCurrency.get(ev.currency)!.push(ev);
    for (const list of byCurrency.values()) list.sort((a, b) => a.date.localeCompare(b.date));

    const allDates = [...new Set(allEvents.map((e) => e.date))].sort();
    const cursor: Record<Currency, number> = Object.fromEntries(CURRENCIES.map((c) => [c, 0])) as Record<Currency, number>;
    const cumulative: Record<Currency, number> = Object.fromEntries(CURRENCIES.map((c) => [c, 0])) as Record<Currency, number>;

    const rows: Record<string, unknown>[] = [{ date: rangeStartIso, ...cumulative, events: {} }];
    for (const date of allDates) {
      const events: Partial<Record<Currency, StrengthEvent[]>> = {};
      for (const c of CURRENCIES) {
        const list = byCurrency.get(c)!;
        let ptr = cursor[c];
        while (ptr < list.length && list[ptr].date === date) {
          cumulative[c] += effectiveDelta(list[ptr]);
          (events[c] ??= []).push(list[ptr]);
          ptr++;
        }
        cursor[c] = ptr;
      }
      rows.push({ date, ...cumulative, events });
    }
    return rows;
  }, [allEvents, effectiveDelta, rangeStartIso]);

  const ranking = useMemo(() => {
    const last = chartData[chartData.length - 1] as Record<string, number> | undefined;
    return [...CURRENCIES].map((c) => ({ currency: c, value: (last?.[c] as number) ?? 0 })).sort((a, b) => b.value - a.value);
  }, [chartData]);

  // Resumen diario: todo lo cargado (por updatedAt, no por fecha del dato) en
  // las últimas semanas, sin filtrar por impacto — es un registro, no un
  // recorte.
  const dailyDigest = useMemo(() => {
    const digestStart = startOfWeek(new Date());
    digestStart.setDate(digestStart.getDate() - 7 * (DIGEST_WEEKS - 1));
    const byDay = new Map<string, { currency: Currency; label: string; actual: string }[]>();
    for (const u of recentUpdates) {
      if (new Date(u.updatedAt) < digestStart) continue;
      const meta = INDICATORS_BY_ID.get(u.indicatorId);
      if (!meta) continue;
      const day = u.updatedAt.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push({ currency: meta.currency ?? 'USD', label: meta.shortLabel, actual: formatValue(u.value, meta.format) });
    }
    return [...byDay.entries()].map(([date, items]) => ({ date, items })).sort((a, b) => b.date.localeCompare(a.date));
  }, [recentUpdates]);

  function setOverride(id: string, value: number | null) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === null) delete next[id];
      else next[id] = value;
      saveOverrides(next);
      return next;
    });
  }

  function toggleCurrency(c: Currency) {
    setHiddenCurrencies((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function addAnnotation(partial: Omit<Annotation, 'id' | 'xPct' | 'yPct'>) {
    const id = `an:${Date.now()}:${Math.round(Math.random() * 1000)}`;
    const next = [...annotations, { ...partial, id, xPct: 45 + Math.random() * 10, yPct: 40 + Math.random() * 10 }];
    setAnnotations(next);
    saveAnnotations(next);
    setStickerMenu(null);
  }

  function updateAnnotation(id: string, patch: Partial<Annotation>) {
    setAnnotations((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      saveAnnotations(next);
      return next;
    });
  }

  function removeAnnotation(id: string) {
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAnnotations(next);
      return next;
    });
  }

  function onAnnotationPointerDown(id: string, e: ReactPointerEvent) {
    if (!chartAreaRef.current) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { id, rect: chartAreaRef.current.getBoundingClientRect() };
  }
  function onAnnotationPointerMove(e: ReactPointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    const xPct = clamp(((e.clientX - drag.rect.left) / drag.rect.width) * 100, 0, 100);
    const yPct = clamp(((e.clientY - drag.rect.top) / drag.rect.height) * 100, 0, 100);
    updateAnnotation(drag.id, { xPct, yPct });
  }
  function onAnnotationPointerUp() {
    dragState.current = null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Fortaleza acumulada por divisa a partir de los datos cargados — económicos (sorpresa real vs. previsión) y
        titulares (📰, según las divisas que etiquetó el sync) — suman o restan puntos, y una divisa se mantiene en su
        nivel hasta que un dato propio — o de una divisa relacionada — la mueve. Pasá el mouse por cualquier punto de
        la línea de tiempo para ver qué catalizadores hubo ese día; click en un nodo puntual para corregir su
        puntaje. Usá la franja de abajo del gráfico para moverte por el histórico cargado.
      </p>

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

        <button
          onClick={() => setShowEvents((s) => !s)}
          className="rounded-md px-2.5 py-1 text-xs font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface-1)' }}
        >
          {showEvents ? '🙈 Ocultar datos' : '👁️ Mostrar datos'}
        </button>

        <button
          onClick={() => addAnnotation({ type: 'text', text: 'Nota…' })}
          className="rounded-md px-2.5 py-1 text-xs font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface-1)' }}
        >
          ✏️ + Texto
        </button>

        <div className="relative">
          <button
            onClick={() => setStickerMenu((m) => (m ? null : 'economia'))}
            className="rounded-md px-2.5 py-1 text-xs font-semibold"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface-1)' }}
          >
            🎨 Stickers ▾
          </button>
          {stickerMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStickerMenu(null)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg p-2 shadow-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="mb-1.5 flex gap-1 text-xs font-semibold">
                  <button
                    onClick={() => setStickerMenu('economia')}
                    className="rounded px-2 py-1"
                    style={{ background: stickerMenu === 'economia' ? 'var(--series-1)' : 'transparent', color: stickerMenu === 'economia' ? '#fff' : 'var(--text-secondary)' }}
                  >
                    Economía
                  </button>
                  <button
                    onClick={() => setStickerMenu('banqueros')}
                    className="rounded px-2 py-1"
                    style={{ background: stickerMenu === 'banqueros' ? 'var(--series-1)' : 'transparent', color: stickerMenu === 'banqueros' ? '#fff' : 'var(--text-secondary)' }}
                  >
                    Banqueros
                  </button>
                </div>
                {stickerMenu === 'economia' ? (
                  <div className="flex flex-wrap gap-1">
                    {ECONOMY_STICKERS.map((emoji) => (
                      <button key={emoji} onClick={() => addAnnotation({ type: 'sticker', emoji })} className="rounded-md px-2 py-1 text-lg leading-none hover:opacity-70" style={{ background: 'var(--surface-2)' }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {BANKER_STICKERS.map((b) => (
                      <button
                        key={b.currency}
                        onClick={() => addAnnotation({ type: 'sticker', emoji: b.emoji, label: b.label, color: CURRENCY_COLORS[b.currency] })}
                        title={CENTRAL_BANK_BY_CURRENCY[b.currency]}
                        className="flex flex-col items-center gap-0.5 rounded-md px-1.5 py-1 hover:opacity-70"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        <span className="text-lg leading-none">{b.emoji}</span>
                        <span className="text-[9px] font-bold" style={{ color: CURRENCY_COLORS[b.currency] }}>
                          {b.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
        <div className="relative" style={{ flex: 1, minWidth: 0, height: 600, border: '1px solid var(--border)', borderRadius: 12, padding: 8 }} ref={chartAreaRef} onPointerMove={onAnnotationPointerMove} onPointerUp={onAnnotationPointerUp}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} minTickGap={40} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                content={({ active, label, payload }) => {
                  if (!active) return null;
                  const row = payload?.[0]?.payload as { events?: Partial<Record<Currency, StrengthEvent[]>> } | undefined;
                  const events = row?.events ? Object.values(row.events).flat() : [];
                  return (
                    <div
                      className="rounded-md px-2.5 py-1.5 text-xs shadow-sm"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', maxWidth: 260 }}
                    >
                      <div style={{ color: 'var(--text-muted)', marginBottom: events.length ? 4 : 0, fontWeight: 600 }}>{formatDate(label as string)}</div>
                      {events.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)' }}>Sin catalizadores este día</div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {events.map((ev) => {
                            const delta = overrides[ev.id] ?? ev.autoDeltaValue;
                            return (
                              <div key={ev.id} className="flex items-baseline gap-1.5">
                                <span
                                  className="shrink-0 rounded px-1 text-[9px] font-bold text-white"
                                  style={{ background: CURRENCY_COLORS[ev.currency] }}
                                >
                                  {ev.currency}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                  {ev.kind === 'headline' ? '📰 ' : ''}
                                  {ev.indicatorLabel}
                                </span>
                                <span
                                  className="shrink-0 font-bold"
                                  style={{ color: delta > 0 ? 'var(--status-good)' : delta < 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}
                                >
                                  {delta > 0 ? '+' : ''}
                                  {delta}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {CURRENCIES.map((c) => (
                <Line
                  key={c}
                  type="stepAfter"
                  dataKey={c}
                  stroke={CURRENCY_COLORS[c]}
                  strokeWidth={2}
                  dot={(props) => <EventDot key={`${c}-${(props as { payload?: { date?: string } }).payload?.date}`} {...props} color={CURRENCY_COLORS[c]} showEvents={showEvents} onDotClick={setDotInfo} />}
                  isAnimationActive={false}
                  hide={hiddenCurrencies.has(c)}
                />
              ))}
              <Brush dataKey="date" height={26} tickFormatter={formatDate} travellerWidth={9} stroke="var(--series-1)" fill="var(--surface-2)" />
            </LineChart>
          </ResponsiveContainer>

          {allEvents.length === 0 && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Sin catalizadores en {RANGES.find((r) => r.key === range)?.label.toLowerCase()} — probá un rango más amplio.
            </div>
          )}

          {annotations.map((a) => (
            <div
              key={a.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${a.xPct}%`, top: `${a.yPct}%`, zIndex: 5 }}
            >
              {a.type === 'sticker' ? (
                <div onPointerDown={(e) => onAnnotationPointerDown(a.id, e)} className="flex flex-col items-center" style={{ cursor: 'grab' }}>
                  {a.label ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, fontSize: 22, background: a.color ?? 'var(--surface-2)', border: '2px solid #fff' }}>
                        {a.emoji}
                      </div>
                      <span className="mt-0.5 rounded px-1 text-[9px] font-bold text-white" style={{ background: a.color ?? 'var(--text-muted)' }}>
                        {a.label}
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 30, lineHeight: 1 }}>{a.emoji}</div>
                  )}
                </div>
              ) : (
                <div className="rounded-md shadow-sm" style={{ background: '#fef3c7', minWidth: 120, maxWidth: 200 }}>
                  <div onPointerDown={(e) => onAnnotationPointerDown(a.id, e)} className="rounded-t-md px-1.5 py-0.5 text-[9px] font-bold" style={{ background: '#fde68a', color: '#78350f', cursor: 'grab' }}>
                    ⠿ nota
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateAnnotation(a.id, { text: e.currentTarget.textContent ?? '' })}
                    className="px-2 py-1.5 text-xs outline-none"
                    style={{ color: '#78350f', minHeight: 32 }}
                  >
                    {a.text}
                  </div>
                </div>
              )}
              <button
                onClick={() => removeAnnotation(a.id)}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white group-hover:flex"
                style={{ background: 'var(--status-critical)' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ width: 300, flexShrink: 0, height: 600, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              🏆 Ranking actual
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
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              📓 Resumen diario
            </h3>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {dailyDigest.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Nada cargado en las últimas {DIGEST_WEEKS} semanas todavía.
                </p>
              )}
              {dailyDigest.map((day) => (
                <div key={day.date} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <div className="mb-1 flex items-center gap-1.5">
                    <span>📅</span>
                    <strong className="text-xs capitalize" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(day.date)}
                    </strong>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      ({day.items.length})
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {day.items.map((it, i) => (
                      <li key={i} className="flex items-baseline gap-1.5 text-[11px]">
                        <span className="rounded px-1 text-[9px] font-bold text-white" style={{ background: CURRENCY_COLORS[it.currency] }}>
                          {it.currency}
                        </span>
                        <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                          {it.label}
                        </span>
                        <span className="ml-auto shrink-0 font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {it.actual}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {dotInfo && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setDotInfo(null)}>
          <div className="w-full max-w-md rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatDate(dotInfo.date)} · <span style={{ color: CURRENCY_COLORS[dotInfo.currency] }}>{dotInfo.currency}</span>
              </h4>
              <button onClick={() => setDotInfo(null)} className="text-lg" style={{ color: 'var(--text-muted)' }}>
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {dotInfo.events.map((ev) => {
                const current = overrides[ev.id] ?? ev.autoDeltaValue;
                return (
                  <div key={ev.id} className="rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {ev.kind === 'headline' ? '📰 ' : ''}
                      {ev.indicatorLabel}
                    </p>
                    {ev.isCross ? (
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Eco del dato de {ev.sourceCurrency} — {ev.reason}
                      </p>
                    ) : ev.kind === 'headline' ? (
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {ev.headlineSource}
                        {ev.headlineUrl && (
                          <>
                            {' · '}
                            <a href={ev.headlineUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--series-1)' }}>
                              ver fuente
                            </a>
                          </>
                        )}
                        {current === 0 && overrides[ev.id] === undefined && ' · sin dirección fijada: puntaje en 0 hasta que lo corrijas'}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Real: {formatValue(ev.actual!, ev.format!)}
                        {ev.forecast !== undefined && <> · Previsión: {formatValue(ev.forecast, ev.format!)}</>}
                        {ev.forecast === undefined && ev.previousValue !== undefined && (
                          <> · Anterior: {formatValue(ev.previousValue, ev.format!)} (sin previsión cargada — se compara contra el dato previo)</>
                        )}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        Puntaje:
                      </span>
                      <select
                        value={current}
                        onChange={(e) => setOverride(ev.id, Number(e.target.value))}
                        className="rounded px-1.5 py-0.5 text-xs"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
                      >
                        {[-2, -1, 0, 1, 2].map((n) => (
                          <option key={n} value={n}>
                            {n > 0 ? `+${n}` : n}
                          </option>
                        ))}
                      </select>
                      {overrides[ev.id] !== undefined && (
                        <button onClick={() => setOverride(ev.id, null)} className="text-[10px] font-semibold" style={{ color: 'var(--series-1)' }}>
                          Restablecer automático ({ev.autoDeltaValue > 0 ? '+' : ''}
                          {ev.autoDeltaValue})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
