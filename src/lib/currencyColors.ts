import type { Currency } from '../types';

// Un color fijo por divisa para poder "leer" el mapa mental de un vistazo —
// se usa tanto en el borde/insignia del nodo como en el color de la conexión
// que apunta a esa divisa.
export const CURRENCY_COLORS: Record<Currency, string> = {
  USD: '#3b82f6',
  EUR: '#8b5cf6',
  GBP: '#ec4899',
  CAD: '#ef4444',
  AUD: '#22c55e',
  NZD: '#14b8a6',
  JPY: '#f97316',
  CHF: '#eab308',
  CNY: '#be123c',
};

// Vínculos estructurales conocidos entre divisas (par operado, banco central
// que sigue de cerca a otro, dependencia comercial/de materias primas). Solo
// se usan para conectar automáticamente un dato de ALTO impacto con las
// divisas "terceras" a las que también afecta — no es exhaustivo, es la
// lectura macro más citada para cada caso.
interface CrossLink {
  a: Currency;
  b: Currency;
  reason: string;
}

const CROSS_CURRENCY_PAIRS: CrossLink[] = [
  { a: 'USD', b: 'EUR', reason: 'Contraparte en EUR/USD, el par más operado' },
  { a: 'USD', b: 'JPY', reason: 'El diferencial de tasas Fed–BOJ mueve USD/JPY' },
  { a: 'USD', b: 'CAD', reason: 'Comercio bilateral y correlación con el petróleo' },
  { a: 'EUR', b: 'CHF', reason: 'El SNB vigila de cerca la política del BCE' },
  { a: 'EUR', b: 'GBP', reason: 'Economías vecinas con fuerte vínculo comercial' },
  { a: 'AUD', b: 'NZD', reason: 'Economías "commodity" con correlación histórica alta' },
  { a: 'AUD', b: 'CNY', reason: 'China es el principal socio comercial de Australia' },
  { a: 'NZD', b: 'CNY', reason: 'Exportaciones agrícolas muy ligadas a la demanda china' },
];

export function crossCurrencyLinks(currency: Currency): { currency: Currency; reason: string }[] {
  return CROSS_CURRENCY_PAIRS.filter((p) => p.a === currency || p.b === currency).map((p) => ({
    currency: p.a === currency ? p.b : p.a,
    reason: p.reason,
  }));
}
