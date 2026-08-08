import type { BiasLevel, ImpactLevel, IndicatorMeta } from '../types';

// Lunes 00:00 hora local de la semana que contiene `date` — mismo criterio
// que "semana en curso" del resto de la app (rolloverBias/currency_bias_history).
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// Heurística de sorpresa: desvío relativo entre Real y Previsión. Es un punto
// de partida automático, no un juicio experto — por eso la Pizarra permite
// corregir el nivel a mano por tarjeta (no se guarda el desvío "correcto"
// para cada formato/indicador, sería sobre-ingeniería para una sección
// experimental).
export function computeImpact(actual: number, forecast: number | undefined): ImpactLevel {
  if (forecast === undefined) return 'bajo';
  const diff = Math.abs(actual - forecast);
  if (diff === 0) return 'bajo';
  const base = Math.abs(forecast);
  if (base < 1e-9) return 'alto'; // previsión ~0 y hubo sorpresa: tratarla como relevante
  const relative = diff / base;
  if (relative >= 0.2) return 'alto';
  if (relative >= 0.07) return 'medio';
  return 'bajo';
}

// Color del motivo al "Vincular a Sesgo" — mismo criterio de
// bueno/malo/neutral que ChartCard usa para la flechita ▲▼ (goodDirection),
// pero comparando contra la Previsión en vez de contra el punto anterior.
export function surpriseColor(meta: IndicatorMeta, actual: number, forecast: number | undefined): BiasLevel {
  if (forecast === undefined || meta.goodDirection === 'neutral') return 'neutral';
  const delta = actual - forecast;
  const good = meta.goodDirection === 'up' ? delta >= 0 : delta <= 0;
  return good ? 'neutral_alcista' : 'neutral_bajista';
}
