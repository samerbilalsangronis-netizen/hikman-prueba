import type { Currency } from '../types';

// Un tipo de cambio spot diario por divisa (ya normalizado a "USD por 1
// unidad de la divisa" en api/fred-sync.ts, sea cual sea la convención de
// cotización real de la Fed para esa serie) — USD no tiene fila propia,
// vale 1 por definición. Extraído de Fortaleza.tsx (2-oct-2026) para
// reusarlo también en el mini-gráfico de las tarjetas de sesgo del Panel de
// Control.
export const FX_INDICATOR_ID: Partial<Record<Currency, string>> = {
  EUR: 'fx_eur_usd',
  GBP: 'fx_gbp_usd',
  AUD: 'fx_aud_usd',
  NZD: 'fx_nzd_usd',
  JPY: 'fx_jpy_usd',
  CAD: 'fx_cad_usd',
  CHF: 'fx_chf_usd',
  CNY: 'fx_cny_usd',
};
