import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabaseClient';
import { computeAccountAlerts, ruleLabel } from '../lib/trading';
import type { Trade, TradingAccount, TradingAccountRule } from '../types';

// Bitácora de Trading (migrado del sistema anterior en Excel/Apps Script,
// sesión 7-sep-2026) — mismo patrón que MacroDataContext.tsx: Supabase como
// fuente de verdad, con localStorage como respaldo cuando Supabase no está
// configurado. Provider separado (no se metió dentro de MacroDataContext)
// porque es un dominio de datos completamente distinto (cuentas/trades, no
// indicadores macro) y ese archivo ya es enorme.

const ACCOUNTS_KEY = 'trading-journal:accounts:v1';
const TRADES_KEY = 'trading-journal:trades:v1';
const NOTIFIED_KEY = 'trading-journal:notified:v1'; // dedupe de emails de alerta

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms) esperando ${label}`)), ms))]);
}

function loadLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function loadNotified(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

interface TradingJournalValue {
  accounts: TradingAccount[];
  trades: Trade[];
  loading: boolean;
  syncError: boolean;
  addAccount: (input: { name: string; type: TradingAccount['type']; initialBalance: number }) => Promise<void>;
  updateAccount: (id: string, patch: Partial<Pick<TradingAccount, 'name' | 'type' | 'status' | 'initialBalance'>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addRule: (accountId: string, rule: Omit<TradingAccountRule, 'id'>) => Promise<void>;
  updateRule: (accountId: string, ruleId: string, patch: Partial<Omit<TradingAccountRule, 'id'>>) => Promise<void>;
  deleteRule: (accountId: string, ruleId: string) => Promise<void>;
  openTrade: (
    input: Omit<Trade, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'exitPrice' | 'exitTime' | 'pnl'>,
  ) => Promise<Trade>;
  closeTrade: (tradeId: string, patch: { exitPrice: number; exitTime: string; pnl: number; notes?: string; screenshotUrl?: string }) => Promise<void>;
  updateTrade: (tradeId: string, patch: Partial<Omit<Trade, 'id' | 'accountId' | 'createdAt'>>) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  uploadTradeScreenshot: (file: File) => Promise<string>;
}

const TradingJournalContext = createContext<TradingJournalValue | null>(null);

export function TradingJournalProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<TradingAccount[]>(() => loadLocal(ACCOUNTS_KEY));
  const [trades, setTrades] = useState<Trade[]>(() => loadLocal(TRADES_KEY));
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabaseEnabled || !supabase) {
        setLoading(false);
        return;
      }
      try {
        const [accountsRes, rulesRes, tradesRes] = await withTimeout(
          Promise.all([
            supabase.from('trading_accounts').select('id, name, type, status, initial_balance, created_at'),
            supabase.from('trading_account_rules').select('id, account_id, type, value, description, enabled'),
            supabase.from('trades').select('*').order('entry_time', { ascending: true }),
          ]),
          15000,
          'Bitácora de Trading',
        );
        if (cancelled) return;
        if (accountsRes.error || rulesRes.error || tradesRes.error) throw accountsRes.error || rulesRes.error || tradesRes.error;

        const rulesByAccount = new Map<string, TradingAccountRule[]>();
        for (const r of rulesRes.data ?? []) {
          const rule: TradingAccountRule = { id: r.id, type: r.type, value: r.value ?? undefined, description: r.description ?? undefined, enabled: r.enabled };
          const list = rulesByAccount.get(r.account_id) ?? [];
          list.push(rule);
          rulesByAccount.set(r.account_id, list);
        }
        const loadedAccounts: TradingAccount[] = (accountsRes.data ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status,
          initialBalance: a.initial_balance,
          rules: rulesByAccount.get(a.id) ?? [],
          createdAt: a.created_at,
        }));
        const loadedTrades: Trade[] = (tradesRes.data ?? []).map((t) => ({
          id: t.id,
          accountId: t.account_id,
          instrument: t.instrument,
          direction: t.direction,
          size: t.size,
          entryPrice: t.entry_price,
          exitPrice: t.exit_price ?? undefined,
          stopLoss: t.stop_loss ?? undefined,
          takeProfit: t.take_profit ?? undefined,
          commission: t.commission,
          entryTime: t.entry_time,
          exitTime: t.exit_time ?? undefined,
          status: t.status,
          pnl: t.pnl ?? undefined,
          notes: t.notes ?? undefined,
          screenshotUrl: t.screenshot_url ?? undefined,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        setAccounts(loadedAccounts);
        setTrades(loadedTrades);
        setSyncError(false);
      } catch (err) {
        console.error('No se pudo cargar la Bitácora de Trading desde Supabase', err);
        setSyncError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addAccount = useCallback(async (input: { name: string; type: TradingAccount['type']; initialBalance: number }) => {
    const next: TradingAccount = { id: crypto.randomUUID(), status: 'activa', rules: [], createdAt: new Date().toISOString(), ...input };
    setAccounts((prev) => {
      const updated = [...prev, next];
      if (!supabaseEnabled) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('trading_accounts').insert({ id: next.id, name: next.name, type: next.type, status: next.status, initial_balance: next.initialBalance });
    } catch (err) {
      console.error('No se pudo guardar la cuenta en Supabase', err);
    }
  }, []);

  const updateAccount = useCallback(async (id: string, patch: Partial<Pick<TradingAccount, 'name' | 'type' | 'status' | 'initialBalance'>>) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      if (!supabaseEnabled) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.type !== undefined) row.type = patch.type;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.initialBalance !== undefined) row.initial_balance = patch.initialBalance;
      await supabase.from('trading_accounts').update(row).eq('id', id);
    } catch (err) {
      console.error('No se pudo actualizar la cuenta en Supabase', err);
    }
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      if (!supabaseEnabled) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
    setTrades((prev) => {
      const updated = prev.filter((t) => t.accountId !== id);
      if (!supabaseEnabled) localStorage.setItem(TRADES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('trading_accounts').delete().eq('id', id); // cascade borra reglas y trades
    } catch (err) {
      console.error('No se pudo borrar la cuenta en Supabase', err);
    }
  }, []);

  const addRule = useCallback(async (accountId: string, rule: Omit<TradingAccountRule, 'id'>) => {
    const next: TradingAccountRule = { ...rule, id: crypto.randomUUID() };
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === accountId ? { ...a, rules: [...a.rules, next] } : a));
      if (!supabaseEnabled) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase
        .from('trading_account_rules')
        .insert({ id: next.id, account_id: accountId, type: next.type, value: next.value ?? null, description: next.description ?? null, enabled: next.enabled });
    } catch (err) {
      console.error('No se pudo guardar la regla en Supabase', err);
    }
  }, []);

  const updateRule = useCallback(async (accountId: string, ruleId: string, patch: Partial<Omit<TradingAccountRule, 'id'>>) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === accountId ? { ...a, rules: a.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)) } : a));
      if (!supabaseEnabled) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      const row: Record<string, unknown> = {};
      if (patch.type !== undefined) row.type = patch.type;
      if (patch.value !== undefined) row.value = patch.value;
      if (patch.description !== undefined) row.description = patch.description;
      if (patch.enabled !== undefined) row.enabled = patch.enabled;
      await supabase.from('trading_account_rules').update(row).eq('id', ruleId);
    } catch (err) {
      console.error('No se pudo actualizar la regla en Supabase', err);
    }
  }, []);

  const deleteRule = useCallback(async (accountId: string, ruleId: string) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === accountId ? { ...a, rules: a.rules.filter((r) => r.id !== ruleId) } : a));
      if (!supabaseEnabled) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('trading_account_rules').delete().eq('id', ruleId);
    } catch (err) {
      console.error('No se pudo borrar la regla en Supabase', err);
    }
  }, []);

  const openTrade = useCallback(
    async (input: Omit<Trade, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'exitPrice' | 'exitTime' | 'pnl'>) => {
      const now = new Date().toISOString();
      const next: Trade = { ...input, id: crypto.randomUUID(), status: 'abierto', createdAt: now, updatedAt: now };
      setTrades((prev) => {
        const updated = [...prev, next];
        if (!supabaseEnabled) localStorage.setItem(TRADES_KEY, JSON.stringify(updated));
        return updated;
      });
      if (supabaseEnabled && supabase) {
        try {
          await supabase.from('trades').insert({
            id: next.id,
            account_id: next.accountId,
            instrument: next.instrument,
            direction: next.direction,
            size: next.size,
            entry_price: next.entryPrice,
            stop_loss: next.stopLoss ?? null,
            take_profit: next.takeProfit ?? null,
            commission: next.commission,
            entry_time: next.entryTime,
            status: 'abierto',
            notes: next.notes ?? null,
            screenshot_url: next.screenshotUrl ?? null,
          });
        } catch (err) {
          console.error('No se pudo registrar el trade en Supabase', err);
        }
      }
      return next;
    },
    [],
  );

  const closeTrade = useCallback(
    async (tradeId: string, patch: { exitPrice: number; exitTime: string; pnl: number; notes?: string; screenshotUrl?: string }) => {
      const now = new Date().toISOString();
      setTrades((prev) => {
        const updated = prev.map((t) =>
          t.id === tradeId
            ? { ...t, status: 'cerrado' as const, exitPrice: patch.exitPrice, exitTime: patch.exitTime, pnl: patch.pnl, notes: patch.notes ?? t.notes, screenshotUrl: patch.screenshotUrl ?? t.screenshotUrl, updatedAt: now }
            : t,
        );
        if (!supabaseEnabled) localStorage.setItem(TRADES_KEY, JSON.stringify(updated));
        return updated;
      });
      if (!supabaseEnabled || !supabase) return;
      try {
        const row: Record<string, unknown> = { status: 'cerrado', exit_price: patch.exitPrice, exit_time: patch.exitTime, pnl: patch.pnl, updated_at: now };
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.screenshotUrl !== undefined) row.screenshot_url = patch.screenshotUrl;
        await supabase.from('trades').update(row).eq('id', tradeId);
      } catch (err) {
        console.error('No se pudo cerrar el trade en Supabase', err);
      }
    },
    [],
  );

  const updateTrade = useCallback(async (tradeId: string, patch: Partial<Omit<Trade, 'id' | 'accountId' | 'createdAt'>>) => {
    const now = new Date().toISOString();
    setTrades((prev) => {
      const updated = prev.map((t) => (t.id === tradeId ? { ...t, ...patch, updatedAt: now } : t));
      if (!supabaseEnabled) localStorage.setItem(TRADES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      const row: Record<string, unknown> = { updated_at: now };
      if (patch.instrument !== undefined) row.instrument = patch.instrument;
      if (patch.direction !== undefined) row.direction = patch.direction;
      if (patch.size !== undefined) row.size = patch.size;
      if (patch.entryPrice !== undefined) row.entry_price = patch.entryPrice;
      if (patch.exitPrice !== undefined) row.exit_price = patch.exitPrice;
      if (patch.stopLoss !== undefined) row.stop_loss = patch.stopLoss;
      if (patch.takeProfit !== undefined) row.take_profit = patch.takeProfit;
      if (patch.commission !== undefined) row.commission = patch.commission;
      if (patch.entryTime !== undefined) row.entry_time = patch.entryTime;
      if (patch.exitTime !== undefined) row.exit_time = patch.exitTime;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.pnl !== undefined) row.pnl = patch.pnl;
      if (patch.notes !== undefined) row.notes = patch.notes;
      if (patch.screenshotUrl !== undefined) row.screenshot_url = patch.screenshotUrl;
      await supabase.from('trades').update(row).eq('id', tradeId);
    } catch (err) {
      console.error('No se pudo actualizar el trade en Supabase', err);
    }
  }, []);

  const deleteTrade = useCallback(async (tradeId: string) => {
    setTrades((prev) => {
      const updated = prev.filter((t) => t.id !== tradeId);
      if (!supabaseEnabled) localStorage.setItem(TRADES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('trades').delete().eq('id', tradeId);
    } catch (err) {
      console.error('No se pudo borrar el trade en Supabase', err);
    }
  }, []);

  const uploadTradeScreenshot = useCallback(async (file: File) => {
    if (!supabaseEnabled || !supabase) {
      throw new Error('Adjuntar capturas necesita Supabase configurado.');
    }
    const path = `trades/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  // Notificación por correo (una sola vez por transición de severidad, no en
  // cada render) — ver api/trading-alert-email.ts. Corre acá (a nivel
  // Provider, montado una vez para toda la app) para que dispare sin
  // importar en qué sub-pestaña de la Bitácora esté el usuario.
  const notifiedRef = useRef<Record<string, string>>(loadNotified());
  useEffect(() => {
    if (loading || accounts.length === 0) return;
    const notified = notifiedRef.current;
    let changed = false;
    for (const account of accounts) {
      if (account.status !== 'activa') continue;
      for (const alert of computeAccountAlerts(account, trades)) {
        if (alert.severity === 'ok') continue;
        const key = `${account.id}:${alert.rule.id}`;
        if (notified[key] === alert.severity) continue;
        notified[key] = alert.severity;
        changed = true;
        fetch('/api/trading-alert-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountName: account.name, ruleLabel: ruleLabel(alert.rule.type), severity: alert.severity, message: alert.message }),
        }).catch((err) => console.error('No se pudo enviar la alerta de la Bitácora', err));
      }
    }
    if (changed) localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
  }, [accounts, trades, loading]);

  const value = useMemo<TradingJournalValue>(
    () => ({
      accounts,
      trades,
      loading,
      syncError,
      addAccount,
      updateAccount,
      deleteAccount,
      addRule,
      updateRule,
      deleteRule,
      openTrade,
      closeTrade,
      updateTrade,
      deleteTrade,
      uploadTradeScreenshot,
    }),
    [accounts, trades, loading, syncError, addAccount, updateAccount, deleteAccount, addRule, updateRule, deleteRule, openTrade, closeTrade, updateTrade, deleteTrade, uploadTradeScreenshot],
  );

  return <TradingJournalContext.Provider value={value}>{children}</TradingJournalContext.Provider>;
}

export function useTradingJournal(): TradingJournalValue {
  const ctx = useContext(TradingJournalContext);
  if (!ctx) throw new Error('useTradingJournal debe usarse dentro de TradingJournalProvider');
  return ctx;
}
