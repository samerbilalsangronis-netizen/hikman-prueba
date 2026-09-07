import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTradingJournal } from '../../data/TradingJournalContext';
import { accountEquityCurve, combinedEquityCurve, monthlyGain, type EquityPoint } from '../../lib/trading';
import { cardStyle, formatDateTime, formatMoney, formatPct, inputStyle } from './tradingUi';

const PALETTE = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'];

function useAccountColors(accountIds: string[]) {
  return useMemo(() => {
    const map = new Map<string, string>();
    accountIds.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]));
    return map;
  }, [accountIds]);
}

function EquityTooltip({ active, payload, colorByAccount }: { active?: boolean; payload?: { payload: EquityPoint }[]; colorByAccount?: Map<string, string> }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md px-2.5 py-1.5 text-xs shadow-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <div style={{ color: 'var(--text-muted)' }}>{formatDateTime(p.date)}</div>
      <div className="font-semibold">{formatMoney(p.equity)}</div>
      <div style={{ color: colorByAccount?.get(p.accountId) ?? 'var(--text-muted)' }}>
        {p.accountName} · {p.pnl >= 0 ? '+' : ''}
        {formatMoney(p.pnl)}
      </div>
    </div>
  );
}

function GainTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; gainPct: number } }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md px-2.5 py-1.5 text-xs shadow-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <div style={{ color: 'var(--text-muted)' }}>{p.label}</div>
      <div className="font-semibold">{formatPct(p.gainPct)}</div>
    </div>
  );
}

function EquityChart({ data, colorByAccount, markByAccount }: { data: EquityPoint[]; colorByAccount?: Map<string, string>; markByAccount?: boolean }) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Todavía no hay trades cerrados para graficar.
      </p>
    );
  }
  return (
    <div style={{ height: 280 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis dataKey="date" tickFormatter={(v) => formatDateTime(v).split(',')[0]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} minTickGap={40} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => formatMoney(v)} />
          <Tooltip content={<EquityTooltip colorByAccount={colorByAccount} />} cursor={{ stroke: 'var(--baseline)' }} />
          <Line
            type="linear"
            dataKey="equity"
            stroke="var(--series-1)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={
              markByAccount && colorByAccount
                ? (props: { cx?: number; cy?: number; payload?: EquityPoint }) => {
                    const { cx, cy, payload } = props;
                    if (cx === undefined || cy === undefined || !payload) return <g key={payload?.tradeId} />;
                    return <circle key={payload.tradeId} cx={cx} cy={cy} r={3.5} fill={colorByAccount.get(payload.accountId) ?? 'var(--series-1)'} stroke="none" />;
                  }
                : { r: 2.5, fill: 'var(--series-1)', strokeWidth: 0 }
            }
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function JournalDashboardTab() {
  const { accounts, trades } = useTradingJournal();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const colorByAccount = useAccountColors(accounts.map((a) => a.id));

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];
  const individualCurve = selectedAccount ? accountEquityCurve(selectedAccount, trades) : [];
  const combinedCurve = combinedEquityCurve(accounts, trades);
  const combinedMonthlyGain = monthlyGain(accounts, trades);

  if (accounts.length === 0) {
    return <p className="rounded-xl p-4 text-sm" style={{ ...cardStyle, color: 'var(--text-muted)' }}>Creá una cuenta para ver el dashboard.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-4" style={cardStyle}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Curva de equity por cuenta
          </h3>
          <select value={selectedAccount?.id} onChange={(e) => setSelectedAccountId(e.target.value)} className="rounded-md px-3 py-1.5 text-sm" style={inputStyle}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <EquityChart data={individualCurve} />
      </div>

      <div className="rounded-xl p-4" style={cardStyle}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Curva general (todas las cuentas)
        </h3>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Cada punto está coloreado según la cuenta donde ocurrió ese trade.
        </p>
        <EquityChart data={combinedCurve} colorByAccount={colorByAccount} markByAccount />
        <div className="mt-3 flex flex-wrap gap-3">
          {accounts.map((a) => (
            <span key={a.id} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorByAccount.get(a.id) }} />
              {a.name}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={cardStyle}>
        <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Ganancia mensual (todas las cuentas)
        </h3>
        {combinedMonthlyGain.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sin trades cerrados todavía.
          </p>
        ) : (
          <div style={{ height: 240 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedMonthlyGain} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--gridline)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--baseline)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<GainTooltip />} cursor={{ fill: 'var(--gridline)' }} />
                <Bar dataKey="gainPct" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                  {combinedMonthlyGain.map((entry) => (
                    <Cell key={entry.month} fill={entry.gainPct >= 0 ? 'var(--status-good)' : 'var(--status-critical)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
