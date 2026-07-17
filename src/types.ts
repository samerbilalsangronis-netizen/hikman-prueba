export type SeriesPoint = [string, number]; // [ISO date, value]

export type Frequency = 'weekly' | 'monthly' | 'quarterly';

export type Section = 'score' | 'tasas' | 'inflacion' | 'empleo' | 'ism' | 'crecimiento';

export type Format = 'pct' | 'pct1' | 'index' | 'thousands' | 'billions' | 'ratio' | 'trade';

export type Currency = 'USD' | 'EUR';

export interface IndicatorMeta {
  id: string;
  label: string;
  shortLabel: string;
  section: Section;
  format: Format;
  frequency: Frequency;
  chart: 'line' | 'bar' | 'area';
  source: string;
  sourceUrl: string;
  goodDirection: 'up' | 'down' | 'neutral';
  description: string;
  /** Si está definido, este indicador es un subcomponente que se muestra
   * colapsado dentro de la tarjeta del indicador con este id. */
  parentId?: string;
  /** Ausente = 'USD' (los 41 indicadores originales no lo tienen seteado). */
  currency?: Currency;
}

export interface ScoreRow {
  id: string;
  label: string;
  valoracion: number; // -2..2, manual analyst input
  weight: string;
  /** Ausente = 'USD'. */
  currency?: Currency;
}

export type FreshnessLevel = 'ok' | 'warning' | 'stale';

export interface FreshnessInfo {
  level: FreshnessLevel;
  daysSince: number;
  lastDate: string | null;
}

export interface FomcProbabilities {
  probCut: number;
  probHold: number;
  probHike: number;
  note: string;
}
