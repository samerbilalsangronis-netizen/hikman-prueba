import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import historicalSeries from './historical-series.json';
import { SCORE_SEED as USD_SCORE_SEED } from './scoreSeed';
import { EUR_SCORE_SEED } from './scoreSeedEur';
import { GBP_SCORE_SEED } from './scoreSeedGbp';
import { CAD_SCORE_SEED } from './scoreSeedCad';
import { AUD_SCORE_SEED } from './scoreSeedAud';
import { NZD_SCORE_SEED } from './scoreSeedNzd';
import { JPY_SCORE_SEED } from './scoreSeedJpy';
import { CHF_SCORE_SEED } from './scoreSeedChf';

const SCORE_SEED = [
  ...USD_SCORE_SEED,
  ...EUR_SCORE_SEED,
  ...GBP_SCORE_SEED,
  ...CAD_SCORE_SEED,
  ...AUD_SCORE_SEED,
  ...NZD_SCORE_SEED,
  ...JPY_SCORE_SEED,
  ...CHF_SCORE_SEED,
];
import { supabase, supabaseEnabled } from '../lib/supabaseClient';
import { CENTRAL_BANK_BY_CURRENCY } from '../lib/bias';
import { CURRENCIES } from './CurrencyContext';
import type {
  BankerNote,
  BiasLevel,
  BiasReason,
  CentralBankNote,
  Currency,
  CurrencyBias,
  DocumentEntry,
  FomcProbabilities,
  Headline,
  ImpactLevel,
  ScoreRow,
  SeriesPoint,
  Statement,
} from '../types';

export interface RecentUpdate {
  indicatorId: string;
  date: string;
  value: number;
  updatedAt: string;
}

type SeriesMap = Record<string, SeriesPoint[]>;
type StageMap = Record<string, Record<string, 'preliminar' | 'final'>>; // id -> date -> stage
type ForecastMap = Record<string, number>;
type FomcWatchMap = Record<string, FomcProbabilities>;
type BankerNotesMap = Record<string, BankerNote>;
type BiasMap = Record<Currency, CurrencyBias>;
type CentralBankNoteMap = Record<Currency, CentralBankNote>;

const OVERRIDES_KEY = 'macro-dashboard:overrides:v1';
const POINT_STAGES_KEY = 'macro-dashboard:point-stages:v1';
const SCORE_KEY = 'macro-dashboard:score:v1';
const FORECASTS_KEY = 'macro-dashboard:forecasts:v1';
const FOMC_WATCH_KEY = 'macro-dashboard:fomc-watch:v1';
const BANKER_NOTES_KEY = 'macro-dashboard:banker-notes:v1';
const HEADLINES_KEY = 'macro-dashboard:headlines:v1';
const BIAS_KEY = 'macro-dashboard:bias:v1';
const CENTRAL_BANK_NOTES_KEY = 'macro-dashboard:central-bank-notes:v1';
const REPORTS_KEY = 'macro-dashboard:reports:v1';
const MENTOR_NOTES_KEY = 'macro-dashboard:mentor-notes:v1';

function defaultBiasMap(): BiasMap {
  const map = {} as BiasMap;
  for (const currency of CURRENCIES) {
    map[currency] = {
      currency,
      centralBank: CENTRAL_BANK_BY_CURRENCY[currency],
      policyRate: '',
      current: { level: null, summary: '', reasons: [], startedAt: new Date().toISOString() },
      history: [],
    };
  }
  return map;
}

function defaultCentralBankNoteMap(): CentralBankNoteMap {
  const map = {} as CentralBankNoteMap;
  for (const currency of CURRENCIES) map[currency] = {};
  return map;
}

function loadLocalOverrides(): SeriesMap {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as SeriesMap) : {};
  } catch {
    return {};
  }
}

function loadLocalPointStages(): StageMap {
  try {
    const raw = localStorage.getItem(POINT_STAGES_KEY);
    return raw ? (JSON.parse(raw) as StageMap) : {};
  } catch {
    return {};
  }
}

function loadLocalScore(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    return raw ? (JSON.parse(raw) as ScoreRow[]) : SCORE_SEED;
  } catch {
    return SCORE_SEED;
  }
}

function loadLocalForecasts(): ForecastMap {
  try {
    const raw = localStorage.getItem(FORECASTS_KEY);
    return raw ? (JSON.parse(raw) as ForecastMap) : {};
  } catch {
    return {};
  }
}

function loadLocalFomcWatch(): FomcWatchMap {
  try {
    const raw = localStorage.getItem(FOMC_WATCH_KEY);
    return raw ? (JSON.parse(raw) as FomcWatchMap) : {};
  } catch {
    return {};
  }
}

function loadLocalBankerNotes(): BankerNotesMap {
  try {
    const raw = localStorage.getItem(BANKER_NOTES_KEY);
    return raw ? (JSON.parse(raw) as BankerNotesMap) : {};
  } catch {
    return {};
  }
}

function loadLocalHeadlines(): Headline[] {
  try {
    const raw = localStorage.getItem(HEADLINES_KEY);
    return raw ? (JSON.parse(raw) as Headline[]) : [];
  } catch {
    return [];
  }
}

function loadLocalBias(): BiasMap {
  try {
    const raw = localStorage.getItem(BIAS_KEY);
    return raw ? { ...defaultBiasMap(), ...(JSON.parse(raw) as BiasMap) } : defaultBiasMap();
  } catch {
    return defaultBiasMap();
  }
}

function loadLocalCentralBankNotes(): CentralBankNoteMap {
  try {
    const raw = localStorage.getItem(CENTRAL_BANK_NOTES_KEY);
    return raw ? { ...defaultCentralBankNoteMap(), ...(JSON.parse(raw) as CentralBankNoteMap) } : defaultCentralBankNoteMap();
  } catch {
    return defaultCentralBankNoteMap();
  }
}

function loadLocalReports(): DocumentEntry[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as DocumentEntry[]) : [];
  } catch {
    return [];
  }
}

function loadLocalMentorNotes(): DocumentEntry[] {
  try {
    const raw = localStorage.getItem(MENTOR_NOTES_KEY);
    return raw ? (JSON.parse(raw) as DocumentEntry[]) : [];
  } catch {
    return [];
  }
}

// Si el fetch a Supabase se queda colgado (sin resolver ni rechazar nunca —
// pasa con ciertos firewalls/proxies que descartan paquetes en silencio en
// vez de rechazar la conexión) el try/catch de refresh() no sirve de nada,
// porque no hay excepción que atrapar. Este timeout fuerza un rechazo
// después de N ms para que la app se rinda y muestre lo que tenga en vez de
// quedarse en "Cargando…" para siempre.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms) esperando ${label}`)), ms)),
  ]);
}

function mergeSeries(base: SeriesPoint[], overrides: SeriesPoint[]): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const [date, value] of base) map.set(date, value);
  for (const [date, value] of overrides) map.set(date, value);
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

// PostgREST (la API REST de Supabase) tiene un límite por página (db-max-rows,
// 1000 en este proyecto) — un solo .select() sin .range() se trunca en
// silencio, sin error, una vez que la tabla supera esa cantidad de filas. Con
// 41 indicadores USD + 20 EUR sincronizados mes a mes, indicator_overrides ya
// pasó los 1000 registros; sin paginar, los indicadores que quedan "después"
// del corte (según el orden que devuelva Postgres) se ven con menos
// historial del real, o directamente con el último dato de varios meses
// atrás. Se pagina hasta traer todas las filas.
async function fetchAllRows<T>(
  query: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

interface MacroDataContextValue {
  getSeries: (id: string) => SeriesPoint[];
  /** Puntos con override en Supabase, con su updated_at real (a diferencia de
   * SeriesPoint, que solo tiene fecha de período). Vacío en modo local. */
  recentUpdates: RecentUpdate[];
  addPoint: (id: string, date: string, value: number, stage?: 'preliminar' | 'final') => Promise<void>;
  removeLastPoint: (id: string) => Promise<void>;
  /** Etapa (preliminar/final) del último punto cargado a mano para este id,
   * si se especificó una al cargarlo. `undefined` si el último punto no
   * tiene etapa registrada (dato del seed histórico, o cargado antes de que
   * existiera este campo) — en ese caso el llamador debe usar
   * `IndicatorMeta.releaseStage` como valor por defecto. */
  getReleaseStage: (id: string) => 'preliminar' | 'final' | undefined;
  scoreRows: ScoreRow[];
  updateScoreValoracion: (id: string, valoracion: number) => Promise<void>;
  forecasts: ForecastMap;
  updateForecast: (id: string, value: number) => Promise<void>;
  fomcWatch: FomcWatchMap;
  updateFomcWatch: (meetingDate: string, probabilities: FomcProbabilities) => Promise<void>;
  bankerNotes: BankerNotesMap;
  addBankerStatement: (bankerId: string, statement: Statement) => Promise<void>;
  centralBankNotes: CentralBankNoteMap;
  updateCentralBankRateDecision: (currency: Currency, statement: Statement) => Promise<void>;
  updateCentralBankPressConference: (currency: Currency, statement: Statement) => Promise<void>;
  updateCentralBankInflationExpectations: (currency: Currency, text: string) => Promise<void>;
  updateCentralBankGrowthExpectations: (currency: Currency, text: string) => Promise<void>;
  headlines: Headline[];
  addManualHeadline: (headline: Omit<Headline, 'id' | 'isManual' | 'pinned'>) => Promise<void>;
  toggleHeadlinePin: (id: string, pinned: boolean) => Promise<void>;
  updateHeadlineImpact: (id: string, impact: ImpactLevel) => Promise<void>;
  deleteHeadline: (id: string) => Promise<void>;
  setHeadlineBiasCurrency: (id: string, currency: Currency | undefined) => Promise<void>;
  biases: BiasMap;
  updateBiasLevel: (currency: Currency, level: CurrencyBias['current']['level']) => Promise<void>;
  updateBiasSummary: (currency: Currency, summary: string) => Promise<void>;
  updateBiasBase: (currency: Currency, base: { centralBank: string; policyRate: string; nextMeeting?: string }) => Promise<void>;
  addBiasReason: (currency: Currency, reason: { label: string; color: BiasLevel; headlineId?: string }) => Promise<void>;
  removeBiasReason: (currency: Currency, reasonId: string) => Promise<void>;
  rolloverBias: (currency: Currency) => Promise<void>;
  reports: DocumentEntry[];
  addReport: (entry: Omit<DocumentEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  mentorNotes: DocumentEntry[];
  addMentorNote: (entry: Omit<DocumentEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteMentorNote: (id: string) => Promise<void>;
  uploadDocumentFile: (file: File) => Promise<{ url: string; name: string }>;
  resetOverrides: () => Promise<void>;
  exportJson: () => string;
  loading: boolean;
  syncMode: 'cloud' | 'local';
  /** true si la última carga desde Supabase falló o se colgó (timeout) —
   * distinto de `loading`, que ya se apagó en ese caso. Ver Layout.tsx: el
   * badge no debe decir "Sincronizado" cuando en realidad falló. */
  syncError: boolean;
  refresh: () => Promise<void>;
}

const MacroDataContext = createContext<MacroDataContextValue | null>(null);

export function MacroDataProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<SeriesMap>({});
  // Solo viene de Supabase (updated_at no existe en el JSON base) — usado por
  // la Pizarra Semanal para armar el feed de "qué se cargó esta semana".
  // Queda vacío en modo local (sin Supabase), la Pizarra lo explica.
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [pointStages, setPointStages] = useState<StageMap>({});
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>(SCORE_SEED);
  const [forecasts, setForecasts] = useState<ForecastMap>({});
  const [fomcWatch, setFomcWatch] = useState<FomcWatchMap>({});
  const [bankerNotes, setBankerNotes] = useState<BankerNotesMap>({});
  const [centralBankNotes, setCentralBankNotes] = useState<CentralBankNoteMap>(defaultCentralBankNoteMap());
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [biases, setBiases] = useState<BiasMap>(defaultBiasMap());
  const [reports, setReports] = useState<DocumentEntry[]>([]);
  const [mentorNotes, setMentorNotes] = useState<DocumentEntry[]>([]);
  const [loading, setLoading] = useState(supabaseEnabled);
  const [syncError, setSyncError] = useState(false);

  const base = historicalSeries as unknown as SeriesMap;

  const refresh = useCallback(async () => {
    if (!supabaseEnabled || !supabase) {
      setOverrides(loadLocalOverrides());
      setPointStages(loadLocalPointStages());
      setScoreRows(loadLocalScore());
      setForecasts(loadLocalForecasts());
      setFomcWatch(loadLocalFomcWatch());
      setBankerNotes(loadLocalBankerNotes());
      setCentralBankNotes(loadLocalCentralBankNotes());
      setHeadlines(loadLocalHeadlines());
      setBiases(loadLocalBias());
      setReports(loadLocalReports());
      setMentorNotes(loadLocalMentorNotes());
      setLoading(false);
      return;
    }

    const client = supabase;
    setSyncError(false);
    // Sin try/finally acá, un error de red (sin conexión, firewall/extensión
    // bloqueando supabase.co) tira el Promise.all y corta la función antes
    // de llegar al setLoading(false) de más abajo — el usuario se queda
    // viendo "Cargando…" para siempre en vez de degradar con lo que haya.
    try {
    const [pointsRows, scoreRes, forecastsRes, fomcRes, bankerRes, centralBankRes, headlinesRes, biasRes, biasReasonsRes, biasHistoryRes, reportsRes, mentorNotesRes] = await withTimeout(Promise.all([
      fetchAllRows<{ indicator_id: string; date: string; value: number; stage: 'preliminar' | 'final' | null; updated_at: string }>(async (from, to) =>
        client.from('indicator_overrides').select('indicator_id, date, value, stage, updated_at').range(from, to),
      ),
      supabase.from('score_overrides').select('id, valoracion'),
      supabase.from('indicator_forecasts').select('indicator_id, forecast'),
      supabase.from('fomc_watch').select('meeting_date, prob_cut, prob_hold, prob_hike, note'),
      // banker_statements, central_bank_notes y headlines son tablas nuevas —
      // si todavía no corriste el SQL en Supabase (ver supabase/schema.sql),
      // esto simplemente da error y se ignora, sin romper el resto de la carga.
      supabase
        .from('banker_statements')
        .select(
          'banker_id, current_statement_date, current_stance, current_summary, current_source_url, previous_statement_date, previous_stance, previous_summary, previous_source_url',
        ),
      supabase
        .from('central_bank_notes')
        .select(
          'currency, rate_decision_date, rate_decision_stance, rate_decision_summary, rate_decision_source_url, press_conference_date, press_conference_summary, press_conference_source_url, inflation_expectations, growth_expectations',
        ),
      supabase
        .from('headlines')
        .select('id, title, source, url, published_at, impact, tags, is_manual, pinned, bias_currency, title_es')
        .order('published_at', { ascending: false })
        .limit(300),
      supabase
        .from('currency_bias')
        .select('currency, central_bank, policy_rate, next_meeting, current_level, current_summary, current_started_at'),
      supabase.from('currency_bias_reasons').select('id, currency, label, color, headline_id').order('created_at', { ascending: true }),
      supabase
        .from('currency_bias_history')
        .select('id, currency, level, summary, reasons, started_at')
        .order('started_at', { ascending: false }),
      supabase.from('reports').select('id, title, text_content, file_url, file_name, created_at').order('created_at', { ascending: false }),
      supabase
        .from('mentor_notes')
        .select('id, title, text_content, file_url, file_name, created_at')
        .order('created_at', { ascending: false }),
    ]), 30000, 'la carga inicial de datos');

    {
      const map: SeriesMap = {};
      const stages: StageMap = {};
      const recent: RecentUpdate[] = [];
      for (const row of pointsRows) {
        (map[row.indicator_id] ??= []).push([row.date, row.value]);
        if (row.stage) (stages[row.indicator_id] ??= {})[row.date] = row.stage;
        recent.push({ indicatorId: row.indicator_id, date: row.date, value: row.value, updatedAt: row.updated_at });
      }
      setOverrides(map);
      setPointStages(stages);
      setRecentUpdates(recent);
    }

    if (!scoreRes.error && scoreRes.data && scoreRes.data.length > 0) {
      const overridesById = new Map(
        (scoreRes.data as { id: string; valoracion: number }[]).map((r) => [r.id, r.valoracion]),
      );
      setScoreRows(SCORE_SEED.map((row) => ({ ...row, valoracion: overridesById.get(row.id) ?? row.valoracion })));
    }

    if (!forecastsRes.error && forecastsRes.data) {
      const map: ForecastMap = {};
      for (const row of forecastsRes.data as { indicator_id: string; forecast: number }[]) {
        map[row.indicator_id] = row.forecast;
      }
      setForecasts(map);
    }

    if (!fomcRes.error && fomcRes.data) {
      const map: FomcWatchMap = {};
      for (const row of fomcRes.data as {
        meeting_date: string;
        prob_cut: number;
        prob_hold: number;
        prob_hike: number;
        note: string | null;
      }[]) {
        map[row.meeting_date] = {
          probCut: row.prob_cut,
          probHold: row.prob_hold,
          probHike: row.prob_hike,
          note: row.note ?? '',
        };
      }
      setFomcWatch(map);
    }

    if (!bankerRes.error && bankerRes.data) {
      const map: BankerNotesMap = {};
      for (const row of bankerRes.data as {
        banker_id: string;
        current_statement_date: string | null;
        current_stance: 'hawkish' | 'dovish' | 'neutral' | null;
        current_summary: string | null;
        current_source_url: string | null;
        previous_statement_date: string | null;
        previous_stance: 'hawkish' | 'dovish' | 'neutral' | null;
        previous_summary: string | null;
        previous_source_url: string | null;
      }[]) {
        map[row.banker_id] = {
          current: {
            date: row.current_statement_date ?? undefined,
            stance: row.current_stance ?? undefined,
            summary: row.current_summary ?? undefined,
            sourceUrl: row.current_source_url ?? undefined,
          },
          previous: {
            date: row.previous_statement_date ?? undefined,
            stance: row.previous_stance ?? undefined,
            summary: row.previous_summary ?? undefined,
            sourceUrl: row.previous_source_url ?? undefined,
          },
        };
      }
      setBankerNotes(map);
    }

    if (!centralBankRes.error && centralBankRes.data) {
      const map = defaultCentralBankNoteMap();
      for (const row of centralBankRes.data as {
        currency: Currency;
        rate_decision_date: string | null;
        rate_decision_stance: 'hawkish' | 'dovish' | 'neutral' | null;
        rate_decision_summary: string | null;
        rate_decision_source_url: string | null;
        press_conference_date: string | null;
        press_conference_summary: string | null;
        press_conference_source_url: string | null;
        inflation_expectations: string | null;
        growth_expectations: string | null;
      }[]) {
        map[row.currency] = {
          rateDecision: {
            date: row.rate_decision_date ?? undefined,
            stance: row.rate_decision_stance ?? undefined,
            summary: row.rate_decision_summary ?? undefined,
            sourceUrl: row.rate_decision_source_url ?? undefined,
          },
          pressConference: {
            date: row.press_conference_date ?? undefined,
            summary: row.press_conference_summary ?? undefined,
            sourceUrl: row.press_conference_source_url ?? undefined,
          },
          inflationExpectations: row.inflation_expectations ?? undefined,
          growthExpectations: row.growth_expectations ?? undefined,
        };
      }
      setCentralBankNotes(map);
    }

    if (!headlinesRes.error && headlinesRes.data) {
      const rows = headlinesRes.data as {
        id: string;
        title: string;
        source: string;
        url: string | null;
        published_at: string;
        impact: ImpactLevel;
        tags: string[];
        is_manual: boolean;
        pinned: boolean;
        bias_currency: Currency | null;
        title_es: string | null;
      }[];
      setHeadlines(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          source: r.source,
          url: r.url ?? undefined,
          publishedAt: r.published_at,
          impact: r.impact,
          tags: r.tags ?? [],
          isManual: r.is_manual,
          pinned: r.pinned,
          biasCurrency: r.bias_currency ?? undefined,
          titleEs: r.title_es ?? undefined,
        })),
      );
    }

    // currency_bias/currency_bias_reasons/reports/mentor_notes son tablas
    // nuevas (Panel de Control) — igual que banker_statements/headlines, si
    // todavía no corriste el SQL esto da error y se ignora sin romper el
    // resto de la carga.
    if (!biasRes.error && !biasReasonsRes.error) {
      const baseRows = (biasRes.data ?? []) as {
        currency: Currency;
        central_bank: string;
        policy_rate: string;
        next_meeting: string | null;
        current_level: CurrencyBias['current']['level'];
        current_summary: string | null;
        current_started_at: string;
      }[];
      const reasonRows = (biasReasonsRes.data ?? []) as {
        id: string;
        currency: Currency;
        label: string;
        color: BiasLevel;
        headline_id: string | null;
      }[];
      const historyRows = (!biasHistoryRes.error ? (biasHistoryRes.data ?? []) : []) as {
        id: string;
        currency: Currency;
        level: CurrencyBias['current']['level'];
        summary: string | null;
        reasons: BiasReason[] | null;
        started_at: string;
      }[];
      const map = defaultBiasMap();
      for (const row of baseRows) {
        map[row.currency] = {
          currency: row.currency,
          centralBank: row.central_bank || CENTRAL_BANK_BY_CURRENCY[row.currency],
          policyRate: row.policy_rate,
          nextMeeting: row.next_meeting ?? undefined,
          current: {
            level: row.current_level,
            summary: row.current_summary ?? '',
            startedAt: row.current_started_at,
            reasons: [],
          },
          history: [],
        };
      }
      for (const r of reasonRows) {
        const entry = map[r.currency];
        if (!entry) continue;
        entry.current.reasons.push({ id: r.id, label: r.label, color: r.color, headlineId: r.headline_id ?? undefined });
      }
      for (const h of historyRows) {
        const entry = map[h.currency];
        if (!entry) continue;
        entry.history.push({ id: h.id, level: h.level, summary: h.summary ?? '', startedAt: h.started_at, reasons: h.reasons ?? [] });
      }
      setBiases(map);
    }

    if (!reportsRes.error && reportsRes.data) {
      const rows = reportsRes.data as { id: string; title: string; text_content: string | null; file_url: string | null; file_name: string | null; created_at: string }[];
      setReports(
        rows.map((r) => ({ id: r.id, title: r.title, text: r.text_content ?? undefined, fileUrl: r.file_url ?? undefined, fileName: r.file_name ?? undefined, createdAt: r.created_at })),
      );
    }

    if (!mentorNotesRes.error && mentorNotesRes.data) {
      const rows = mentorNotesRes.data as { id: string; title: string; text_content: string | null; file_url: string | null; file_name: string | null; created_at: string }[];
      setMentorNotes(
        rows.map((r) => ({ id: r.id, title: r.title, text: r.text_content ?? undefined, fileUrl: r.file_url ?? undefined, fileName: r.file_name ?? undefined, createdAt: r.created_at })),
      );
    }

    } catch (error) {
      console.error('Error al sincronizar con Supabase:', error);
      setSyncError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const getSeries = useCallback(
    (id: string) => mergeSeries(base[id] ?? [], overrides[id] ?? []),
    [base, overrides],
  );

  const addPoint = useCallback(async (id: string, date: string, value: number, stage?: 'preliminar' | 'final') => {
    if (supabaseEnabled && supabase) {
      await supabase.from('indicator_overrides').upsert({ indicator_id: id, date, value, stage: stage ?? null });
    }
    setOverrides((prev) => {
      const next = { ...prev, [id]: [...(prev[id] ?? []).filter(([d]) => d !== date), [date, value] as SeriesPoint] };
      if (!supabaseEnabled) localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
    setPointStages((prev) => {
      const forId = { ...(prev[id] ?? {}) };
      if (stage) forId[date] = stage;
      else delete forId[date];
      const next = { ...prev, [id]: forId };
      if (!supabaseEnabled) localStorage.setItem(POINT_STAGES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeLastPoint = useCallback(async (id: string) => {
    setOverrides((prev) => {
      const list = prev[id] ?? [];
      if (list.length === 0) return prev;
      const sorted = [...list].sort(([a], [b]) => a.localeCompare(b));
      const removedDate = sorted[sorted.length - 1][0];
      const next = { ...prev, [id]: list.filter(([d]) => d !== removedDate) };
      if (supabaseEnabled && supabase) {
        supabase.from('indicator_overrides').delete().eq('indicator_id', id).eq('date', removedDate);
      } else {
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      }
      setPointStages((prevStages) => {
        const forId = { ...(prevStages[id] ?? {}) };
        delete forId[removedDate];
        const nextStages = { ...prevStages, [id]: forId };
        if (!supabaseEnabled) localStorage.setItem(POINT_STAGES_KEY, JSON.stringify(nextStages));
        return nextStages;
      });
      return next;
    });
  }, []);

  const getReleaseStage = useCallback(
    (id: string): 'preliminar' | 'final' | undefined => {
      const points = mergeSeries(base[id] ?? [], overrides[id] ?? []);
      const last = points[points.length - 1];
      if (!last) return undefined;
      return pointStages[id]?.[last[0]];
    },
    [base, overrides, pointStages],
  );

  const updateScoreValoracion = useCallback(async (id: string, valoracion: number) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('score_overrides').upsert({ id, valoracion });
    }
    setScoreRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, valoracion } : r));
      if (!supabaseEnabled) localStorage.setItem(SCORE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateForecast = useCallback(async (id: string, value: number) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('indicator_forecasts').upsert({ indicator_id: id, forecast: value });
    }
    setForecasts((prev) => {
      const next = { ...prev, [id]: value };
      if (!supabaseEnabled) localStorage.setItem(FORECASTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateFomcWatch = useCallback(async (meetingDate: string, probabilities: FomcProbabilities) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('fomc_watch').upsert({
        meeting_date: meetingDate,
        prob_cut: probabilities.probCut,
        prob_hold: probabilities.probHold,
        prob_hike: probabilities.probHike,
        note: probabilities.note || null,
      });
    }
    setFomcWatch((prev) => {
      const next = { ...prev, [meetingDate]: probabilities };
      if (!supabaseEnabled) localStorage.setItem(FOMC_WATCH_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Guarda un comunicado nuevo: lo que era "actual" pasa a "anterior" (mismo
  // patrón que Anterior/Actual en el resto del dashboard), para poder ver si
  // cambió la postura del banquero de un comunicado al siguiente.
  const addBankerStatement = useCallback(
    async (bankerId: string, statement: Statement) => {
      const nextNote: BankerNote = { current: statement, previous: bankerNotes[bankerId]?.current };
      if (supabaseEnabled && supabase) {
        await supabase.from('banker_statements').upsert({
          banker_id: bankerId,
          current_statement_date: nextNote.current?.date || null,
          current_stance: nextNote.current?.stance || null,
          current_summary: nextNote.current?.summary || null,
          current_source_url: nextNote.current?.sourceUrl || null,
          previous_statement_date: nextNote.previous?.date || null,
          previous_stance: nextNote.previous?.stance || null,
          previous_summary: nextNote.previous?.summary || null,
          previous_source_url: nextNote.previous?.sourceUrl || null,
        });
      }
      setBankerNotes((prev) => {
        const next = { ...prev, [bankerId]: nextNote };
        if (!supabaseEnabled) localStorage.setItem(BANKER_NOTES_KEY, JSON.stringify(next));
        return next;
      });
    },
    [bankerNotes],
  );

  // Apartado "Banco Central" del Resumen — a diferencia de addBankerStatement
  // (arriba), acá solo se guarda "lo último" de cada campo, no un
  // current/previous, porque el usuario pidió "las últimas declaraciones",
  // no un historial de cambios de postura como con los banqueros.
  const saveCentralBankNote = useCallback(
    async (currency: Currency, patch: Partial<CentralBankNote>) => {
      const nextNote: CentralBankNote = { ...centralBankNotes[currency], ...patch };
      if (supabaseEnabled && supabase) {
        await supabase.from('central_bank_notes').upsert({
          currency,
          rate_decision_date: nextNote.rateDecision?.date || null,
          rate_decision_stance: nextNote.rateDecision?.stance || null,
          rate_decision_summary: nextNote.rateDecision?.summary || null,
          rate_decision_source_url: nextNote.rateDecision?.sourceUrl || null,
          press_conference_date: nextNote.pressConference?.date || null,
          press_conference_summary: nextNote.pressConference?.summary || null,
          press_conference_source_url: nextNote.pressConference?.sourceUrl || null,
          inflation_expectations: nextNote.inflationExpectations || null,
          growth_expectations: nextNote.growthExpectations || null,
        });
      }
      setCentralBankNotes((prev) => {
        const next = { ...prev, [currency]: nextNote };
        if (!supabaseEnabled) localStorage.setItem(CENTRAL_BANK_NOTES_KEY, JSON.stringify(next));
        return next;
      });
    },
    [centralBankNotes],
  );

  const updateCentralBankRateDecision = useCallback(
    (currency: Currency, statement: Statement) => saveCentralBankNote(currency, { rateDecision: statement }),
    [saveCentralBankNote],
  );
  const updateCentralBankPressConference = useCallback(
    (currency: Currency, statement: Statement) => saveCentralBankNote(currency, { pressConference: statement }),
    [saveCentralBankNote],
  );
  const updateCentralBankInflationExpectations = useCallback(
    (currency: Currency, text: string) => saveCentralBankNote(currency, { inflationExpectations: text }),
    [saveCentralBankNote],
  );
  const updateCentralBankGrowthExpectations = useCallback(
    (currency: Currency, text: string) => saveCentralBankNote(currency, { growthExpectations: text }),
    [saveCentralBankNote],
  );

  const addManualHeadline = useCallback(async (headline: Omit<Headline, 'id' | 'isManual' | 'pinned'>) => {
    const next: Headline = { ...headline, id: crypto.randomUUID(), isManual: true, pinned: false };
    if (supabaseEnabled && supabase) {
      await supabase.from('headlines').insert({
        id: next.id,
        title: next.title,
        source: next.source,
        url: next.url || null,
        published_at: next.publishedAt,
        impact: next.impact,
        tags: next.tags,
        is_manual: true,
        pinned: false,
      });
    }
    setHeadlines((prev) => {
      const updated = [next, ...prev];
      if (!supabaseEnabled) localStorage.setItem(HEADLINES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleHeadlinePin = useCallback(async (id: string, pinned: boolean) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('headlines').update({ pinned }).eq('id', id);
    }
    setHeadlines((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, pinned } : h));
      if (!supabaseEnabled) localStorage.setItem(HEADLINES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateHeadlineImpact = useCallback(async (id: string, impact: ImpactLevel) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('headlines').update({ impact }).eq('id', id);
    }
    setHeadlines((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, impact } : h));
      if (!supabaseEnabled) localStorage.setItem(HEADLINES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteHeadline = useCallback(async (id: string) => {
    if (supabaseEnabled && supabase) {
      await supabase.from('headlines').delete().eq('id', id);
    }
    setHeadlines((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      if (!supabaseEnabled) localStorage.setItem(HEADLINES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Fijar un titular a la divisa de una tarjeta de Sesgo: siempre implica
  // pinned=true (aparece también en la cinta) y crea/borra el motivo de la
  // semana en curso vinculado a ese titular (headlineId). Desfijar de la
  // divisa no desfija de la cinta — son dos cosas independientes una vez
  // fijado.
  // Nota general de estas funciones (y las de sesgo/informes/mentor de abajo):
  // el estado local se actualiza PRIMERO, de forma síncrona, y recién después
  // se dispara el guardado en Supabase (sin esperarlo, con try/catch). Si se
  // hace al revés (esperar el viaje a Supabase antes de tocar el estado), un
  // <input>/<textarea> controlado que dependa de ese estado deja de aceptar
  // texto en la práctica: cada tecla se revierte visualmente hasta que la red
  // responde, o directamente nunca si la llamada falla (RLS, tabla sin migrar,
  // etc.) — eso es lo que reportó el usuario ("no me deja escribir").
  const setHeadlineBiasCurrency = useCallback(
    async (id: string, currency: Currency | undefined) => {
      const headline = headlines.find((h) => h.id === id);
      if (!headline) return;
      const prevCurrency = headline.biasCurrency;
      const reasonId = crypto.randomUUID();

      setHeadlines((prev) => {
        const updated = prev.map((h) => (h.id === id ? { ...h, biasCurrency: currency, pinned: currency ? true : h.pinned } : h));
        if (!supabaseEnabled) localStorage.setItem(HEADLINES_KEY, JSON.stringify(updated));
        return updated;
      });

      setBiases((prev) => {
        let next = prev;
        if (prevCurrency && prevCurrency !== currency) {
          next = {
            ...next,
            [prevCurrency]: {
              ...next[prevCurrency],
              current: { ...next[prevCurrency].current, reasons: next[prevCurrency].current.reasons.filter((r) => r.headlineId !== id) },
            },
          };
        }
        if (currency) {
          const reason: BiasReason = { id: reasonId, label: headline.title, color: 'neutral', headlineId: id };
          next = {
            ...next,
            [currency]: { ...next[currency], current: { ...next[currency].current, reasons: [...next[currency].current.reasons, reason] } },
          };
        }
        if (!supabaseEnabled) localStorage.setItem(BIAS_KEY, JSON.stringify(next));
        return next;
      });

      if (!supabaseEnabled || !supabase) return;
      try {
        await supabase.from('headlines').update({ bias_currency: currency ?? null, pinned: currency ? true : headline.pinned }).eq('id', id);
        if (prevCurrency && prevCurrency !== currency) {
          await supabase.from('currency_bias_reasons').delete().eq('headline_id', id).eq('currency', prevCurrency);
        }
        if (currency) {
          await supabase.from('currency_bias_reasons').insert({ id: reasonId, currency, label: headline.title, color: 'neutral', headline_id: id });
        }
      } catch (err) {
        console.error('No se pudo guardar el fijado a divisa en Supabase', err);
      }
    },
    [headlines],
  );

  const updateBiasLevel = useCallback(async (currency: Currency, level: CurrencyBias['current']['level']) => {
    setBiases((prev) => {
      const next = { ...prev, [currency]: { ...prev[currency], current: { ...prev[currency].current, level } } };
      if (!supabaseEnabled) localStorage.setItem(BIAS_KEY, JSON.stringify(next));
      return next;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('currency_bias').upsert({ currency, current_level: level }, { onConflict: 'currency' });
    } catch (err) {
      console.error('No se pudo guardar el sesgo en Supabase', err);
    }
  }, []);

  const updateBiasSummary = useCallback(async (currency: Currency, summary: string) => {
    setBiases((prev) => {
      const next = { ...prev, [currency]: { ...prev[currency], current: { ...prev[currency].current, summary } } };
      if (!supabaseEnabled) localStorage.setItem(BIAS_KEY, JSON.stringify(next));
      return next;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('currency_bias').upsert({ currency, current_summary: summary }, { onConflict: 'currency' });
    } catch (err) {
      console.error('No se pudo guardar el resumen del sesgo en Supabase', err);
    }
  }, []);

  const updateBiasBase = useCallback(
    async (currency: Currency, base: { centralBank: string; policyRate: string; nextMeeting?: string }) => {
      setBiases((prev) => {
        const next = { ...prev, [currency]: { ...prev[currency], ...base } };
        if (!supabaseEnabled) localStorage.setItem(BIAS_KEY, JSON.stringify(next));
        return next;
      });
      if (!supabaseEnabled || !supabase) return;
      try {
        await supabase
          .from('currency_bias')
          .upsert(
            { currency, central_bank: base.centralBank, policy_rate: base.policyRate, next_meeting: base.nextMeeting || null },
            { onConflict: 'currency' },
          );
      } catch (err) {
        console.error('No se pudieron guardar los datos base del sesgo en Supabase', err);
      }
    },
    [],
  );

  const addBiasReason = useCallback(
    async (currency: Currency, reason: { label: string; color: BiasLevel; headlineId?: string }) => {
      const id = crypto.randomUUID();
      const next: BiasReason = { id, ...reason };
      setBiases((prev) => {
        const updated = {
          ...prev,
          [currency]: { ...prev[currency], current: { ...prev[currency].current, reasons: [...prev[currency].current.reasons, next] } },
        };
        if (!supabaseEnabled) localStorage.setItem(BIAS_KEY, JSON.stringify(updated));
        return updated;
      });
      if (!supabaseEnabled || !supabase) return;
      try {
        await supabase.from('currency_bias_reasons').insert({ id, currency, label: next.label, color: next.color, headline_id: next.headlineId ?? null });
      } catch (err) {
        console.error('No se pudo guardar el motivo del sesgo en Supabase', err);
      }
    },
    [],
  );

  const removeBiasReason = useCallback(async (currency: Currency, reasonId: string) => {
    setBiases((prev) => {
      const updated = {
        ...prev,
        [currency]: { ...prev[currency], current: { ...prev[currency].current, reasons: prev[currency].current.reasons.filter((r) => r.id !== reasonId) } },
      };
      if (!supabaseEnabled) localStorage.setItem(BIAS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('currency_bias_reasons').delete().eq('id', reasonId);
    } catch (err) {
      console.error('No se pudo borrar el motivo del sesgo en Supabase', err);
    }
  }, []);

  // Botón "Actualizar sesgo": rollover semanal. Archiva la semana actual como
  // una fila nueva en el historial (con sus motivos congelados) y arranca
  // una semana en blanco — el badge grande no se toca acá, se elige aparte
  // (se puede cambiar en cualquier momento, no solo los fines de semana).
  const rolloverBias = useCallback(
    async (currency: Currency) => {
      const bias = biases[currency];
      if (!bias) return;
      const archivedCurrent = bias.current;
      const archivedId = crypto.randomUUID();
      const newStartedAt = new Date().toISOString();

      setBiases((prev) => {
        const next = {
          ...prev,
          [currency]: {
            ...prev[currency],
            history: [{ ...archivedCurrent, id: archivedId }, ...prev[currency].history],
            current: { level: archivedCurrent.level, summary: '', reasons: [], startedAt: newStartedAt },
          },
        };
        if (!supabaseEnabled) localStorage.setItem(BIAS_KEY, JSON.stringify(next));
        return next;
      });

      if (!supabaseEnabled || !supabase) return;
      try {
        await supabase.from('currency_bias_history').insert({
          id: archivedId,
          currency,
          level: archivedCurrent.level,
          summary: archivedCurrent.summary,
          reasons: archivedCurrent.reasons,
          started_at: archivedCurrent.startedAt,
        });
        await supabase.from('currency_bias').upsert(
          { currency, current_level: archivedCurrent.level, current_summary: '', current_started_at: newStartedAt },
          { onConflict: 'currency' },
        );
        await supabase.from('currency_bias_reasons').delete().eq('currency', currency);
      } catch (err) {
        console.error('No se pudo actualizar el sesgo en Supabase', err);
      }
    },
    [biases],
  );

  const uploadDocumentFile = useCallback(async (file: File) => {
    if (!supabaseEnabled || !supabase) {
      throw new Error('La carga de archivos necesita Supabase configurado — sin eso, cargá el resumen como texto.');
    }
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return { url: data.publicUrl, name: file.name };
  }, []);

  const addReport = useCallback(async (entry: Omit<DocumentEntry, 'id' | 'createdAt'>) => {
    const next: DocumentEntry = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setReports((prev) => {
      const updated = [next, ...prev];
      if (!supabaseEnabled) localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('reports').insert({ id: next.id, title: next.title, text_content: next.text || null, file_url: next.fileUrl || null, file_name: next.fileName || null });
    } catch (err) {
      console.error('No se pudo guardar el informe en Supabase', err);
    }
  }, []);

  const deleteReport = useCallback(async (id: string) => {
    setReports((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (!supabaseEnabled) localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('reports').delete().eq('id', id);
    } catch (err) {
      console.error('No se pudo borrar el informe en Supabase', err);
    }
  }, []);

  const addMentorNote = useCallback(async (entry: Omit<DocumentEntry, 'id' | 'createdAt'>) => {
    const next: DocumentEntry = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setMentorNotes((prev) => {
      const updated = [next, ...prev];
      if (!supabaseEnabled) localStorage.setItem(MENTOR_NOTES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('mentor_notes').insert({ id: next.id, title: next.title, text_content: next.text || null, file_url: next.fileUrl || null, file_name: next.fileName || null });
    } catch (err) {
      console.error('No se pudo guardar el resumen del mentor en Supabase', err);
    }
  }, []);

  const deleteMentorNote = useCallback(async (id: string) => {
    setMentorNotes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (!supabaseEnabled) localStorage.setItem(MENTOR_NOTES_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('mentor_notes').delete().eq('id', id);
    } catch (err) {
      console.error('No se pudo borrar el resumen del mentor en Supabase', err);
    }
  }, []);

  const resetOverrides = useCallback(async () => {
    if (supabaseEnabled && supabase) {
      await supabase.from('indicator_overrides').delete().neq('indicator_id', '');
      await supabase.from('score_overrides').delete().neq('id', '');
      await supabase.from('indicator_forecasts').delete().neq('indicator_id', '');
      await supabase.from('fomc_watch').delete().not('meeting_date', 'is', null);
      await supabase.from('banker_statements').delete().neq('banker_id', '');
    } else {
      localStorage.removeItem(OVERRIDES_KEY);
      localStorage.removeItem(SCORE_KEY);
      localStorage.removeItem(FORECASTS_KEY);
      localStorage.removeItem(FOMC_WATCH_KEY);
      localStorage.removeItem(BANKER_NOTES_KEY);
    }
    setOverrides({});
    setScoreRows(SCORE_SEED);
    setForecasts({});
    setFomcWatch({});
    setBankerNotes({});
  }, []);

  const exportJson = useCallback(() => {
    const merged: SeriesMap = {};
    for (const id of Object.keys(base)) merged[id] = mergeSeries(base[id] ?? [], overrides[id] ?? []);
    for (const id of Object.keys(overrides)) if (!merged[id]) merged[id] = mergeSeries([], overrides[id]);
    return JSON.stringify(merged, null, 2);
  }, [base, overrides]);

  const value = useMemo(
    () => ({
      getSeries,
      recentUpdates,
      addPoint,
      removeLastPoint,
      getReleaseStage,
      scoreRows,
      updateScoreValoracion,
      forecasts,
      updateForecast,
      fomcWatch,
      updateFomcWatch,
      bankerNotes,
      addBankerStatement,
      centralBankNotes,
      updateCentralBankRateDecision,
      updateCentralBankPressConference,
      updateCentralBankInflationExpectations,
      updateCentralBankGrowthExpectations,
      headlines,
      addManualHeadline,
      toggleHeadlinePin,
      updateHeadlineImpact,
      deleteHeadline,
      setHeadlineBiasCurrency,
      biases,
      updateBiasLevel,
      updateBiasSummary,
      updateBiasBase,
      addBiasReason,
      removeBiasReason,
      rolloverBias,
      reports,
      addReport,
      deleteReport,
      mentorNotes,
      addMentorNote,
      deleteMentorNote,
      uploadDocumentFile,
      resetOverrides,
      exportJson,
      loading,
      syncMode: (supabaseEnabled ? 'cloud' : 'local') as 'cloud' | 'local',
      syncError,
      refresh,
    }),
    [
      getSeries,
      recentUpdates,
      addPoint,
      removeLastPoint,
      getReleaseStage,
      scoreRows,
      updateScoreValoracion,
      forecasts,
      updateForecast,
      fomcWatch,
      updateFomcWatch,
      bankerNotes,
      addBankerStatement,
      centralBankNotes,
      updateCentralBankRateDecision,
      updateCentralBankPressConference,
      updateCentralBankInflationExpectations,
      updateCentralBankGrowthExpectations,
      headlines,
      addManualHeadline,
      toggleHeadlinePin,
      updateHeadlineImpact,
      deleteHeadline,
      setHeadlineBiasCurrency,
      biases,
      updateBiasLevel,
      updateBiasSummary,
      updateBiasBase,
      addBiasReason,
      removeBiasReason,
      rolloverBias,
      reports,
      addReport,
      deleteReport,
      mentorNotes,
      addMentorNote,
      deleteMentorNote,
      uploadDocumentFile,
      resetOverrides,
      exportJson,
      loading,
      syncError,
      refresh,
    ],
  );

  return <MacroDataContext.Provider value={value}>{children}</MacroDataContext.Provider>;
}

export function useMacroData() {
  const ctx = useContext(MacroDataContext);
  if (!ctx) throw new Error('useMacroData must be used within MacroDataProvider');
  return ctx;
}
