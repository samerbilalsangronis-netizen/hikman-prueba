import { useEffect, useState } from 'react';
import { useTradingJournal } from '../../data/TradingJournalContext';
import type { TradeDirection, TradeIdea } from '../../types';
import { cardStyle, inputStyle } from './tradingUi';

// Seguimiento de Idea Operativa (4-oct-2026, pedido explícito del usuario):
// un lugar para anotar la idea de trade que está siguiendo AHORA MISMO —
// UNA sola, no una lista de setups — para tenerla visualmente presente
// ("manifestarla") sin que eso empuje a sobre-operar. Cuando decide montarla
// de verdad, "🚀 Cargar Trade" la manda prellenada a "Registrar Trade" (acá
// arriba, en BitacoraTrading.tsx, que es quien conecta ambas pestañas) y la
// marca como 'ejecutada' (deja de mostrarse acá).

const COLLAPSED_KEY = 'hikman:trading-idea-collapsed';

interface IdeaFormState {
  instrument: string;
  direction: TradeDirection;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  notes: string;
}

function emptyForm(): IdeaFormState {
  return { instrument: '', direction: 'compra', entryZone: '', stopLoss: '', takeProfit: '', notes: '' };
}

function formFromIdea(idea: TradeIdea): IdeaFormState {
  return {
    instrument: idea.instrument,
    direction: idea.direction,
    entryZone: idea.entryZone ?? '',
    stopLoss: idea.stopLoss ?? '',
    takeProfit: idea.takeProfit ?? '',
    notes: idea.notes,
  };
}

export interface TradePrefill {
  instrument: string;
  direction: TradeDirection;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  notes: string;
}

/** La "zona" de una idea puede ser un rango de texto ("1.0820-1.0850") — si
 * se puede leer como un único número, se prellena el campo numérico del
 * formulario de trade; si no, se agrega a las notas para no perder el dato. */
function parseNumeric(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : undefined;
}

function ideaToPrefill(idea: TradeIdea): TradePrefill {
  const entryPrice = parseNumeric(idea.entryZone);
  const stopLoss = parseNumeric(idea.stopLoss);
  const takeProfit = parseNumeric(idea.takeProfit);
  const extras: string[] = [];
  if (idea.entryZone && entryPrice === undefined) extras.push(`Zona de entrada (idea): ${idea.entryZone}`);
  if (idea.stopLoss && stopLoss === undefined) extras.push(`SL (idea): ${idea.stopLoss}`);
  if (idea.takeProfit && takeProfit === undefined) extras.push(`TP (idea): ${idea.takeProfit}`);
  const notes = [idea.notes, ...extras].filter(Boolean).join('\n');
  return { instrument: idea.instrument, direction: idea.direction, entryPrice, stopLoss, takeProfit, notes };
}

export function IdeaTracker({ onLoadToTrade }: { onLoadToTrade: (prefill: TradePrefill) => void }) {
  const { tradeIdeas, saveIdea, updateIdea, markIdeaExecuted, discardIdea } = useTradingJournal();
  const activeIdea = tradeIdeas.find((i) => i.status === 'activa');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');
  const [form, setForm] = useState<IdeaFormState | null>(null);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  function openNew() {
    setForm(emptyForm());
  }

  function openEdit() {
    if (activeIdea) setForm(formFromIdea(activeIdea));
  }

  async function handleSave() {
    if (!form || !form.instrument.trim()) return;
    const input = {
      instrument: form.instrument.trim().toUpperCase(),
      direction: form.direction,
      entryZone: form.entryZone.trim() || undefined,
      stopLoss: form.stopLoss.trim() || undefined,
      takeProfit: form.takeProfit.trim() || undefined,
      notes: form.notes.trim(),
    };
    if (activeIdea) {
      await updateIdea(activeIdea.id, input);
    } else {
      await saveIdea(input);
    }
    setForm(null);
  }

  async function handleDiscard() {
    if (!activeIdea) return;
    if (!window.confirm('¿Descartar esta idea? Deja de mostrarse acá (queda guardada como historial).')) return;
    await discardIdea(activeIdea.id);
  }

  async function handleLoadToTrade() {
    if (!activeIdea) return;
    onLoadToTrade(ideaToPrefill(activeIdea));
    await markIdeaExecuted(activeIdea.id);
  }

  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <div className={collapsed ? 'flex flex-wrap items-center justify-between gap-2' : 'mb-3 flex flex-wrap items-center justify-between gap-2'}>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold"
          style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
          title={collapsed ? 'Expandir' : 'Minimizar'}
        >
          <span className="text-sm leading-none" style={{ color: 'var(--series-1)' }}>
            {collapsed ? '▸' : '▾'}
          </span>
          🎯 Seguimiento de Idea Operativa
        </button>
        {!collapsed && !activeIdea && (
          <button onClick={openNew} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--series-1)', color: '#fff' }}>
            + Nueva idea
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {!activeIdea ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin idea activa. Anotá acá la que estás siguiendo ahora mismo — una sola, para tenerla presente sin que se vuelva una lista que empuje a operar de más.
            </p>
          ) : (
            <div className="flex flex-col gap-2 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {activeIdea.instrument}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: activeIdea.direction === 'compra' ? 'color-mix(in srgb, var(--status-good) 20%, transparent)' : 'color-mix(in srgb, var(--status-critical) 20%, transparent)',
                    color: activeIdea.direction === 'compra' ? 'var(--status-good)' : 'var(--status-critical)',
                  }}
                >
                  {activeIdea.direction === 'compra' ? 'Compra' : 'Venta'}
                </span>
              </div>
              {(activeIdea.entryZone || activeIdea.stopLoss || activeIdea.takeProfit) && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {activeIdea.entryZone && `Entrada: ${activeIdea.entryZone}  `}
                  {activeIdea.stopLoss && `· SL: ${activeIdea.stopLoss}  `}
                  {activeIdea.takeProfit && `· TP: ${activeIdea.takeProfit}`}
                </p>
              )}
              {activeIdea.notes && (
                <p className="whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {activeIdea.notes}
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-2">
                <button onClick={handleLoadToTrade} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: 'var(--series-1)' }}>
                  🚀 Cargar Trade
                </button>
                <button onClick={openEdit} className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  ✏️ Editar
                </button>
                <button onClick={handleDiscard} className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ border: '1px solid var(--border)', color: 'var(--status-critical)' }}>
                  🗑️ Descartar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex overflow-y-auto p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setForm(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeIdea ? 'Editar idea operativa' : 'Nueva idea operativa'}
        >
          <div className="m-auto w-full max-w-md rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {activeIdea ? 'Editar idea operativa' : 'Nueva idea operativa'}
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={form.instrument}
                  onChange={(e) => setForm({ ...form, instrument: e.target.value })}
                  placeholder="Instrumento (ej. EURUSD)"
                  className="flex-1 rounded-md px-3 py-2 text-sm"
                  style={inputStyle}
                />
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as TradeDirection })} className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
                  <option value="compra">Compra</option>
                  <option value="venta">Venta</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  value={form.entryZone}
                  onChange={(e) => setForm({ ...form, entryZone: e.target.value })}
                  placeholder="Zona de entrada"
                  className="rounded-md px-3 py-2 text-sm"
                  style={inputStyle}
                />
                <input value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} placeholder="Stop Loss" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
                <input
                  value={form.takeProfit}
                  onChange={(e) => setForm({ ...form, takeProfit: e.target.value })}
                  placeholder="Take Profit"
                  className="rounded-md px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Tesis de la idea — por qué te interesa, qué estás esperando que confirme la entrada…"
                rows={3}
                className="rounded-md px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-full px-3 py-1.5 text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.instrument.trim()}
                className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={{ background: 'var(--series-1)', color: '#fff' }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
