export interface MarketSymbol {
  /** Símbolo de TradingView (EXCHANGE:TICKER), usado para el widget embebido. */
  tvSymbol: string;
  /** Nombre corto mostrado en la tarjeta. */
  label: string;
  /** Texto del tooltip al pasar el mouse — editable acá. */
  tooltip: string;
}

export interface MarketCategory {
  id: string;
  title: string;
  symbols: MarketSymbol[];
}

// Símbolos de TradingView (gratis, sin key, vía su widget embebido). Si algún
// símbolo no resuelve (TradingView descontinuó/renombró un ticker), el widget
// muestra "n/a" en vez de romper la página — revisar visualmente de vez en cuando.
export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    id: 'yields',
    title: 'Rendimientos 10Y',
    symbols: [
      { tvSymbol: 'TVC:NZ10Y', label: 'NZ 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Nueva Zelanda — referencia de tasas largas para el NZD.' },
      { tvSymbol: 'TVC:DE10Y', label: 'EU 10Y', tooltip: 'Rendimiento del Bund alemán a 10 años — referencia de tasas largas para el EUR.' },
      { tvSymbol: 'TVC:AU10Y', label: 'AU 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Australia — referencia de tasas largas para el AUD.' },
      { tvSymbol: 'TVC:US10Y', label: 'US 10Y', tooltip: 'Rendimiento del Treasury a 10 años — referencia global de tasas largas y motor del USD.' },
      { tvSymbol: 'TVC:GB10Y', label: 'GB 10Y', tooltip: 'Rendimiento del Gilt británico a 10 años — referencia de tasas largas para el GBP.' },
      { tvSymbol: 'TVC:CA10Y', label: 'CA 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Canadá — referencia de tasas largas para el CAD.' },
      { tvSymbol: 'TVC:JP10Y', label: 'JP 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Japón (JGB) — referencia de tasas largas para el JPY.' },
    ],
  },
  {
    id: 'futures',
    title: 'Futuros de Divisas',
    symbols: [
      { tvSymbol: 'CME:6J1!', label: '6J1! JPY', tooltip: 'Futuro continuo del Yen japonés (CME) — posicionamiento institucional en JPY/USD.' },
      { tvSymbol: 'CME:6A1!', label: '6A1! AUD', tooltip: 'Futuro continuo del Dólar australiano (CME) — posicionamiento institucional en AUD/USD.' },
      { tvSymbol: 'CME:6E1!', label: '6E1! EUR', tooltip: 'Futuro continuo del Euro (CME) — posicionamiento institucional en EUR/USD.' },
      { tvSymbol: 'CME:6B1!', label: '6B1! GBP', tooltip: 'Futuro continuo de la Libra esterlina (CME) — posicionamiento institucional en GBP/USD.' },
      { tvSymbol: 'CME:6N1!', label: '6N1! NZD', tooltip: 'Futuro continuo del Dólar neozelandés (CME) — posicionamiento institucional en NZD/USD.' },
      { tvSymbol: 'CME:6C1!', label: '6C1! CAD', tooltip: 'Futuro continuo del Dólar canadiense (CME) — posicionamiento institucional en CAD/USD.' },
      { tvSymbol: 'CME:6S1!', label: '6S1! CHF', tooltip: 'Futuro continuo del Franco suizo (CME) — posicionamiento institucional en CHF/USD.' },
    ],
  },
  {
    id: 'emerging',
    title: 'Emergentes / Asia (ETF)',
    symbols: [
      { tvSymbol: 'AMEX:VWO', label: 'VWO', tooltip: 'Vanguard FTSE Emerging Markets ETF — termómetro del apetito por riesgo en mercados emergentes y Asia.' },
    ],
  },
  {
    id: 'tech',
    title: 'Tecnología y Crecimiento',
    symbols: [
      { tvSymbol: 'TVC:DJI', label: 'DJI', tooltip: 'Dow Jones Industrial Average — termómetro amplio del sentimiento de riesgo en EE.UU.' },
      { tvSymbol: 'NASDAQ:NVDA', label: 'NVDA', tooltip: 'NVIDIA — bellwether del ciclo de inversión en IA/semiconductores.' },
      { tvSymbol: 'NASDAQ:AAPL', label: 'AAPL', tooltip: 'Apple — mayor componente tecnológico por capitalización, sensible a demanda de consumo global.' },
      { tvSymbol: 'NYSE:LLY', label: 'LLY', tooltip: 'Eli Lilly — bellwether del sector salud/farma de alto crecimiento.' },
      { tvSymbol: 'NASDAQ:META', label: 'META', tooltip: 'Meta Platforms — gasto publicitario digital y capex en IA.' },
      { tvSymbol: 'NYSE:BRK.B', label: 'BRK.B', tooltip: 'Berkshire Hathaway — proxy de confianza value/defensiva, sensible al ciclo económico general.' },
      { tvSymbol: 'NASDAQ:TSLA', label: 'TSLA', tooltip: 'Tesla — proxy de apetito por riesgo especulativo y sector EV.' },
      { tvSymbol: 'NASDAQ:AVGO', label: 'AVGO', tooltip: 'Broadcom — semiconductores e infraestructura de IA.' },
      { tvSymbol: 'NASDAQ:AMZN', label: 'AMZN', tooltip: 'Amazon — consumo online y nube (AWS), sensible a gasto del consumidor en EE.UU.' },
      { tvSymbol: 'NASDAQ:MSFT', label: 'MSFT', tooltip: 'Microsoft — nube e inversión en IA, mayor capitalización tecnológica.' },
      { tvSymbol: 'NASDAQ:MELI', label: 'MELI', tooltip: 'MercadoLibre — proxy de consumo/e-commerce en Latinoamérica.' },
      { tvSymbol: 'NASDAQ:GOOGL', label: 'GOOGL', tooltip: 'Alphabet (Google) — publicidad digital y nube.' },
      { tvSymbol: 'NASDAQ:AAL', label: 'AAL', tooltip: 'American Airlines — proxy cíclico de gasto en viajes/turismo.' },
    ],
  },
];
