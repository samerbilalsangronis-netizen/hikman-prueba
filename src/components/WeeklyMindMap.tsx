import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMacroData } from '../data/MacroDataContext';
import { INDICATORS } from '../data/indicators';
import { CURRENCIES } from '../data/CurrencyContext';
import { BIAS_COLORS, BIAS_LABELS, CENTRAL_BANK_BY_CURRENCY } from '../lib/bias';
import { CURRENCY_COLORS, crossCurrencyLinks } from '../lib/currencyColors';
import { formatValue, formatDate } from '../lib/format';
import { computeImpact, startOfWeek } from '../lib/weeklyHub';
import type { BiasLevel, Currency, ImpactLevel } from '../types';

const INDICATORS_BY_ID = new Map(INDICATORS.map((m) => [m.id, m]));
const WEEKS_BACK = 3;
const STORAGE_KEY = 'hikman-mindmap:v3';

const ECONOMY_STICKERS = ['💰', '📈', '📉', '🏦', '🛢️', '🔥', '⚠️', '🧭', '🐂', '🐻', '⭐', '📌'];

// "Rostro" del banquero central de cada divisa — avatar genérico + sigla del
// banco (no la foto de una persona real: los cargos cambian y no vamos a
// afirmar una identidad puntual sobre algo que puede quedar desactualizado).
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
const BANKER_STICKERS = CURRENCIES.map((currency, i) => ({
  emoji: BANKER_FACES[i % BANKER_FACES.length],
  label: BANK_SHORT[currency],
  currency,
}));

// Layout en carriles: una fila horizontal por divisa, columnas = semanas
// (más vieja a la izquierda) + una columna final de "sesgo actual" — así el
// mapa se lee como una línea de tiempo que desemboca en el sesgo, en vez de
// una nube de nodos sueltos.
const LANE_TOP = 70;
const LANE_HEIGHT = 150;
const WEEK_COL_START = 40;
const WEEK_COL_WIDTH = 300;
const BIAS_COL_X = WEEK_COL_START + WEEKS_BACK * WEEK_COL_WIDTH + 30;
const LANE_LABEL_X = -150;

function laneY(currencyIndex: number) {
  return LANE_TOP + currencyIndex * LANE_HEIGHT;
}

function weekColumnX(weekIndex: number) {
  return WEEK_COL_START + weekIndex * WEEK_COL_WIDTH;
}

function weekIndexFor(updatedAtIso: string, currentWeekStart: Date): number {
  const rowWeekStart = startOfWeek(new Date(updatedAtIso));
  const diffWeeks = Math.round((currentWeekStart.getTime() - rowWeekStart.getTime()) / (7 * 86400000));
  const idx = WEEKS_BACK - 1 - diffWeeks;
  return Math.min(WEEKS_BACK - 1, Math.max(0, idx));
}

function indicatorPosition(currencyIndex: number, weekIndex: number, indexInCell: number) {
  return {
    x: weekColumnX(weekIndex) + (indexInCell % 2) * 140,
    y: laneY(currencyIndex) + Math.floor(indexInCell / 2) * 56 - 20,
  };
}

function nodeCurrencyOf(id: string): Currency | null {
  if (id.startsWith('bias:')) return id.slice(5) as Currency;
  if (id.startsWith('ind:')) {
    const indicatorId = id.split(':')[1];
    const meta = INDICATORS_BY_ID.get(indicatorId);
    return meta?.currency ?? 'USD';
  }
  return null;
}

interface StoredMap {
  positions: Record<string, { x: number; y: number }>;
  edges: { id: string; source: string; target: string }[];
  stickers: { id: string; emoji: string; label?: string; color?: string }[];
  hiddenAuto: string[];
}

function loadStored(): StoredMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { positions: {}, edges: [], stickers: [], hiddenAuto: [] };
    const parsed = JSON.parse(raw) as Partial<StoredMap>;
    return {
      positions: parsed.positions ?? {},
      edges: parsed.edges ?? [],
      stickers: parsed.stickers ?? [],
      hiddenAuto: parsed.hiddenAuto ?? [],
    };
  } catch {
    return { positions: {}, edges: [], stickers: [], hiddenAuto: [] };
  }
}

function saveStored(data: StoredMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno/deshabilitado — el mapa sigue funcionando en memoria, solo no persiste.
  }
}

// Nodo de indicador: dato real de las últimas semanas, coloreado por divisa;
// si es de alto impacto, brilla para destacar sobre el resto del tablero.
function IndicatorNode({ data }: NodeProps) {
  const d = data as { label: string; currency: Currency; actual: string; forecast: string; impact: ImpactLevel };
  const color = CURRENCY_COLORS[d.currency];
  const glow = d.impact === 'alto';
  return (
    <div
      className={glow ? 'mindmap-node-glow' : undefined}
      style={
        {
          background: 'var(--surface-1)',
          border: `2px solid ${color}`,
          borderRadius: 10,
          padding: '8px 10px',
          width: 190,
          fontSize: 12,
          '--glow-color': color,
        } as CSSProperties
      }
    >
      <Handle type="target" position={Position.Top} style={{ background: color, borderColor: color }} />
      <div className="flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: color }}>
          {d.currency}
        </span>
        <span className="truncate font-semibold" style={{ color: 'var(--text-primary)' }}>
          {d.label}
        </span>
      </div>
      <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
        Real: <strong style={{ color: 'var(--text-primary)' }}>{d.actual}</strong>
        {d.forecast !== '—' && <> · Prev: {d.forecast}</>}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ background: color, borderColor: color }} />
    </div>
  );
}

// Nodo de sesgo: ancla fija por divisa — el color de fondo es el sesgo
// actual, el anillo exterior es el color propio de la divisa.
function BiasNode({ data }: NodeProps) {
  const d = data as { currency: Currency; level: BiasLevel | null };
  const bg = d.level ? BIAS_COLORS[d.level] : 'var(--text-muted)';
  const ring = CURRENCY_COLORS[d.currency];
  return (
    <div
      className="rounded-full text-center text-xs font-bold shadow-sm"
      style={{ background: bg, color: '#fff', minWidth: 110, padding: '11px 14px', border: `3px solid ${ring}` }}
    >
      <Handle type="target" position={Position.Top} style={{ background: ring, borderColor: ring }} />
      <div>{d.currency}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
        {d.level ? BIAS_LABELS[d.level] : 'Sin sesgo'}
      </div>
    </div>
  );
}

function StickerNode({ data }: NodeProps) {
  const d = data as { emoji: string; label?: string; color?: string };
  if (d.label) {
    return (
      <div className="flex flex-col items-center" style={{ cursor: 'grab' }}>
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 44, height: 44, fontSize: 24, background: d.color ?? 'var(--surface-2)', border: '2px solid #fff' }}
        >
          {d.emoji}
        </div>
        <span
          className="mt-0.5 rounded px-1 text-[10px] font-bold text-white"
          style={{ background: d.color ?? 'var(--text-muted)' }}
        >
          {d.label}
        </span>
      </div>
    );
  }
  return (
    <div style={{ fontSize: 34, lineHeight: 1, cursor: 'grab' }}>{d.emoji}</div>
  );
}

function LaneLabelNode({ data }: NodeProps) {
  const d = data as { currency: Currency };
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color: CURRENCY_COLORS[d.currency], whiteSpace: 'nowrap' }}>
      {d.currency}
    </div>
  );
}

function ColumnLabelNode({ data }: NodeProps) {
  const d = data as { text: string };
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
      {d.text}
    </div>
  );
}

const nodeTypes = {
  indicator: IndicatorNode,
  bias: BiasNode,
  sticker: StickerNode,
  laneLabel: LaneLabelNode,
  columnLabel: ColumnLabelNode,
};

interface EdgeSelection {
  id: string;
  label: string;
}

export function WeeklyMindMap() {
  const { recentUpdates, forecasts, biases } = useMacroData();
  const [includeLowImpact, setIncludeLowImpact] = useState(false);
  const [stickerMenu, setStickerMenu] = useState<null | 'economia' | 'banqueros'>(null);
  const [bulkCurrency, setBulkCurrency] = useState<Currency>('USD');
  const [selectedEdge, setSelectedEdge] = useState<EdgeSelection | null>(null);
  const [hiddenAuto, setHiddenAuto] = useState<Set<string>>(new Set());

  const currentWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const windowStart = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7 * (WEEKS_BACK - 1));
    return d;
  }, [currentWeekStart]);

  const relevantCards = useMemo(() => {
    return recentUpdates
      .filter((u) => new Date(u.updatedAt) >= windowStart)
      .map((u) => {
        const meta = INDICATORS_BY_ID.get(u.indicatorId);
        if (!meta) return null;
        const forecast = forecasts[u.indicatorId];
        const impact = computeImpact(u.value, forecast);
        return { update: u, meta, forecast, impact, week: weekIndexFor(u.updatedAt, currentWeekStart) };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .filter((c) => includeLowImpact || c.impact !== 'bajo')
      .sort((a, b) => a.update.updatedAt.localeCompare(b.update.updatedAt));
  }, [recentUpdates, forecasts, windowStart, currentWeekStart, includeLowImpact]);

  // Todo lo cargado en la ventana (sin filtro de impacto) agrupado por día —
  // el resumen diario es un registro completo, no una vista recortada.
  const dailyDigest = useMemo(() => {
    const byDay = new Map<string, { currency: Currency; label: string; actual: string; forecast: string }[]>();
    for (const u of recentUpdates) {
      if (new Date(u.updatedAt) < windowStart) continue;
      const meta = INDICATORS_BY_ID.get(u.indicatorId);
      if (!meta) continue;
      const day = u.updatedAt.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      const forecast = forecasts[u.indicatorId];
      byDay.get(day)!.push({
        currency: meta.currency ?? 'USD',
        label: meta.shortLabel,
        actual: formatValue(u.value, meta.format),
        forecast: forecast !== undefined ? formatValue(forecast, meta.format) : '—',
      });
    }
    return [...byDay.entries()].map(([date, items]) => ({ date, items })).sort((a, b) => b.date.localeCompare(a.date));
  }, [recentUpdates, forecasts, windowStart]);

  const cardsByCell = useMemo(() => {
    const map = new Map<string, typeof relevantCards>();
    for (const c of relevantCards) {
      const cur = c.meta.currency ?? 'USD';
      const key = `${cur}:${c.week}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [relevantCards]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [manualEdges, setManualEdges] = useState<Edge[]>([]);

  // Reconstruye nodos cada vez que cambian los datos — conserva la posición
  // que ya arrastraste (persistida en localStorage, sin límite de semana: es
  // un tablero vivo) y ubica en su carril/columna lo nuevo.
  useEffect(() => {
    const stored = loadStored();
    setHiddenAuto(new Set(stored.hiddenAuto));

    const laneLabels: Node[] = CURRENCIES.map((currency, i) => ({
      id: `lane:${currency}`,
      type: 'laneLabel',
      position: { x: LANE_LABEL_X, y: laneY(i) + 14 },
      data: { currency },
      draggable: false,
      selectable: false,
      deletable: false,
    }));

    const weekLabels: Node[] = Array.from({ length: WEEKS_BACK }, (_, w) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() - 7 * (WEEKS_BACK - 1 - w));
      const text = w === WEEKS_BACK - 1 ? 'Esta semana' : `Semana del ${formatDate(d.toISOString().slice(0, 10))}`;
      return {
        id: `collabel:${w}`,
        type: 'columnLabel',
        position: { x: weekColumnX(w), y: 20 },
        data: { text },
        draggable: false,
        selectable: false,
        deletable: false,
      };
    });
    weekLabels.push({
      id: 'collabel:bias',
      type: 'columnLabel',
      position: { x: BIAS_COL_X, y: 20 },
      data: { text: 'Sesgo actual' },
      draggable: false,
      selectable: false,
      deletable: false,
    });

    const biasNodes: Node[] = CURRENCIES.map((currency, i) => ({
      id: `bias:${currency}`,
      type: 'bias',
      position: stored.positions[`bias:${currency}`] ?? { x: BIAS_COL_X, y: laneY(i) },
      data: { currency, level: biases[currency]?.current.level ?? null },
      draggable: true,
      deletable: false,
    }));

    const indicatorNodes: Node[] = [];
    CURRENCIES.forEach((currency, ci) => {
      for (let w = 0; w < WEEKS_BACK; w++) {
        const list = cardsByCell.get(`${currency}:${w}`) ?? [];
        list.forEach(({ update, meta, forecast, impact }, i) => {
          const id = `ind:${update.indicatorId}:${update.date}`;
          indicatorNodes.push({
            id,
            type: 'indicator',
            position: stored.positions[id] ?? indicatorPosition(ci, w, i),
            data: {
              label: meta.shortLabel,
              currency,
              actual: formatValue(update.value, meta.format),
              forecast: forecast !== undefined ? formatValue(forecast, meta.format) : '—',
              impact,
            },
            deletable: false,
          });
        });
      }
    });

    const stickerNodes: Node[] = stored.stickers.map((s) => ({
      id: s.id,
      type: 'sticker',
      position: stored.positions[s.id] ?? { x: BIAS_COL_X / 2, y: laneY(4) },
      data: { emoji: s.emoji, label: s.label, color: s.color },
      draggable: true,
      selectable: true,
    }));

    setNodes([...laneLabels, ...weekLabels, ...indicatorNodes, ...biasNodes, ...stickerNodes]);
    setManualEdges(stored.edges.map((e) => ({ ...e, id: e.id, deletable: false, selectable: true })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsByCell, biases, currentWeekStart]);

  // Conexiones automáticas: cada dato mostrado ya llega conectado a su
  // divisa (así el tablero nunca arranca vacío) y, si es de alto impacto,
  // además se conecta a las divisas "terceras" con vínculo estructural
  // conocido, con la razón como etiqueta. Se pueden ocultar una por una,
  // por divisa o todas — eso se guarda aparte (hiddenAuto).
  const autoEdges = useMemo<Edge[]>(() => {
    const result: Edge[] = [];
    for (const { update, meta, impact } of relevantCards) {
      const currency = meta.currency ?? 'USD';
      const id = `ind:${update.indicatorId}:${update.date}`;
      const ownColor = CURRENCY_COLORS[currency];
      result.push({
        id: `auto:${id}:bias:${currency}`,
        source: id,
        target: `bias:${currency}`,
        style: { stroke: ownColor, strokeWidth: impact === 'alto' ? 3 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: ownColor },
        deletable: false,
        reconnectable: false,
        zIndex: 0,
      });
      if (impact === 'alto') {
        for (const link of crossCurrencyLinks(currency)) {
          const linkColor = CURRENCY_COLORS[link.currency];
          result.push({
            id: `cross:${id}:bias:${link.currency}`,
            source: id,
            target: `bias:${link.currency}`,
            label: link.reason,
            labelStyle: { fill: 'var(--text-muted)', fontSize: 10 },
            style: { stroke: linkColor, strokeWidth: 1.5, strokeDasharray: '4 3' },
            markerEnd: { type: MarkerType.ArrowClosed, color: linkColor },
            deletable: false,
            reconnectable: false,
            zIndex: 0,
          });
        }
      }
    }
    return result;
  }, [relevantCards]);

  const visibleAutoEdges = useMemo(() => autoEdges.filter((e) => !hiddenAuto.has(e.id)), [autoEdges, hiddenAuto]);

  const edges = useMemo(() => {
    const highlight = (e: Edge): Edge =>
      e.id === selectedEdge?.id
        ? { ...e, style: { ...e.style, strokeWidth: ((e.style?.strokeWidth as number) ?? 1.5) + 2.5 }, zIndex: 20 }
        : e;
    return [...visibleAutoEdges.map(highlight), ...manualEdges.map(highlight)];
  }, [visibleAutoEdges, manualEdges, selectedEdge]);

  const persistAll = useCallback((nextNodes: Node[], nextManualEdges: Edge[], nextHidden: Set<string>) => {
    const positions: Record<string, { x: number; y: number }> = {};
    const stickers: { id: string; emoji: string; label?: string; color?: string }[] = [];
    for (const n of nextNodes) {
      if (n.type === 'laneLabel' || n.type === 'columnLabel') continue;
      positions[n.id] = n.position;
      if (n.type === 'sticker') {
        const d = n.data as { emoji: string; label?: string; color?: string };
        stickers.push({ id: n.id, emoji: d.emoji, label: d.label, color: d.color });
      }
    }
    saveStored({
      positions,
      edges: nextManualEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      stickers,
      hiddenAuto: [...nextHidden],
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => {
        const next = applyNodeChanges(changes, prev);
        persistAll(next, manualEdges, hiddenAuto);
        return next;
      });
    },
    [manualEdges, hiddenAuto, persistAll],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setManualEdges((prev) => {
        const next = addEdge(
          { ...connection, deletable: false, selectable: true, style: { stroke: 'var(--text-secondary)', strokeWidth: 1.5 } },
          prev,
        );
        persistAll(nodes, next, hiddenAuto);
        return next;
      });
    },
    [nodes, hiddenAuto, persistAll],
  );

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    const label = typeof edge.label === 'string' ? edge.label : `${nodeCurrencyOf(edge.source) ?? '?'} → ${nodeCurrencyOf(edge.target) ?? '?'}`;
    setSelectedEdge({ id: edge.id, label });
  }, []);

  const onPaneClick = useCallback(() => setSelectedEdge(null), []);

  function deleteSelectedEdge() {
    if (!selectedEdge) return;
    if (selectedEdge.id.startsWith('auto:') || selectedEdge.id.startsWith('cross:')) {
      setHiddenAuto((prev) => {
        const next = new Set(prev);
        next.add(selectedEdge.id);
        persistAll(nodes, manualEdges, next);
        return next;
      });
    } else {
      setManualEdges((prev) => {
        const next = prev.filter((e) => e.id !== selectedEdge.id);
        persistAll(nodes, next, hiddenAuto);
        return next;
      });
    }
    setSelectedEdge(null);
  }

  function deleteCurrencyConnections(currency: Currency) {
    const toHide = autoEdges.filter((e) => nodeCurrencyOf(e.source) === currency || nodeCurrencyOf(e.target) === currency).map((e) => e.id);
    const nextHidden = new Set(hiddenAuto);
    toHide.forEach((id) => nextHidden.add(id));
    const nextManual = manualEdges.filter((e) => !(nodeCurrencyOf(e.source) === currency || nodeCurrencyOf(e.target) === currency));
    setHiddenAuto(nextHidden);
    setManualEdges(nextManual);
    setSelectedEdge(null);
    persistAll(nodes, nextManual, nextHidden);
  }

  function deleteAllConnections() {
    if (!window.confirm('¿Borrar TODAS las conexiones del tablero (automáticas y las que dibujaste vos)?')) return;
    const nextHidden = new Set(hiddenAuto);
    autoEdges.forEach((e) => nextHidden.add(e.id));
    setHiddenAuto(nextHidden);
    setManualEdges([]);
    setSelectedEdge(null);
    persistAll(nodes, [], nextHidden);
  }

  function addSticker(emoji: string, label?: string, color?: string) {
    const id = `sticker:${Date.now()}:${Math.round(Math.random() * 1000)}`;
    const jitter = () => (Math.random() - 0.5) * 120;
    const node: Node = {
      id,
      type: 'sticker',
      position: { x: BIAS_COL_X / 2 + jitter(), y: laneY(4) + jitter() },
      data: { emoji, label, color },
      draggable: true,
    };
    setNodes((prev) => {
      const next = [...prev, node];
      persistAll(next, manualEdges, hiddenAuto);
      return next;
    });
    setStickerMenu(null);
  }

  useEffect(() => {
    if (!selectedEdge) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelectedEdge();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEdge]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Últimas {WEEKS_BACK} semanas organizadas por semana (columnas) y divisa (carriles) — ya conectadas a su sesgo.
        Lo de alto impacto brilla y además se conecta a las divisas relacionadas. Click en una conexión para
        seleccionarla y borrarla.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={includeLowImpact} onChange={(e) => setIncludeLowImpact(e.target.checked)} />
          Incluir bajo impacto
        </label>

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
              <div
                className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg p-2 shadow-lg"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              >
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
                      <button
                        key={emoji}
                        onClick={() => addSticker(emoji)}
                        className="rounded-md px-2 py-1 text-lg leading-none hover:opacity-70"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {BANKER_STICKERS.map((b) => (
                      <button
                        key={b.currency}
                        onClick={() => addSticker(b.emoji, b.label, CURRENCY_COLORS[b.currency])}
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

        <div className="flex items-center gap-1">
          <select
            value={bulkCurrency}
            onChange={(e) => setBulkCurrency(e.target.value as Currency)}
            className="rounded-md px-2 py-1 text-xs"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-secondary)' }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => deleteCurrencyConnections(bulkCurrency)}
            className="rounded-md px-2.5 py-1 text-xs font-semibold"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Borrar conexiones de esa divisa
          </button>
        </div>

        <button
          onClick={deleteAllConnections}
          className="rounded-md px-2.5 py-1 text-xs font-semibold"
          style={{ border: '1px solid var(--status-critical)', color: 'var(--status-critical)' }}
        >
          Borrar todas las conexiones
        </button>
      </div>

      {selectedEdge && (
        <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Conexión seleccionada: {selectedEdge.label}</span>
          <button onClick={deleteSelectedEdge} className="rounded px-2 py-0.5 font-semibold text-white" style={{ background: 'var(--status-critical)' }}>
            Borrar esta conexión
          </button>
          <button onClick={() => setSelectedEdge(null)} className="rounded px-2 py-0.5" style={{ color: 'var(--text-muted)' }}>
            Cancelar
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <div style={{ flex: 1, minWidth: 0, height: 760, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            colorMode="system"
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        <div style={{ width: 300, flexShrink: 0, height: 760, display: 'flex', flexDirection: 'column' }}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            📓 Resumen diario
          </h3>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {dailyDigest.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Nada cargado en las últimas {WEEKS_BACK} semanas todavía.
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
                      <span
                        className="rounded px-1 text-[9px] font-bold text-white"
                        style={{ background: CURRENCY_COLORS[it.currency] }}
                      >
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

      {relevantCards.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Sin datos {includeLowImpact ? '' : 'de impacto medio/alto '}en las últimas {WEEKS_BACK} semanas — el mapa
          arranca solo con las 9 anclas de sesgo.
        </p>
      )}
    </div>
  );
}
