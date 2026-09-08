import { useMemo, useState } from 'react';
import { useTradingJournal } from '../../data/TradingJournalContext';
import type { Trade } from '../../types';
import { cardStyle, formatDateTime, formatMoney, inputStyle, isoToLocalInputValue, localInputValueToIso } from './tradingUi';

function EditTradeForm({ trade, onDone }: { trade: Trade; onDone: () => void }) {
  const { updateTrade } = useTradingJournal();
  const [entryPrice, setEntryPrice] = useState(trade.entryPrice !== undefined ? String(trade.entryPrice) : '');
  const [exitPrice, setExitPrice] = useState(trade.exitPrice !== undefined ? String(trade.exitPrice) : '');
  const [entryTime, setEntryTime] = useState(isoToLocalInputValue(trade.entryTime));
  const [exitTime, setExitTime] = useState(trade.exitTime ? isoToLocalInputValue(trade.exitTime) : '');
  const [pnl, setPnl] = useState(trade.pnl !== undefined ? String(trade.pnl) : '');
  const [notes, setNotes] = useState(trade.notes ?? '');
  const [chartUrl, setChartUrl] = useState(trade.chartUrl ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateTrade(trade.id, {
      entryPrice: entryPrice ? Number(entryPrice) : undefined,
      exitPrice: exitPrice ? Number(exitPrice) : undefined,
      entryTime: localInputValueToIso(entryTime),
      exitTime: exitTime ? localInputValueToIso(exitTime) : undefined,
      pnl: pnl ? Number(pnl) : undefined,
      notes: notes.trim() || undefined,
      chartUrl: chartUrl.trim() || undefined,
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} type="number" step="0.00001" placeholder="Entrada" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
        <input value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} type="number" step="0.00001" placeholder="Salida" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
        <input value={pnl} onChange={(e) => setPnl(e.target.value)} type="number" step="0.01" placeholder="P&L" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
        <span />
        <input lang="es" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} type="datetime-local" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
        <input lang="es" value={exitTime} onChange={(e) => setExitTime(e.target.value)} type="datetime-local" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
      <input
        value={chartUrl}
        onChange={(e) => setChartUrl(e.target.value)}
        placeholder="Link del gráfico (ej. TradingView)"
        className="rounded-md px-2 py-1 text-xs"
        style={inputStyle}
      />
      <div className="flex items-center gap-2">
        <button type="submit" className="rounded-full px-3 py-1 text-xs font-medium text-white" style={{ background: 'var(--series-1)' }}>
          Guardar
        </button>
        <button type="button" onClick={onDone} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function HistoryTab() {
  const { accounts, trades, deleteTrade } = useTradingJournal();
  const [accountId, setAccountId] = useState('todas');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return trades.filter((t) => accountId === 'todas' || t.accountId === accountId).sort((a, b) => b.entryTime.localeCompare(a.entryTime));
  }, [trades, accountId]);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Cuenta
        </label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
          <option value="todas">Todas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay trades cargados todavía.</p>}
        {filtered.map((trade) => (
          <div key={trade.id} className="rounded-xl p-3" style={cardStyle}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{trade.instrument}</strong> · {trade.direction} · {trade.size} lotes · {accountName(trade.accountId)}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                style={{ background: 'var(--surface-2)', color: trade.status === 'abierto' ? 'var(--status-warning)' : 'var(--text-muted)' }}
              >
                {trade.status}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Entrada {formatDateTime(trade.entryTime)}
              {trade.entryPrice !== undefined ? ` @ ${trade.entryPrice}` : ''}
              {trade.exitTime ? ` · Salida ${formatDateTime(trade.exitTime)}${trade.exitPrice !== undefined ? ` @ ${trade.exitPrice}` : ''}` : ''}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
              {trade.pnl !== undefined && (
                <span style={{ color: trade.pnl >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>P&L {formatMoney(trade.pnl)}</span>
              )}
              {trade.notes && <span style={{ color: 'var(--text-muted)' }}>{trade.notes}</span>}
              {trade.screenshotUrl && (
                <a href={trade.screenshotUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--series-1)' }}>
                  Ver captura
                </a>
              )}
              {trade.chartUrl && (
                <a href={trade.chartUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--series-1)' }}>
                  Ver gráfico
                </a>
              )}
              <button onClick={() => setEditingId(editingId === trade.id ? null : trade.id)} className="ml-auto" style={{ color: 'var(--text-secondary)' }}>
                Editar
              </button>
              <button onClick={() => deleteTrade(trade.id)} style={{ color: 'var(--status-critical)' }}>
                Eliminar
              </button>
            </div>
            {editingId === trade.id && (
              <div className="mt-2">
                <EditTradeForm trade={trade} onDone={() => setEditingId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
