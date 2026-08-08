import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMacroData } from '../data/MacroDataContext';
import { INDICATORS } from '../data/indicators';
import { CURRENCIES } from '../data/CurrencyContext';
import { BIAS_COLORS, BIAS_LABELS } from '../lib/bias';
import { CURRENCY_COLORS, crossCurrencyLinks } from '../lib/currencyColors';
import { formatValue } from '../lib/format';
import { computeImpact, startOfWeek } from '../lib/weeklyHub';
import type { BiasLevel, Currency, ImpactLevel } from '../types';

const INDICATORS_BY_ID = new Map(INDICATORS.map((m) => [m.id, m]));
const WEEKS_BACK = 3;
const STORAGE_KEY = 'hikman-mindmap:v2';
const STICKER_OPTIONS = ['📌', '💰', '📈', '📉', '🏦', '🛢️', '🔥', '⚠️', '🧭', '🐂', '🐻', '⭐'];

const CENTER = { x: 760, y: 460 };
const BIAS_RADIUS = 400;
const INDICATOR_MIN_RADIUS = 130;

interface StoredMap {
  positions: Record<string, { x: number; y: number }>;
  edges: { id: string; source: string; target: string }[];
  stickers: { id: string; emoji: string }[];
}

function loadStored(): StoredMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { positions: {}, edges: [], stickers: [] };
    const parsed = JSON.parse(raw) as Partial<StoredMap>;
    return { positions: parsed.positions ?? {}, edges: parsed.edges ?? [], stickers: parsed.stickers ?? [] };
  } catch {
    return { positions: {}, edges: [], stickers: [] };
  }
}

function saveStored(data: StoredMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno/deshabilitado — el mapa sigue funcionando en memoria, solo no persiste.
  }
}

function biasAngle(index: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / CURRENCIES.length;
}

function biasPosition(index: number) {
  const a = biasAngle(index);
  return { x: CENTER.x + BIAS_RADIUS * Math.cos(a), y: CENTER.y + BIAS_RADIUS * Math.sin(a) };
}

// Ubica cada indicador "hacia" el anfitrión de su divisa, en abanico, para que
// el mapa arranque ya organizado en vez de una grilla ciega — como un
// tablero donde cada divisa es un planeta y sus datos orbitan alrededor.
function indicatorPosition(currencyIndex: number, indexWithinCurrency: number, countForCurrency: number) {
  const baseAngle = biasAngle(currencyIndex);
  const spread = Math.min(0.55, 0.14 * countForCurrency);
  const a = baseAngle + (indexWithinCurrency - (countForCurrency - 1) / 2) * (spread / Math.max(1, countForCurrency - 1));
  const radius = INDICATOR_MIN_RADIUS + (indexWithinCurrency % 3) * 90;
  return { x: CENTER.x + radius * Math.cos(a), y: CENTER.y + radius * Math.sin(a) };
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
  const d = data as { emoji: string };
  return <div style={{ fontSize: 34, lineHeight: 1, cursor: 'grab' }}>{d.emoji}</div>;
}

const nodeTypes = { indicator: IndicatorNode, bias: BiasNode, sticker: StickerNode };

export function WeeklyMindMap() {
  const { recentUpdates, forecasts, biases } = useMacroData();
  const [includeLowImpact, setIncludeLowImpact] = useState(false);

  const windowStart = useMemo(() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() - 7 * (WEEKS_BACK - 1));
    return d;
  }, []);

  const relevantCards = useMemo(() => {
    return recentUpdates
      .filter((u) => new Date(u.updatedAt) >= windowStart)
      .map((u) => {
        const meta = INDICATORS_BY_ID.get(u.indicatorId);
        if (!meta) return null;
        const forecast = forecasts[u.indicatorId];
        const impact = computeImpact(u.value, forecast);
        return { update: u, meta, forecast, impact };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .filter((c) => includeLowImpact || c.impact !== 'bajo')
      .sort((a, b) => b.update.updatedAt.localeCompare(a.update.updatedAt));
  }, [recentUpdates, forecasts, windowStart, includeLowImpact]);

  const cardsByCurrency = useMemo(() => {
    const map = new Map<Currency, typeof relevantCards>();
    for (const c of relevantCards) {
      const cur = c.meta.currency ?? 'USD';
      if (!map.has(cur)) map.set(cur, []);
      map.get(cur)!.push(c);
    }
    return map;
  }, [relevantCards]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [manualEdges, setManualEdges] = useState<Edge[]>([]);

  // Reconstruye nodos e conexiones automáticas cada vez que cambian los datos
  // — conserva la posición que ya arrastraste (persistida en localStorage,
  // sin límite de semana: es un tablero vivo) y ubica en abanico lo nuevo.
  useEffect(() => {
    const stored = loadStored();

    const biasNodes: Node[] = CURRENCIES.map((currency, i) => ({
      id: `bias:${currency}`,
      type: 'bias',
      position: stored.positions[`bias:${currency}`] ?? biasPosition(i),
      data: { currency, level: biases[currency]?.current.level ?? null },
      draggable: true,
    }));

    const indicatorNodes: Node[] = [];
    CURRENCIES.forEach((currency, ci) => {
      const list = cardsByCurrency.get(currency) ?? [];
      list.forEach(({ update, meta, forecast, impact }, i) => {
        const id = `ind:${update.indicatorId}:${update.date}`;
        indicatorNodes.push({
          id,
          type: 'indicator',
          position: stored.positions[id] ?? indicatorPosition(ci, i, list.length),
          data: {
            label: meta.shortLabel,
            currency,
            actual: formatValue(update.value, meta.format),
            forecast: forecast !== undefined ? formatValue(forecast, meta.format) : '—',
            impact,
          },
        });
      });
    });

    const stickerNodes: Node[] = stored.stickers.map((s) => ({
      id: s.id,
      type: 'sticker',
      position: stored.positions[s.id] ?? { x: CENTER.x, y: CENTER.y },
      data: { emoji: s.emoji },
      draggable: true,
      selectable: true,
    }));

    setNodes([...indicatorNodes, ...biasNodes, ...stickerNodes]);
    setManualEdges(stored.edges.map((e) => ({ ...e, id: e.id })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsByCurrency, biases]);

  // Conexiones automáticas: cada dato mostrado ya llega conectado a su
  // divisa (así el tablero nunca arranca vacío) y, si es de alto impacto,
  // además se conecta a las divisas "terceras" con vínculo estructural
  // conocido, con la razón como etiqueta.
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
        selectable: false,
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
            selectable: false,
            reconnectable: false,
            zIndex: 0,
          });
        }
      }
    }
    return result;
  }, [relevantCards]);

  const edges = useMemo(() => [...autoEdges, ...manualEdges], [autoEdges, manualEdges]);

  const persist = useCallback((nextNodes: Node[], nextManualEdges: Edge[]) => {
    const positions: Record<string, { x: number; y: number }> = {};
    const stickers: { id: string; emoji: string }[] = [];
    for (const n of nextNodes) {
      positions[n.id] = n.position;
      if (n.type === 'sticker') stickers.push({ id: n.id, emoji: (n.data as { emoji: string }).emoji });
    }
    saveStored({ positions, edges: nextManualEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })), stickers });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => {
        const next = applyNodeChanges(changes, prev);
        persist(next, manualEdges);
        return next;
      });
    },
    [manualEdges, persist],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setManualEdges((prev) => {
        const next = applyEdgeChanges(changes, prev);
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setManualEdges((prev) => {
        const next = addEdge({ ...connection, style: { stroke: 'var(--text-secondary)', strokeWidth: 1.5 } }, prev);
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist],
  );

  function handleClearConnections() {
    if (!window.confirm('¿Borrar las conexiones que dibujaste vos? Las automáticas por divisa quedan igual.')) return;
    setManualEdges([]);
    persist(nodes, []);
  }

  function addSticker(emoji: string) {
    const id = `sticker:${Date.now()}:${Math.round(Math.random() * 1000)}`;
    const jitter = () => (Math.random() - 0.5) * 160;
    const node: Node = {
      id,
      type: 'sticker',
      position: { x: CENTER.x + jitter(), y: CENTER.y + jitter() },
      data: { emoji },
      draggable: true,
    };
    setNodes((prev) => {
      const next = [...prev, node];
      persist(next, manualEdges);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Últimas {WEEKS_BACK} semanas, ya conectadas a su divisa — lo de alto impacto brilla y además se conecta a
          las divisas relacionadas. Arrastrá para reordenar o dibujá tus propias conexiones.
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={includeLowImpact} onChange={(e) => setIncludeLowImpact(e.target.checked)} />
            Incluir bajo impacto
          </label>
          <button
            onClick={handleClearConnections}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Borrar mis conexiones
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <span className="mr-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          Stickers:
        </span>
        {STICKER_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => addSticker(emoji)}
            title="Agregar al tablero"
            className="rounded-md px-2 py-1 text-lg leading-none hover:opacity-70"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div style={{ height: 680, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="system"
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
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
