export type SeriesPoint = [string, number]; // [ISO date, value]

export type Frequency = 'weekly' | 'monthly' | 'quarterly';

export type Section = 'score' | 'tasas' | 'inflacion' | 'empleo' | 'confianza' | 'crecimiento';

export type Format = 'pct' | 'pct1' | 'index' | 'thousands' | 'billions' | 'ratio' | 'trade';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'NZD' | 'JPY' | 'CHF' | 'CNY';

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

/** 'alto' = rojo, 'medio' = naranja, 'bajo' = gris (insignias de Titulares). */
export type ImpactLevel = 'alto' | 'medio' | 'bajo';

export interface Headline {
  id: string;
  title: string;
  source: string;
  url?: string;
  /** ISO datetime (con hora si se conoce, si no medianoche UTC del día). */
  publishedAt: string;
  impact: ImpactLevel;
  /** Divisas/activos que afecta, ej. ['USD', 'Bonos'] — usado para el filtro de relevancia. */
  tags: string[];
  /** true = cargado a mano desde la UI, false = vino de una API. */
  isManual: boolean;
  pinned: boolean;
  /** Si está fijado como motivo del sesgo de una divisa (Panel de Control). Fijar a una
   * divisa siempre implica pinned=true (aparece en la cinta también). */
  biasCurrency?: Currency;
}

/** Sesgo grande de una divisa. Va de dovish a hawkish; los dos "neutro
 * alcista/bajista" son matices intermedios que pidió el usuario. */
export type BiasLevel = 'hawkish' | 'neutral_alcista' | 'neutral' | 'neutral_bajista' | 'dovish';

/** Color del resultado del dato que motiva el sesgo (no anterior/previsión/actual
 * como en Actualizar Datos — acá es directamente si el dato fue bueno/malo/neutral
 * para la divisa). */
export type ReasonColor = 'good' | 'bad' | 'neutral';

export interface BiasReason {
  id: string;
  label: string;
  color: ReasonColor;
  /** Si este motivo viene de un titular fijado desde Titulares. */
  headlineId?: string;
}

export interface BiasSnapshot {
  level: BiasLevel | null;
  summary: string;
  reasons: BiasReason[];
  /** Cuándo arrancó esta semana (se resetea al presionar "Actualizar sesgo"). */
  startedAt: string;
}

export interface CurrencyBias {
  currency: Currency;
  current: BiasSnapshot;
  previous?: BiasSnapshot;
  centralBank: string;
  policyRate: string;
  nextMeeting?: string;
}

/** Informe económico o resumen del mentor (Nufal Bakali) — mismo shape para
 * ambos, se guardan en tablas separadas. Archivo y texto son opcionales pero
 * al menos uno debe estar presente. */
export interface DocumentEntry {
  id: string;
  title: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}
