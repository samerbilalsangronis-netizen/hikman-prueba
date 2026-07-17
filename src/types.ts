export type SeriesPoint = [string, number]; // [ISO date, value]

export type Frequency = 'weekly' | 'monthly' | 'quarterly';

export type Section = 'score' | 'tasas' | 'inflacion' | 'empleo' | 'confianza' | 'crecimiento';

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

/** 'rotating' = vota en rotación este año (Fed: 4 presidentes regionales;
 * BCE: grupo de países grandes que turnan un voto entre sí). */
export type BankerVoteStatus = 'voting' | 'rotating' | 'nonvoting';

export type Stance = 'hawkish' | 'dovish' | 'neutral';

export interface CentralBanker {
  id: string;
  name: string;
  title: string;
  vote: BankerVoteStatus;
  currency: Currency;
  /** Perfil oficial o Wikipedia, para "más info". */
  bioUrl: string;
  /** Foto de Wikimedia Commons, cargada al armar el listado — no editable desde la UI. */
  photoUrl?: string;
}

export interface Statement {
  date?: string;
  stance?: Stance;
  summary?: string;
  sourceUrl?: string;
}

/** Comunicado actual y anterior por banquero, para ver si cambió la postura.
 * Al guardar uno nuevo, el que era "actual" pasa a "anterior" — mismo patrón
 * que Anterior/Actual en el resto del dashboard. */
export interface BankerNote {
  current?: Statement;
  previous?: Statement;
}
