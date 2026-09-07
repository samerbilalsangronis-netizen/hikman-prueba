import { useState } from 'react';
import { useTradingJournal } from '../../data/TradingJournalContext';
import { computeAccountAlerts, ruleLabel } from '../../lib/trading';
import type { TradingAccount, TradingAccountType, TradingRuleType } from '../../types';
import { cardStyle, formatMoney, inputStyle, severityColor } from './tradingUi';

const RULE_TYPES: TradingRuleType[] = ['max_daily_loss_pct', 'max_drawdown_pct', 'profit_target_pct', 'min_trading_days', 'custom'];

function NewAccountForm() {
  const { addAccount } = useTradingJournal();
  const [name, setName] = useState('');
  const [type, setType] = useState<TradingAccountType>('real');
  const [initialBalance, setInitialBalance] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !initialBalance) return;
    await addAccount({ name: name.trim(), type, initialBalance: Number(initialBalance) });
    setName('');
    setInitialBalance('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl p-4" style={cardStyle}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Nueva cuenta
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la cuenta"
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <select value={type} onChange={(e) => setType(e.target.value as TradingAccountType)} className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
          <option value="real">Real</option>
          <option value="fondeo">Fondeo</option>
        </select>
        <input
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          type="number"
          step="0.01"
          placeholder="Balance inicial (USD)"
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
      </div>
      <button
        type="submit"
        className="self-start rounded-full px-4 py-1.5 text-sm font-medium text-white"
        style={{ background: 'var(--series-1)' }}
      >
        Crear cuenta
      </button>
    </form>
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

function AccountCard({ account, trades }: { account: TradingAccount; trades: ReturnType<typeof useTradingJournal>['trades'] }) {
  const { updateAccount, deleteAccount } = useTradingJournal();
  const alerts = computeAccountAlerts(account, trades);
  const closedPnl = trades.filter((t) => t.accountId === account.id && t.status === 'cerrado').reduce((s, t) => s + (t.pnl ?? 0), 0);
  const equity = account.initialBalance + closedPnl;

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={cardStyle}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {account.name}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            >
              {account.type}
            </span>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Balance inicial {formatMoney(account.initialBalance)} · Equity actual{' '}
            <strong style={{ color: closedPnl >= 0 ? 'var(--status-good)' : 'var(--status-critical)' }}>{formatMoney(equity)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={account.status}
            onChange={(e) => updateAccount(account.id, { status: e.target.value as TradingAccount['status'] })}
            className="rounded-md px-2 py-1 text-xs"
            style={inputStyle}
          >
            <option value="activa">Activa</option>
            <option value="inactiva">Inactiva</option>
          </select>
          <button onClick={() => deleteAccount(account.id)} className="text-xs" style={{ color: 'var(--status-critical)' }}>
            Eliminar
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {alerts.map((alert) => (
            <div key={alert.rule.id} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs" style={{ background: 'var(--surface-2)' }}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: severityColor(alert.severity) }} />
              <span style={{ color: 'var(--text-primary)' }}>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <RuleRow account={account} />
      </div>
      <AddRuleForm account={account} />
    </div>
  );
}

export function AccountsTab() {
  const { accounts, trades, loading } = useTradingJournal();

  return (
    <div className="flex flex-col gap-4">
      <NewAccountForm />
      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando cuentas…</p>}
      {!loading && accounts.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Todavía no hay cuentas cargadas.</p>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} trades={trades} />
        ))}
      </div>
    </div>
  );
}
