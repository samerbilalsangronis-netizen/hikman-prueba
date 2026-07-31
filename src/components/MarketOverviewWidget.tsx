import { useEffect, useRef } from 'react';
import { MARKET_CATEGORIES } from '../data/marketIndicators';

interface MarketOverviewWidgetProps {
  theme: 'light' | 'dark';
}

// Widget "Market Overview" de TradingView (gratis, sin API key): a diferencia
// del widget "Single Ticker" (que usamos antes y solo soporta acciones —
// mostraba "This symbol is only available on TradingView" para rendimientos
// de bonos y futuros), este soporta bonos/futuros/índices/acciones juntos en
// pestañas por categoría, que es justo lo que necesitamos acá. Un solo
// iframe para los ~25 símbolos en vez de uno por símbolo.
export function MarketOverviewWidget({ theme }: MarketOverviewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.type = 'text/javascript';
    script.text = JSON.stringify({
      colorTheme: theme,
      dateRange: '12M',
      showChart: false,
      locale: 'es',
      width: '100%',
      height: '640',
      isTransparent: true,
      showSymbolLogo: false,
      showFloatingTooltip: false,
      plotLineColorGrowing: 'rgba(41, 98, 255, 1)',
      plotLineColorFalling: 'rgba(41, 98, 255, 1)',
      belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)',
      belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
      belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
      belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
      tabs: MARKET_CATEGORIES.map((category) => ({
        title: category.title,
        originalTitle: category.title,
        symbols: category.symbols.map((s) => ({ s: s.tvSymbol, d: s.label })),
      })),
    });
    container.appendChild(script);
  }, [theme]);

  return <div ref={containerRef} className="tradingview-widget-container min-h-[640px]" />;
}
