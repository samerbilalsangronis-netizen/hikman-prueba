import { MARKET_CATEGORIES } from '../data/marketIndicators';
import { MarketOverviewWidget } from './MarketOverviewWidget';

interface MarketIndicatorsPanelProps {
  theme: 'light' | 'dark';
}

export function MarketIndicatorsPanel({ theme }: MarketIndicatorsPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Indicadores de Mercado
      </h2>
      <div className="overflow-hidden rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <MarketOverviewWidget theme={theme} />
      </div>

      <details className="rounded-lg p-3 text-xs" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        <summary className="cursor-pointer font-semibold" style={{ color: 'var(--text-primary)' }}>
          ¿Qué significa cada indicador?
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          {MARKET_CATEGORIES.map((category) => (
            <div key={category.id}>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {category.title}
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {category.symbols.map((sym) => (
                  <li key={sym.tvSymbol}>
                    <strong>{sym.label}</strong> — {sym.tooltip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
