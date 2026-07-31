import { useEffect, useRef } from 'react';

interface SymbolOverviewWidgetProps {
  symbol: string;
  label: string;
  theme: 'light' | 'dark';
}

// Widget "Symbol Overview" de TradingView (gratis, sin API key): a diferencia
// del widget "Market Overview" (que probamos antes — arma una tabla con
// columna de precio que TradingView oculta sola cuando el contenedor es
// angosto, como en el celular), este es un widget por símbolo con el precio
// como número grande siempre visible, sin importar el ancho — es el mismo
// widget que TradingView ofrece para "embeber" desde la página de cada
// símbolo (confirmado que TVC:NZ10Y y el resto de los rendimientos/futuros
// tienen datos reales ahí). Más alto por símbolo, pero confiable.
export function SymbolOverviewWidget({ symbol, label, theme }: SymbolOverviewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;
    script.type = 'text/javascript';
    script.text = JSON.stringify({
      symbols: [[label, `${symbol}|1D`]],
      chartOnly: false,
      width: '100%',
      height: '110',
      locale: 'es',
      colorTheme: theme,
      autosize: false,
      showVolume: false,
      showMA: false,
      hideDateRanges: true,
      hideMarketStatus: false,
      hideSymbolLogo: true,
      scalePosition: 'no',
      scaleMode: 'Normal',
      noTimeScale: true,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: 'area',
      isTransparent: true,
    });
    container.appendChild(script);
  }, [symbol, label, theme]);

  return <div ref={containerRef} className="tradingview-widget-container min-h-[110px]" />;
}
