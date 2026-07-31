import type { BiasLevel, Currency, ReasonColor } from '../types';

export const BIAS_LABELS: Record<BiasLevel, string> = {
  hawkish: 'Hawkish',
  neutral_alcista: 'Neutro Alcista',
  neutral: 'Neutro',
  neutral_bajista: 'Neutro Bajista',
  dovish: 'Dovish',
};

// De hawkish (alcista para la divisa) a dovish (bajista), con el mismo verde/gris/rojo
// que el resto del dashboard usa para "bueno/neutral/malo".
export const BIAS_COLORS: Record<BiasLevel, string> = {
  hawkish: 'var(--status-good)',
  neutral_alcista: '#7bb86a',
  neutral: 'var(--text-muted)',
  neutral_bajista: '#e0975a',
  dovish: 'var(--status-critical)',
};

export const REASON_COLOR_LABELS: Record<ReasonColor, string> = {
  good: 'Bueno',
  bad: 'Malo',
  neutral: 'Neutral',
};

export const REASON_COLORS: Record<ReasonColor, string> = {
  good: 'var(--status-good)',
  bad: 'var(--status-critical)',
  neutral: 'var(--text-muted)',
};

export const CENTRAL_BANK_BY_CURRENCY: Record<Currency, string> = {
  USD: 'Reserva Federal (Fed)',
  EUR: 'Banco Central Europeo (BCE)',
  GBP: 'Banco de Inglaterra (BoE)',
  CAD: 'Banco de Canadá (BoC)',
  AUD: 'Banco de la Reserva de Australia (RBA)',
  NZD: 'Banco de la Reserva de Nueva Zelanda (RBNZ)',
  JPY: 'Banco de Japón (BOJ)',
  CHF: 'Banco Nacional Suizo (SNB)',
  CNY: 'Banco Popular de China (PBoC)',
};
