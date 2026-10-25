import type { JournalColor } from '../types';

// Escala de sentimiento de 6 pasos (4-oct-2026, a pedido explícito del
// usuario — "los colores podemos limitarlos a rojo, naranja, naranja tenue,
// verde fuerte, verde claro, gris"), de más bajista a más alcista. Se usa
// tanto para resaltar texto en el Cuaderno de Economía como para los
// "stickers" de referencia (Hawkish/Dovish/etc., ver lib/journalStickers.ts)
// — un solo sistema de color para las dos cosas.
export const JOURNAL_COLORS: JournalColor[] = ['rojo', 'naranja', 'naranja_tenue', 'gris', 'verde_claro', 'verde_fuerte'];

export const JOURNAL_COLOR_LABELS: Record<JournalColor, string> = {
  rojo: 'Muy Bajista / Negativo',
  naranja: 'Bajista / Negativo',
  naranja_tenue: 'Levemente Bajista',
  gris: 'Neutro / Sin Impacto',
  verde_claro: 'Levemente Alcista',
  verde_fuerte: 'Muy Alcista / Positivo',
};

export const JOURNAL_COLOR_HEX: Record<JournalColor, string> = {
  rojo: '#dc2626',
  naranja: '#f97316',
  naranja_tenue: '#fed7aa',
  gris: '#6b7280',
  verde_claro: '#bbf7d0',
  verde_fuerte: '#16a34a',
};

// Los tonos "tenue"/"claro" son pálidos — texto blanco encima queda sin
// contraste. El resto usa texto blanco como el resto de los badges de la app.
export const JOURNAL_COLOR_TEXT: Record<JournalColor, string> = {
  rojo: '#ffffff',
  naranja: '#ffffff',
  naranja_tenue: '#7c2d12',
  gris: '#ffffff',
  verde_claro: '#14532d',
  verde_fuerte: '#ffffff',
};

// Color de TEXTO para escribir un titular en el color de su impacto (25-oct-
// 2026, hoja semanal estilo cuaderno de Nufal: el titular se lee en su
// color, sin caja). Los tonos "tenue"/"claro" de JOURNAL_COLOR_HEX son fondos
// pálidos que como texto no se leen sobre el tema claro — esos dos usan una
// variable CSS con un tono distinto por tema (src/index.css).
export const JOURNAL_COLOR_INK: Record<JournalColor, string> = {
  rojo: '#dc2626',
  naranja: '#ea580c',
  naranja_tenue: 'var(--journal-ink-naranja-tenue)',
  gris: 'var(--text-secondary)',
  verde_claro: 'var(--journal-ink-verde-claro)',
  verde_fuerte: '#16a34a',
};
