import { useEffect, useState } from 'react';
import { useTradingJournal } from '../../data/TradingJournalContext';
import { computeAccountAlerts, ruleLabel } from '../../lib/trading';
import type { TradingAccount, TradingAccountType, TradingRuleAlert, TradingRuleType } from '../../types';
import { cardStyle, formatMoney, inputStyle, severityColor } from './tradingUi';

const RULE_TYPES: TradingRuleType[] = ['max_daily_loss_pct', 'max_drawdown_pct', 'profit_target_pct', 'min_trading_days', 'custom'];

// Modal simple (mismo patrón que HistoryModal.tsx: backdrop + Escape para
// cerrar) — "Nueva cuenta" pasó de formulario siempre visible a este modal
// a pedido del usuario (2-oct-2026), para no ocupar espacio permanente
// arriba de la grilla de cuentas.
function NewAccountModal({ onClose }: { onClose: () => void }) {
  const { addAccount } = useTradingJournal();
  const [name, setName] = useState('');
  const [type, setType] = useState<TradingAccountType>('real');
  const [initialBalance, setInitialBalance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !initialBalance) return;
    setSaving(true);
    await addAccount({ name: name.trim(), type, initialBalance: Number(initialBalance) });
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex overflow-y-auto p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Nueva cuenta"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="m-auto flex w-full max-w-md flex-col gap-3 rounded-xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Nueva cuenta
          </h3>
          <button type="button" onClick={onClose} className="shrink-0 rounded-md px-2 py-1 text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            ✕ Cerrar
          </button>
        </div>
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Nombre de la cuenta
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. 50K Fase 1" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as TradingAccountType)} className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
            <option value="real">Real</option>
            <option value="fondeo">Fondeo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Balance inicial (USD)
          <input value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} type="number" step="0.01" placeholder="50000" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-1 self-start rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--series-1)' }}
        >
          {saving ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}

function RuleRow({ account }: { account: TradingAccount }) {
  const { updateRule, deleteRule } = useTradingJournal();
  return (
    <>
      {account.rules.map((rule) => (
        <div key={rule.id} className="flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 text-xs" style={{ background: 'var(--surface-2)' }}>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {ruleLabel(rule.type)}
          </span>
          {rule.type !== 'custom' && <span style={{ color: 'var(--text-muted)' }}>{rule.value}{rule.type === 'min_trading_days' ? ' días' : '%'}</span>}
          {rule.description && <span style={{ color: 'var(--text-muted)' }}>— {rule.description}</span>}
          <button onClick={() => updateRule(account.id, rule.id, { enabled: !rule.enabled })} className="underline" style={{ color: 'var(--text-muted)' }}>
            {rule.enabled ? 'activa' : 'desactivada'}
          </button>
          <button onClick={() => deleteRule(account.id, rule.id)} className="ml-auto" style={{ color: 'var(--status-critical)' }}>
            Quitar
          </button>
        </div>
      ))}
    </>
  );
}

function AddRuleForm({ account }: { account: TradingAccount }) {
  const { addRule } = useTradingJournal();
  const [type, setType] = useState<TradingRuleType>('max_daily_loss_pct');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === 'custom' && !description.trim()) return;
    if (type !== 'custom' && !value) return;
    await addRule(account.id, { type, value: type === 'custom' ? undefined : Number(value), description: description.trim() || undefined, enabled: true });
    setValue('');
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select value={type} onChange={(e) => setType(e.target.value as TradingRuleType)} className="rounded-md px-2 py-1 text-xs" style={inputStyle}>
        {RULE_TYPES.map((t) => (
          <option key={t} value={t}>
            {ruleLabel(t)}
          </option>
        ))}
      </select>
      {type !== 'custom' && (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="number"
          step="0.1"
          placeholder={type === 'min_trading_days' ? 'días' : '%'}
          className="w-24 rounded-md px-2 py-1 text-xs"
          style={inputStyle}
        />
      )}
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={type === 'custom' ? 'Describe la regla…' : 'Nota opcional'}
        className="min-w-[160px] flex-1 rounded-md px-2 py-1 text-xs"
        style={inputStyle}
      />
      <button type="submit" className="rounded-full px-3 py-1 text-xs font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        + Agregar regla
      </button>
    </form>
  );
}

// Barra de progreso de color (verde/amarillo/rojo según severidad) para
// reglas con un % consumido medible (drawdown, pérdida diaria, meta de
// profit) — pedido explícito del usuario en vez de solo texto plano.
function RuleProgressBar({ alert }: { alert: TradingRuleAlert }) {
  const pct = Math.max(0, Math.min(100, alert.usedPct ?? 0));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {ruleLabel(alert.rule.type)}
        </span>
        <span style={{ color: severityColor(alert.severity) }}>{alert.usedPct !== undefined ? `${Math.round(alert.usedPct)}%` : ''}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: severityColor(alert.severity) }} />
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {alert.message}
      </p>
    </div>
  );
}

function AccountCard({ account, trades }: { account: TradingAccount; trades: ReturnType<typeof useTradingJournal>['trades'] }) {
  const { updateAccount, deleteAccount } = useTradingJournal();
  const alerts = computeAccountAlerts(account, trades);
  const measurable = alerts.filter((a) => a.usedPct !== undefined);
  const unmeasurable = alerts.filter((a) => a.usedPct === undefined);
  const closedPnl = trades.filter((t) => t.accountId === account.id && t.status === 'cerrado').reduce((s, t) => s + (t.pnl ?? 0), 0);
  const equity = account.initialBalance + closedPnl;
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4" style={cardStyle}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {account.name}
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            {account.type === 'real' ? 'Real' : 'Fondeo'}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: 'color-mix(in srgb, var(--status-good) 18%, transparent)', color: 'var(--status-good)' }}
          >
            Activa
          </span>
        </div>
        <button onClick={() => updateAccount(account.id, { status: 'inactiva' })} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Marcar inactiva
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: closedPnl >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>
            {formatMoney(equity)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Equity Actual · Balance inicial {formatMoney(account.initialBalance)}
          </p>
        </div>
        <button onClick={() => deleteAccount(account.id)} className="text-xs" style={{ color: 'var(--status-critical)' }}>
          Eliminar
        </button>
      </div>

      {measurable.length > 0 && (
        <div className="flex flex-col gap-3">
          {measurable.map((alert) => (
            <RuleProgressBar key={alert.rule.id} alert={alert} />
          ))}
        </div>
      )}

      {unmeasurable.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {unmeasurable.map((alert) => (
            <div key={alert.rule.id} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs" style={{ background: 'var(--surface-2)' }}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: severityColor(alert.severity) }} />
              <span style={{ color: 'var(--text-primary)' }}>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowRules((v) => !v)} className="self-start text-xs underline" style={{ color: 'var(--text-muted)' }}>
        {showRules ? 'Ocultar reglas' : `Gestionar reglas (${account.rules.length})`}
      </button>
      {showRules && (
        <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <RuleRow account={account} />
          <AddRuleForm account={account} />
        </div>
      )}
    </div>
  );
}

// Cuentas inactivas se sacan de la grilla principal y quedan acá, en una
// "bóveda" colapsada por defecto — pedido del usuario para no mezclar
// cuentas en uso con cuentas viejas/cerradas.
function InactiveVault({ accounts, trades }: { accounts: TradingAccount[]; trades: ReturnType<typeof useTradingJournal>['trades'] }) {
  const { updateAccount, deleteAccount } = useTradingJournal();
  const [open, setOpen] = useState(false);
  if (accounts.length === 0) return null;

  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        🗄️ Bóveda de cuentas inactivas ({accounts.length})
        <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {accounts.map((account) => {
            const closedPnl = trades.filter((t) => t.accountId === account.id && t.status === 'cerrado').reduce((s, t) => s + (t.pnl ?? 0), 0);
            const equity = account.initialBalance + closedPnl;
            return (
              <div key={account.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm" style={{ background: 'var(--surface-2)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-primary)' }}>{account.name}</span>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {account.type === 'real' ? 'Real' : 'Fondeo'}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {formatMoney(equity)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateAccount(account.id, { status: 'activa' })} className="text-xs underline" style={{ color: 'var(--status-good)' }}>
                    Reactivar
                  </button>
                  <button onClick={() => deleteAccount(account.id)} className="text-xs underline" style={{ color: 'var(--status-critical)' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AccountsTab() {
  const { accounts, trades, loading } = useTradingJournal();
  const [showModal, setShowModal] = useState(false);
  const activeAccounts = accounts.filter((a) => a.status === 'activa');
  const inactiveAccounts = accounts.filter((a) => a.status === 'inactiva');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Gestión de Cuentas
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-white"
          style={{ background: 'var(--series-1)' }}
        >
          + Nueva Cuenta
        </button>
      </div>
      {showModal && <NewAccountModal onClose={() => setShowModal(false)} />}

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando cuentas…</p>}
      {!loading && accounts.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Todavía no hay cuentas cargadas.</p>
      )}
      {!loading && accounts.length > 0 && activeAccounts.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay cuentas activas — reactivá una desde la bóveda de abajo.</p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {activeAccounts.map((account) => (
          <AccountCard key={account.id} account={account} trades={trades} />
        ))}
      </div>

      <InactiveVault accounts={inactiveAccounts} trades={trades} />
    </div>
  );
}
