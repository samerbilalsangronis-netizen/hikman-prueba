import type { JournalColor } from '../types';

// Paleta completa pedida por el usuario para el Cuaderno de Economía y el
// Informe de Mentoría (2-oct-2026) — no solo rojo/verde/gris. Colores fijos
// (no variables de tema) porque son etiquetas semánticas de contenido, no
// parte del esquema visual claro/oscuro.
export const JOURNAL_COLORS: JournalColor[] = ['rojo', 'verde', 'amarillo', 'azul', 'morado', 'naranja', 'gris'];

export const JOURNAL_COLOR_LABELS: Record<JournalColor, string> = {
  rojo: 'Bajista / Negativo',
  verde: 'Alcista / Positivo',
  amarillo: 'Precaución / Mixto',
  azul: 'Informativo',
  morado: 'Banco Central / Política',
  naranja: 'Alto impacto',
  gris: 'Neutro / Sin impacto',
};

export const JOURNAL_COLOR_HEX: Record<JournalColor, string> = {
  rojo: '#ef4444',
  verde: '#22c55e',
  amarillo: '#eab308',
  azul: '#3b82f6',
  morado: '#a855f7',
  naranja: '#f97316',
  gris: '#9ca3af',
};
