import { useEffect, useRef } from 'react';

interface TradingViewTickerProps {
  symbol: string;
  theme: 'light' | 'dark';
}

// Widget "Single Ticker" de TradingView (gratis, sin API key): una fila
// compacta con nombre, precio y variación diaria. TradingView exige inyectar
// su <script> con el config como texto dentro del contenedor — no hay forma
// de hacerlo con JSX normal, por eso el useEffect maneja el DOM a mano.
export function TradingViewTicker({ symbol, theme }: TradingViewTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    script.async = true;
    script.type = 'text/javascript';
    script.text = JSON.stringify({
      symbol,
      width: '100%',
      colorTheme: theme,
      isTransparent: true,
      locale: 'es',
    });
    container.appendChild(script);
  }, [symbol, theme]);

  return <div ref={containerRef} className="tradingview-widget-container min-h-[52px]" />;
}
