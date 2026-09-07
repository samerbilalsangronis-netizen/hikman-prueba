import { useState } from 'react';
import { useTradingJournal } from '../../data/TradingJournalContext';
import type { Trade, TradeDirection } from '../../types';
import { cardStyle, formatDateTime, formatMoney, inputStyle, localInputValueToIso, nowLocalInputValue } from './tradingUi';

function OpenTradeForm() {
  const { accounts, openTrade, uploadTradeScreenshot } = useTradingJournal();
  const activeAccounts = accounts.filter((a) => a.status === 'activa');
  const [accountId, setAccountId] = useState('');
  const [instrument, setInstrument] = useState('');
  const [direction, setDirection] = useState<TradeDirection>('compra');
  const [size, setSize] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [commission, setCommission] = useState('0');
  const [entryTime, setEntryTime] = useState(nowLocalInputValue());
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const account = accountId || activeAccounts[0]?.id;
    if (!account || !instrument.trim() || !size || !entryPrice) return;
    setSaving(true);
    try {
      let screenshotUrl: string | undefined;
      if (file) screenshotUrl = await uploadTradeScreenshot(file);
      await openTrade({
        accountId: account,
        instrument: instrument.trim().toUpperCase(),
        direction,
        size: Number(size),
        entryPrice: Number(entryPrice),
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        commission: Number(commission || 0),
        entryTime: localInputValueToIso(entryTime),
        notes: notes.trim() || undefined,
        screenshotUrl,
      });
      setInstrument('');
      setSize('');
      setEntryPrice('');
      setStopLoss('');
      setTakeProfit('');
      setCommission('0');
      setEntryTime(nowLocalInputValue());
      setNotes('');
      setFile(null);
    } finally {
      setSaving(false);
    }
  }

  if (activeAccounts.length === 0) {
    return (
      <p className="rounded-xl p-4 text-sm" style={{ ...cardStyle, color: 'var(--text-muted)' }}>
        Creá una cuenta activa en la pestaña "Cuentas" antes de registrar un trade.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl p-4" style={cardStyle}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Registrar entrada
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select value={accountId || activeAccounts[0]?.id} onChange={(e) => setAccountId(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          placeholder="Instrumento (ej. EURUSD)"
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <select value={direction} onChange={(e) => setDirection(e.target.value as TradeDirection)} className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
          <option value="compra">Compra</option>
          <option value="venta">Venta</option>
        </select>
        <input value={size} onChange={(e) => setSize(e.target.value)} type="number" step="0.01" placeholder="Tamaño (lotes)" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
        <input
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          type="number"
          step="0.00001"
          placeholder="Precio de entrada"
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} type="number" step="0.00001" placeholder="Stop Loss (opcional)" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
        <input
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          type="number"
          step="0.00001"
          placeholder="Take Profit (opcional)"
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input value={commission} onChange={(e) => setCommission(e.target.value)} type="number" step="0.01" placeholder="Comisión/swap" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Hora de entrada (24h)
          </label>
          <input lang="es" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} type="datetime-local" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas / justificación del trade"
        rows={2}
        className="rounded-md px-3 py-2 text-sm"
        style={inputStyle}
      />
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" style={{ color: 'var(--text-muted)' }} />
        <button type="submit" disabled={saving} className="rounded-full px-4 py-1.5 text-sm font-medium text-white" style={{ background: 'var(--series-1)' }}>
          {saving ? 'Guardando…' : 'Abrir trade'}
        </button>
      </div>
    </form>
  );
}

function CloseTradeForm({ trade }: { trade: Trade }) {
  const { closeTrade, uploadTradeScreenshot } = useTradingJournal();
  const [open, setOpen] = useState(false);
  const [exitPrice, setExitPrice] = useState('');
  const [exitTime, setExitTime] = useState(nowLocalInputValue());
  const [pnl, setPnl] = useState('');
  const [notes, setNotes] = useState(trade.notes ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!exitPrice || !pnl) return;
    setSaving(true);
    try {
      let screenshotUrl: string | undefined;
      if (file) screenshotUrl = await uploadTradeScreenshot(file);
      await closeTrade(trade.id, {
        exitPrice: Number(exitPrice),
        exitTime: localInputValueToIso(exitTime),
        pnl: Number(pnl),
        notes: notes.trim() || undefined,
        screenshotUrl,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full px-3 py-1 text-xs font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        Cerrar trade
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} type="number" step="0.00001" placeholder="Precio de salida" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
        <input value={pnl} onChange={(e) => setPnl(e.target.value)} type="number" step="0.01" placeholder="P&L neto (USD)" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Hora de salida (24h)
          </label>
          <input lang="es" value={exitTime} onChange={(e) => setExitTime(e.target.value)} type="datetime-local" className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
        </div>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas de cierre" rows={2} className="rounded-md px-2 py-1 text-xs" style={inputStyle} />
      <div className="flex items-center gap-2">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" style={{ color: 'var(--text-muted)' }} />
        <button type="submit" disabled={saving} className="rounded-full px-3 py-1 text-xs font-medium text-white" style={{ background: 'var(--series-1)' }}>
          {saving ? 'Guardando…' : 'Confirmar cierre'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function RegisterTradeTab() {
  const { accounts, trades } = useTradingJournal();
  const openTrades = trades.filter((t) => t.status === 'abierto');
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  return (
    <div className="flex flex-col gap-4">
      <OpenTradeForm />
      <div className="flex flex-col gap-3 rounded-xl p-4" style={cardStyle}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Trades abiertos ({openTrades.length})
        </h3>
        {openTrades.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay posiciones abiertas.</p>}
        {openTrades.map((trade) => (
          <div key={trade.id} className="rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{trade.instrument}</strong> · {trade.direction} · {trade.size} lotes @ {trade.entryPrice}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {accountName(trade.accountId)} · abierto {formatDateTime(trade.entryTime)}
              </span>
            </div>
            {(trade.stopLoss || trade.takeProfit) && (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {trade.stopLoss ? `SL ${trade.stopLoss}` : ''} {trade.takeProfit ? `TP ${trade.takeProfit}` : ''} {trade.commission ? `· Comisión ${formatMoney(trade.commission)}` : ''}
              </p>
            )}
            <CloseTradeForm trade={trade} />
          </div>
        ))}
      </div>
    </div>
  );
}
