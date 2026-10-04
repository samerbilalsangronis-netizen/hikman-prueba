import { JOURNAL_COLOR_HEX, JOURNAL_COLOR_TEXT } from './journalColors';
import type { JournalColor } from '../types';

// Catálogo de "stickers" de referencia para el Cuaderno de Economía
// (4-oct-2026, pedido opcional del usuario) — insertan una insignia de
// texto fijo con color en el punto del cursor, para marcar rápido el tono
// de una frase sin tener que escribirlo y resaltarlo a mano. Reusa la
// misma escala de 6 colores que el resaltado de texto (ver
// lib/journalColors.ts) para que todo el cuaderno hable "el mismo idioma"
// de color — Hawkish/Dovish no son más que el extremo alcista/bajista de
// esa escala.
export interface JournalSticker {
  label: string;
  color: string;
  textColor: string;
}

function fromPalette(label: string, key: JournalColor): JournalSticker {
  return { label, color: JOURNAL_COLOR_HEX[key], textColor: JOURNAL_COLOR_TEXT[key] };
}

export const JOURNAL_STICKERS: JournalSticker[] = [
  fromPalette('Hawkish', 'verde_fuerte'),
  fromPalette('Neutro Alcista', 'verde_claro'),
  fromPalette('Neutro', 'gris'),
  fromPalette('Neutro Bajista', 'naranja_tenue'),
  fromPalette('Dovish', 'rojo'),
  fromPalette('Alto Impacto', 'naranja'),
];
