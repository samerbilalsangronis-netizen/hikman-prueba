import type { ImpactLevel } from '../types';

export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  alto: 'Alto impacto',
  medio: 'Impacto medio',
  bajo: 'Bajo impacto',
};

// Rojo/naranja/gris, a pedido del usuario — ver variables en index.css.
export const IMPACT_COLORS: Record<ImpactLevel, string> = {
  alto: 'var(--status-critical)',
  medio: 'var(--series-8)',
  bajo: 'var(--text-muted)',
};
