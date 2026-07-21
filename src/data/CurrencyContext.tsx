import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Currency } from '../types';

const CURRENCY_KEY = 'macro-dashboard:currency:v1';

export const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY'];

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    const stored = localStorage.getItem(CURRENCY_KEY);
    return stored === 'EUR' || stored === 'GBP' || stored === 'CAD' || stored === 'AUD' || stored === 'NZD' || stored === 'JPY'
      ? stored
      : 'USD';
  });

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
