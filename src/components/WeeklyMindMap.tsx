import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMacroData } from '../data/MacroDataContext';
import { INDICATORS } from '../data/indicators';
import { CURRENCIES } from '../data/CurrencyContext';
import { BIAS_COLORS, BIAS_LABELS } from '../lib/bias';
import { formatValue } from '../lib/format';
import { startOfWeek } from '../lib/weeklyHub';
import type { BiasLevel } from '../types';

const INDICATORS_BY_ID = new Map(INDICATORS.map((m) => [m.id, m]));

interface StoredMap {
  positions: Record<string, { x: number; y: number }>;
  edges: { id: string; source: string; target: string }[];
}

function storageKey(weekStartIso: string) {
  return `hikman-mindmap:v1:${weekStartIso}`;
}

function loadStored(weekStartIso: string): StoredMap {
  try {
    const raw = localStorage.getItem(storageKey(weekStartIso));
    return raw ? (JSON.parse(raw) as StoredMap) : { positions: {}, edges: [] };
  } catch {
    return { positions: {}, edges: [] };
  }
}

function saveStored(weekStartIso: string, data: StoredMap) {
  try {
    localStorage.setItem(storageKey(weekStartIso), JSON.stringify(data));
  } catch {
    // localStorage lleno/deshabilitado — el mapa sigue funcionando en memoria, solo no persiste.
  }
}

// Nodo de indicador: los datos de la semana (mismo criterio que el feed).
function IndicatorNode({ data }: NodeProps) {
  const d = data as { label: string; currency: string; actual: string; forecast: string };
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-sm"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', width: 200 }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--series-1)' }}>
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
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// Nodo de sesgo: ancla fija por divisa, destino de las conexiones causales.
function BiasNode({ data }: NodeProps) {
  const d = data as { currency: string; level: BiasLevel | null };
  const color = d.level ? BIAS_COLORS[d.level] : 'var(--text-muted)';
  return (
    <div
      className="rounded-full px-4 py-3 text-center text-xs font-bold shadow-sm"
      style={{ background: color, color: '#fff', minWidth: 110 }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div>{d.currency}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
        {d.level ? BIAS_LABELS[d.level] : 'Sin sesgo'}
      </div>
    </div>
  );
}

const nodeTypes = { indicator: IndicatorNode, bias: BiasNode };

export function WeeklyMindMap() {
  const { recentUpdates, forecasts, biases } = useMacroData();

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const weekCards = useMemo(
    () =>
      recentUpdates
        .filter((u) => new Date(u.updatedAt) >= weekStart)
        .map((u) => ({ update: u, meta: INDICATORS_BY_ID.get(u.indicatorId) }))
        .filter((c): c is { update: (typeof recentUpdates)[number]; meta: NonNullable<(typeof c)['meta']> } => Boolean(c.meta)),
    [recentUpdates, weekStart],
  );

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Reconstruye nodos cada vez que cambian los datos de la semana o se cambia
  // de semana — conserva la posición que el usuario ya arrastró (localStorage
  // por semana) y ubica en grilla los nodos nuevos que todavía no tienen una.
  useEffect(() => {
    const stored = loadStored(weekStartIso);

    const biasNodes: Node[] = CURRENCIES.map((currency, i) => ({
      id: `bias:${currency}`,
      type: 'bias',
      position: stored.positions[`bias:${currency}`] ?? { x: i * 160, y: 520 },
      data: { currency, level: biases[currency]?.current.level ?? null },
      draggable: true,
    }));

    const indicatorNodes: Node[] = weekCards.map(({ update, meta }, i) => {
      const id = `ind:${update.indicatorId}:${update.date}`;
      const forecast = forecasts[update.indicatorId];
      return {
        id,
        type: 'indicator',
        position: stored.positions[id] ?? { x: (i % 5) * 220 + 20, y: Math.floor(i / 5) * 130 + 20 },
        data: {
          label: meta.shortLabel,
          currency: meta.currency ?? 'USD',
          actual: formatValue(update.value, meta.format),
          forecast: forecast !== undefined ? formatValue(forecast, meta.format) : '—',
        },
      };
    });

    setNodes([...indicatorNodes, ...biasNodes]);
    setEdges(stored.edges.map((e) => ({ ...e, id: e.id })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartIso, weekCards, biases]);

  const persist = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const n of nextNodes) positions[n.id] = n.position;
      saveStored(weekStartIso, { positions, edges: nextEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })) });
    },
    [weekStartIso],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => {
        const next = applyNodeChanges(changes, prev);
        persist(next, edges);
        return next;
      });
    },
    [edges, persist],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((prev) => {
        const next = applyEdgeChanges(changes, prev);
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((prev) => {
        const next = addEdge({ ...connection, animated: false }, prev);
        persist(nodes, next);
        return next;
      });
    },
    [nodes, persist],
  );

  function handleClearConnections() {
    if (!window.confirm('¿Borrar todas las conexiones dibujadas esta semana? Los nodos quedan donde están.')) return;
    setEdges([]);
    persist(nodes, []);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Arrastrá desde el borde de una tarjeta hasta otro nodo para conectar causa → efecto. Se guarda solo en este
          navegador (todavía no sincroniza a la nube).
        </p>
        <button onClick={handleClearConnections} className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Borrar conexiones
        </button>
      </div>
      <div style={{ height: 640, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
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
      {weekCards.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Todavía no hay datos cargados esta semana — el mapa arranca solo con las 9 anclas de sesgo hasta que
          aparezcan indicadores.
        </p>
      )}
    </div>
  );
}
