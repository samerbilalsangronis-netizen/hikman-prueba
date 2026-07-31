export interface MarketSymbol {
  /** Id estable — tiene que coincidir con la clave que arma api/market-quotes.ts. */
  id: string;
  label: string;
  /** Texto del tooltip al pasar el mouse — editable acá. */
  tooltip: string;
}

export interface MarketCategory {
  id: string;
  title: string;
  symbols: MarketSymbol[];
}

// Solo etiquetas/agrupación para la UI. La lógica de qué fuente usar para
// traer cada precio (FRED / Finnhub / Frankfurter) vive en
// api/market-quotes.ts — Vercel empaqueta cada función de /api por separado
// y no rastrea imports que crucen a /src, así que ese archivo tiene su
// propia copia de los ids (mismo patrón que fredMappings.ts/fred-sync.ts).
export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    id: 'yields',
    title: 'Rendimientos 10Y',
    symbols: [
      { id: 'nz10y', label: 'NZ 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Nueva Zelanda — referencia de tasas largas para el NZD. Fuente: FRED/OCDE, mensual.' },
      { id: 'de10y', label: 'EU 10Y', tooltip: 'Rendimiento del Bund alemán a 10 años (proxy de la Eurozona) — referencia de tasas largas para el EUR. Fuente: FRED/OCDE, mensual.' },
      { id: 'au10y', label: 'AU 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Australia — referencia de tasas largas para el AUD. Fuente: FRED/OCDE, mensual.' },
      { id: 'us10y', label: 'US 10Y', tooltip: 'Rendimiento del Treasury a 10 años — referencia global de tasas largas y motor del USD. Fuente: FRED, semanal.' },
      { id: 'gb10y', label: 'GB 10Y', tooltip: 'Rendimiento del Gilt británico a 10 años — referencia de tasas largas para el GBP. Fuente: FRED/OCDE, mensual.' },
      { id: 'ca10y', label: 'CA 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Canadá — referencia de tasas largas para el CAD. Fuente: FRED/OCDE, mensual.' },
      { id: 'jp10y', label: 'JP 10Y', tooltip: 'Rendimiento del bono soberano a 10 años de Japón (JGB) — referencia de tasas largas para el JPY. Fuente: FRED/OCDE, mensual.' },
    ],
  },
  {
    id: 'fx',
    title: 'Divisas (spot)',
    symbols: [
      { id: 'usdjpy', label: 'USD/JPY', tooltip: 'Tipo de cambio spot dólar/yen — datos de futuros CME en tiempo real no están disponibles gratis, este es el proxy. Fuente: Frankfurter (BCE), diario.' },
      { id: 'audusd', label: 'AUD/USD', tooltip: 'Tipo de cambio spot dólar australiano/dólar — proxy del futuro 6A1!. Fuente: Frankfurter (BCE), diario.' },
      { id: 'eurusd', label: 'EUR/USD', tooltip: 'Tipo de cambio spot euro/dólar — proxy del futuro 6E1!. Fuente: Frankfurter (BCE), diario.' },
      { id: 'gbpusd', label: 'GBP/USD', tooltip: 'Tipo de cambio spot libra/dólar — proxy del futuro 6B1!. Fuente: Frankfurter (BCE), diario.' },
      { id: 'nzdusd', label: 'NZD/USD', tooltip: 'Tipo de cambio spot dólar neozelandés/dólar — proxy del futuro 6N1!. Fuente: Frankfurter (BCE), diario.' },
      { id: 'usdcad', label: 'USD/CAD', tooltip: 'Tipo de cambio spot dólar/dólar canadiense — proxy del futuro 6C1!. Fuente: Frankfurter (BCE), diario.' },
      { id: 'usdchf', label: 'USD/CHF', tooltip: 'Tipo de cambio spot dólar/franco suizo — proxy del futuro 6S1!. Fuente: Frankfurter (BCE), diario.' },
    ],
  },
  {
    id: 'emerging',
    title: 'Emergentes / Asia (ETF)',
    symbols: [{ id: 'vwo', label: 'VWO', tooltip: 'Vanguard FTSE Emerging Markets ETF — termómetro del apetito por riesgo en mercados emergentes y Asia.' }],
  },
  {
    id: 'tech',
    title: 'Tecnología y Crecimiento',
    symbols: [
      { id: 'dji', label: 'DJI', tooltip: 'Dow Jones Industrial Average — termómetro amplio del sentimiento de riesgo en EE.UU.' },
      { id: 'nvda', label: 'NVDA', tooltip: 'NVIDIA — bellwether del ciclo de inversión en IA/semiconductores.' },
      { id: 'aapl', label: 'AAPL', tooltip: 'Apple — mayor componente tecnológico por capitalización, sensible a demanda de consumo global.' },
      { id: 'lly', label: 'LLY', tooltip: 'Eli Lilly — bellwether del sector salud/farma de alto crecimiento.' },
      { id: 'meta', label: 'META', tooltip: 'Meta Platforms — gasto publicitario digital y capex en IA.' },
      { id: 'brk_b', label: 'BRK.B', tooltip: 'Berkshire Hathaway — proxy de confianza value/defensiva, sensible al ciclo económico general.' },
      { id: 'tsla', label: 'TSLA', tooltip: 'Tesla — proxy de apetito por riesgo especulativo y sector EV.' },
      { id: 'avgo', label: 'AVGO', tooltip: 'Broadcom — semiconductores e infraestructura de IA.' },
      { id: 'amzn', label: 'AMZN', tooltip: 'Amazon — consumo online y nube (AWS), sensible a gasto del consumidor en EE.UU.' },
      { id: 'msft', label: 'MSFT', tooltip: 'Microsoft — nube e inversión en IA, mayor capitalización tecnológica.' },
      { id: 'meli', label: 'MELI', tooltip: 'MercadoLibre — proxy de consumo/e-commerce en Latinoamérica.' },
      { id: 'googl', label: 'GOOGL', tooltip: 'Alphabet (Google) — publicidad digital y nube.' },
      { id: 'aal', label: 'AAL', tooltip: 'American Airlines — proxy cíclico de gasto en viajes/turismo.' },
    ],
  },
];
