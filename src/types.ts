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
  /** Si está definido, es un dato de una economía interna (ej. Alemania/
   * Francia dentro de la Eurozona) — se muestra en su propia pestaña de país
   * en vez de en las secciones agregadas (Inflación/Crecimiento/etc. de esa
   * divisa quedan solo con datos a nivel Eurozona). */
  country?: 'DE' | 'FR';
  /** Si la fuente publica este indicador en más de una vuelta (ej. PMI
   * Flash vs. PMI Final, HICP flash estimate vs. la cifra detallada/final
   * de Eurostat), marca cuál de las dos está trackeando este id — se
   * muestra como insignia en la tarjeta. Ausente = la fuente solo publica
   * una vez (no aplica la distinción), o no se pudo determinar con
   * confianza cuál vuelta es — NO usar para revisiones graduales del mismo
   * dato (ej. PIB que se revisa en el mismo id con el correr de los meses,
   * como EE.UU./JPY) — ahí el "preliminar/final" cambia con cada punto de
   * la serie, no es una propiedad fija del indicador. */
  releaseStage?: 'preliminar' | 'final';
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

/** Apartado "Banco Central" del Resumen de cada divisa — a diferencia de
 * BankerNote (por banquero individual, ver Banqueros.tsx), esto es UNA nota
 * por divisa: la postura institucional del banco central, no de una persona
 * puntual. Expectativas de inflación/crecimiento quedan como texto libre
 * porque no todos los bancos centrales las publican con el mismo formato
 * (algunos dan un rango numérico, otros solo lenguaje cualitativo). */
export interface CentralBankNote {
  rateDecision?: Statement;
  pressConference?: Statement;
  inflationExpectations?: string;
  growthExpectations?: string;
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
  /** Traducción al español — solo para titulares que vienen en inglés (Finnhub);
   * las cargas manuales ya están en español, esto queda sin definir. */
  titleEs?: string;
}

/** Sesgo grande de una divisa. Va de dovish a hawkish; los dos "neutro
 * alcista/bajista" son matices intermedios que pidió el usuario. */
export type BiasLevel = 'hawkish' | 'neutral_alcista' | 'neutral' | 'neutral_bajista' | 'dovish';

export interface BiasReason {
  id: string;
  label: string;
  /** Tono del motivo (no anterior/previsión/actual como en Actualizar Datos —
   * acá es directamente hacia dónde apunta ese dato para la divisa). Misma
   * escala de 5 niveles que el sesgo grande. */
  color: BiasLevel;
  /** Si este motivo viene de un titular fijado desde Titulares. */
  headlineId?: string;
}

export interface BiasSnapshot {
  /** Solo en entradas de historial (current no necesita id propio). */
  id?: string;
  level: BiasLevel | null;
  summary: string;
  reasons: BiasReason[];
  /** Cuándo arrancó esta semana (se resetea al presionar "Actualizar sesgo"). */
  startedAt: string;
}

export interface CurrencyBias {
  currency: Currency;
  current: BiasSnapshot;
  /** Semanas archivadas, más reciente primero. Se agrega una al presionar
   * "Actualizar sesgo" — no hay límite de cuántas se guardan. */
  history: BiasSnapshot[];
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

// --- Bitácora de Trading (migrado del sistema anterior, sesión 7-sep-2026) --

export type TradingAccountType = 'fondeo' | 'real';
export type TradingAccountStatus = 'activa' | 'inactiva';

/** 'custom' es una regla de texto libre sin valor numérico monitoreable
 * automáticamente (ej. "no operar viernes después de las 12pm") — las demás
 * sí tienen un `value` que el motor de alertas compara contra los trades. */
export type TradingRuleType = 'max_daily_loss_pct' | 'max_drawdown_pct' | 'profit_target_pct' | 'min_trading_days' | 'custom';

export interface TradingAccountRule {
  id: string;
  type: TradingRuleType;
  /** Porcentaje (ej. 5 = 5%) o cantidad de días según `type`. Ausente en 'custom'. */
  value?: number;
  /** Obligatoria en 'custom' (es la regla completa); aclaración opcional en el resto. */
  description?: string;
  enabled: boolean;
}

export interface TradingAccount {
  id: string;
  name: string;
  type: TradingAccountType;
  status: TradingAccountStatus;
  initialBalance: number;
  rules: TradingAccountRule[];
  createdAt: string;
}

export type TradeDirection = 'compra' | 'venta';
export type TradeStatus = 'abierto' | 'cerrado';

/** Se crea al ABRIR la posición (no al cerrarla, a diferencia del sistema
 * Excel anterior) y se completa con exitPrice/exitTime al cerrarla — mismo
 * registro, no uno nuevo. entryTime/exitTime se autocompletan con el momento
 * de carga pero quedan editables por si el trade se carga después de que
 * ocurrió realmente. */
export interface Trade {
  id: string;
  accountId: string;
  instrument: string;
  direction: TradeDirection;
  size: number;
  /** Opcional — no todos los traders registran el precio exacto, el P&L manual no depende de esto. */
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  commission: number;
  entryTime: string;
  exitTime?: string;
  status: TradeStatus;
  /** Solo presente cuando status === 'cerrado'. Incluye comisión ya restada. */
  pnl?: number;
  notes?: string;
  screenshotUrl?: string;
  /** Link externo al gráfico (ej. TradingView) — separado de screenshotUrl, que es una captura subida. */
  chartUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type TradingAlertSeverity = 'ok' | 'warning' | 'breached';

/** Resultado calculado en el cliente (no se guarda) al comparar los trades
 * de una cuenta contra sus reglas — ver src/lib/tradingRules.ts. */
export interface TradingRuleAlert {
  rule: TradingAccountRule;
  severity: TradingAlertSeverity;
  /** 0-100+, cuánto de la regla se ha "consumido" (ej. 80 = 80% de la pérdida diaria máxima). Ausente en reglas 'custom'. */
  usedPct?: number;
  message: string;
}

// --- Seguimiento de Idea Operativa (4-oct-2026) -----------------------------
// Pedido explícito del usuario: un lugar para anotar la idea de trade que
// está siguiendo AHORA MISMO (una sola, la más reciente — no una lista de
// setups), para tenerla presente sin que eso se vuelva un impulso a operar
// de más. 'activa' = la que se muestra; al cargar una idea nueva, la
// anterior (si había) pasa a 'descartada' automáticamente — siempre hay como
// mucho UNA activa. 'ejecutada' = se montó el trade desde acá (ver
// TradingJournalContext.markIdeaExecuted), deja de mostrarse pero queda de
// registro histórico.
export type TradeIdeaStatus = 'activa' | 'ejecutada' | 'descartada';

export interface TradeIdea {
  id: string;
  instrument: string;
  direction: TradeDirection;
  /** Texto libre (no siempre es un número exacto — ej. "1.0820-1.0850"). */
  entryZone?: string;
  stopLoss?: string;
  takeProfit?: string;
  notes: string;
  status: TradeIdeaStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Cuaderno de Economía + Informe Diario de Mentoría (2-oct-2026) --------
// Mismo modelo de datos para ambos ("journal_entries", distinguidos por
// `kind`) porque comparten exactamente la semántica: una entrada por día,
// con color y foto opcional, que se "archiva" solo por el paso del
// calendario (no hay una acción de archivado real — ver journalWeek.ts,
// cualquier entrada fuera de la semana en curso ya cuenta como historial).
// `aiAnalysis`/`aiSynthesis` solo aplican a kind 'mentoria'.
export type JournalEntryKind = 'economia' | 'mentoria';

/** Paleta completa pedida por el usuario — no solo rojo/verde/gris, ver
 * lib/journalColors.ts para las etiquetas y el color real de cada uno. */
/** Escala de sentimiento de 6 pasos (de más bajista a más alcista) — pedida
 * explícita del usuario (4-oct-2026) en vez de una paleta genérica, para que
 * cada color tenga un significado financiero claro de entrada. */
export type JournalColor = 'rojo' | 'naranja' | 'naranja_tenue' | 'gris' | 'verde_claro' | 'verde_fuerte';

export interface MentorAiAnalysis {
  catalysts: string[];
  keyLevels: string[];
  scenario: string;
  /** Cuándo se generó — para poder mostrar "análisis desactualizado" si se edita el texto después. */
  analyzedAt: string;
}

/** Captura pegada con Ctrl+V que flota libre sobre el cuaderno (4-oct-2026, a
 * pedido del usuario: "la imagen debe pegarse libre y yo poder arrastrarla a
 * cualquier parte... y bloquearla allí... debe hacerse grande o pequeña según
 * cómo yo la hale de la esquina") — no vive en el flujo del texto como un
 * <img> más, es un objeto posicionado (x/y/width/height en px, relativos al
 * lienzo del día) que se arrastra y redimensiona desde la esquina, y se
 * puede bloquear para que no se mueva más por accidente. */
export interface PinnedImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
}

export interface JournalEntry {
  id: string;
  kind: JournalEntryKind;
  /** Fecha del día que describe esta entrada (YYYY-MM-DD, hora local del usuario). */
  date: string;
  color: JournalColor;
  text: string;
  imageUrls: string[];
  /** Solo kind 'economia' — capturas pegadas con posición libre (ver PinnedImage). */
  pinnedImages: PinnedImage[];
  /** Solo kind 'mentoria' — resultado de la última corrida del agente IA sobre `text`. */
  aiAnalysis?: MentorAiAnalysis;
  createdAt: string;
  updatedAt: string;
}

/** Síntesis semanal (viernes) de los informes diarios de mentoría de esa semana. */
export interface MentorWeeklySynthesis {
  id: string;
  /** Domingo (YYYY-MM-DD) que arranca la semana que resume. */
  weekStart: string;
  content: string;
  createdAt: string;
}

// --- Agenda Semanal (4-oct-2026) --------------------------------------------
// Carga manual de eventos económicos importantes de la semana, con alarma
// opcional que dispara un correo de recordatorio (ver api/trading-alert-email.ts
// ?action=calendar-reminder). Reusa ImpactLevel (mismo esquema de colores que
// Titulares) en vez de inventar otra escala.

export interface CalendarEvent {
  id: string;
  title: string;
  /** Opcional — no todos los eventos son específicos de una divisa. */
  currency?: Currency;
  /** Fecha/hora exacta del evento, ISO con hora (se guarda en UTC, el input es datetime-local). */
  eventAt: string;
  impact: ImpactLevel;
  alarmEnabled: boolean;
  /** Cuántos minutos antes de eventAt se manda el correo de recordatorio. */
  remindMinutesBefore: number;
  /** Si ya se mandó el correo para este evento (evita duplicados) — ausente/null = no mandado. */
  notifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
