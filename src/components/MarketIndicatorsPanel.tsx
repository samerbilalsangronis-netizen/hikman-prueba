import { MARKET_CATEGORIES } from '../data/marketIndicators';
import { TradingViewTicker } from './TradingViewTicker';

interface MarketIndicatorsPanelProps {
  theme: 'light' | 'dark';
}

export function MarketIndicatorsPanel({ theme }: MarketIndicatorsPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Indicadores de Mercado
      </h2>
      {MARKET_CATEGORIES.map((category) => (
        <div key={category.id} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {category.title}
          </h3>
          <div className="flex flex-col gap-1.5">
            {category.symbols.map((sym) => (
              <div
                key={sym.tvSymbol}
                title={sym.tooltip}
                className="overflow-hidden rounded-lg"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              >
                <TradingViewTicker symbol={sym.tvSymbol} theme={theme} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
