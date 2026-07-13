export type SeriesPoint = [string, number]; // [ISO date, value]

export type Frequency = 'weekly' | 'monthly' | 'quarterly';

export type Section = 'score' | 'tasas' | 'inflacion' | 'empleo' | 'ism';

export type Format = 'pct' | 'pct1' | 'index' | 'thousands' | 'billions' | 'ratio';

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
}

export interface ScoreRow {
  id: string;
  label: string;
  valoracion: number; // -2..2, manual analyst input
  weight: string;
}

export type FreshnessLevel = 'ok' | 'warning' | 'stale';

export interface FreshnessInfo {
  level: FreshnessLevel;
  daysSince: number;
  lastDate: string | null;
}
