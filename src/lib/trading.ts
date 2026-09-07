import type { Trade, TradingAccount, TradingAccountRule, TradingRuleAlert } from '../types';

// Motor de alertas + curvas de la Bitácora de Trading. Todo se calcula en el
// cliente a partir de trading_accounts/trading_account_rules/trades — no se
// guarda nada calculado en Supabase, así una regla editada se refleja al
// instante sin re-sincronizar nada.

const RULE_LABELS: Record<TradingAccountRule['type'], string> = {
  max_daily_loss_pct: 'Pérdida máxima diaria',
  max_drawdown_pct: 'Drawdown máximo',
  profit_target_pct: 'Meta de profit',
  min_trading_days: 'Mínimo de días operando',
  custom: 'Regla de consistencia',
};

export function ruleLabel(type: TradingAccountRule['type']): string {
  return RULE_LABELS[type];
}

function closedTrades(trades: Trade[]): Trade[] {
  return trades.filter((t) => t.status === 'cerrado' && t.pnl !== undefined).sort((a, b) => (a.exitTime ?? '').localeCompare(b.exitTime ?? ''));
}

function severityFromUsedPct(usedPct: number): 'ok' | 'warning' | 'breached' {
  if (usedPct >= 100) return 'breached';
  if (usedPct >= 80) return 'warning';
  return 'ok';
}

function evaluateRule(rule: TradingAccountRule, account: TradingAccount, closed: Trade[], allTrades: Trade[]): TradingRuleAlert {
  if (rule.type === 'custom' || rule.value === undefined) {
    return { rule, severity: 'ok', message: rule.description || 'Regla de consistencia sin verificación automática.' };
  }

  if (rule.type === 'max_daily_loss_pct') {
    const today = new Date().toISOString().slice(0, 10);
    const todayPnl = closed.filter((t) => (t.exitTime ?? '').slice(0, 10) === today).reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const lossPct = todayPnl < 0 ? (-todayPnl / account.initialBalance) * 100 : 0;
    const usedPct = (lossPct / rule.value) * 100;
    const severity = severityFromUsedPct(usedPct);
    return {
      rule,
      severity,
      usedPct,
      message:
        lossPct === 0
          ? 'Sin pérdidas cerradas hoy.'
          : `Pérdida de hoy: ${lossPct.toFixed(2)}% de ${rule.value}% permitido (${usedPct.toFixed(0)}% consumido).`,
    };
  }

  if (rule.type === 'max_drawdown_pct') {
    let equity = account.initialBalance;
    let peak = account.initialBalance;
    let maxDrawdownPct = 0;
    for (const t of closed) {
      equity += t.pnl ?? 0;
      peak = Math.max(peak, equity);
      const drawdownPct = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      maxDrawdownPct = Math.max(maxDrawdownPct, drawdownPct);
    }
    const usedPct = (maxDrawdownPct / rule.value) * 100;
    const severity = severityFromUsedPct(usedPct);
    return {
      rule,
      severity,
      usedPct,
      message: `Drawdown máximo alcanzado: ${maxDrawdownPct.toFixed(2)}% de ${rule.value}% permitido (${usedPct.toFixed(0)}% consumido).`,
    };
  }

  if (rule.type === 'profit_target_pct') {
    const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const gainPct = (totalPnl / account.initialBalance) * 100;
    const usedPct = (gainPct / rule.value) * 100;
    const severity = usedPct >= 100 ? 'breached' : usedPct >= 80 ? 'warning' : 'ok';
    return {
      rule,
      severity,
      usedPct,
      message:
        usedPct >= 100
          ? `¡Meta alcanzada! Ganancia de ${gainPct.toFixed(2)}% sobre el objetivo de ${rule.value}%.`
          : `Ganancia acumulada: ${gainPct.toFixed(2)}% de ${rule.value}% objetivo (${Math.max(usedPct, 0).toFixed(0)}% completado).`,
    };
  }

  // min_trading_days: cuenta días calendario distintos con al menos un trade
  // (abierto o cerrado) — sin "breached" porque es un mínimo acumulativo sin
  // fecha límite definida, no algo que se pueda incumplir de golpe.
  const daysTraded = new Set(allTrades.map((t) => t.entryTime.slice(0, 10))).size;
  const usedPct = (daysTraded / rule.value) * 100;
  return {
    rule,
    severity: usedPct >= 100 ? 'ok' : 'warning',
    usedPct,
    message:
      usedPct >= 100
        ? `Cumplido: ${daysTraded} días operados de ${rule.value} requeridos.`
        : `${daysTraded} de ${rule.value} días operados — faltan ${rule.value - daysTraded}.`,
  };
}

export function computeAccountAlerts(account: TradingAccount, trades: Trade[]): TradingRuleAlert[] {
  const accountTrades = trades.filter((t) => t.accountId === account.id);
  const closed = closedTrades(accountTrades);
  return account.rules.filter((r) => r.enabled).map((rule) => evaluateRule(rule, account, closed, accountTrades));
}

export interface EquityPoint {
  date: string; // ISO datetime del cierre del trade
  equity: number;
  accountId: string;
  accountName: string;
  tradeId: string;
  pnl: number;
}

/** Curva de equity de UNA cuenta (para el selector de cuenta individual del dashboard). */
export function accountEquityCurve(account: TradingAccount, trades: Trade[]): EquityPoint[] {
  const closed = closedTrades(trades.filter((t) => t.accountId === account.id));
  let equity = account.initialBalance;
  return closed.map((t) => {
    equity += t.pnl ?? 0;
    return { date: t.exitTime as string, equity, accountId: account.id, accountName: account.name, tradeId: t.id, pnl: t.pnl ?? 0 };
  });
}

/** Curva combinada de TODAS las cuentas en seguimiento — cada punto marca en
 * qué cuenta ocurrió ese trade, para poder estudiar el aporte de cada una al
 * resultado general. */
export function combinedEquityCurve(accounts: TradingAccount[], trades: Trade[]): EquityPoint[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const initialTotal = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
  const allClosed = closedTrades(trades.filter((t) => byId.has(t.accountId)));
  let equity = initialTotal;
  return allClosed.map((t) => {
    equity += t.pnl ?? 0;
    const account = byId.get(t.accountId)!;
    return { date: t.exitTime as string, equity, accountId: account.id, accountName: account.name, tradeId: t.id, pnl: t.pnl ?? 0 };
  });
}

export interface MonthlyGainPoint {
  month: string; // "2026-09"
  label: string; // "Sep 2026"
  gainPct: number;
}

const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** % de ganancia mensual sobre el balance inicial combinado de las cuentas
 * pasadas — mismo criterio para "una cuenta" (pasar un array de una sola) o
 * "todas las cuentas" (dashboard general). */
export function monthlyGain(accounts: TradingAccount[], trades: Trade[]): MonthlyGainPoint[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const initialTotal = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
  if (initialTotal <= 0) return [];
  const byMonth = new Map<string, number>();
  for (const t of closedTrades(trades.filter((t) => byId.has(t.accountId)))) {
    const month = (t.exitTime as string).slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + (t.pnl ?? 0));
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => {
      const [y, m] = month.split('-');
      return { month, label: `${MONTH_LABELS_ES[Number(m) - 1]} ${y}`, gainPct: (pnl / initialTotal) * 100 };
    });
}
