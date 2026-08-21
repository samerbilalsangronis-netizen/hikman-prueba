import { Fragment, useState } from 'react';
import { INDICATORS, SECTION_LABELS } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { formatValue, formatDate } from '../lib/format';
import { getFreshness } from '../lib/freshness';
import { FreshnessBadge } from '../components/FreshnessBadge';
import { groupByParent } from '../lib/indicatorGroups';
import {
  FRED_MAPPINGS,
  CBBS_MAPPING,
  EUR_FRED_MAPPINGS,
  EUR_EUROSTAT_INDICATOR_ID,
  EUR_HICP_FPD_INDICATOR_IDS,
  EUR_NAMQ_GDP_INDICATOR_IDS,
  GBP_BOE_INDICATOR_ID,
  GBP_TRADE_BALANCE_INDICATOR_ID,
  CAD_AUTO_INDICATOR_IDS,
  AUD_AUTO_INDICATOR_IDS,
  NZD_AUTO_INDICATOR_IDS,
  JPY_AUTO_INDICATOR_IDS,
  CHF_AUTO_INDICATOR_IDS,
  CNY_AUTO_INDICATOR_IDS,
} from '../data/fredMappings';
import { upcomingFomcMeetings } from '../data/fomcMeetings';

const FRED_COVERED = new Set([...FRED_MAPPINGS.map((m) => m.indicatorId), CBBS_MAPPING.indicatorId]);
const EUR_AUTO_COVERED = new Set([
  ...EUR_FRED_MAPPINGS.map((m) => m.indicatorId),
  EUR_EUROSTAT_INDICATOR_ID,
  ...EUR_HICP_FPD_INDICATOR_IDS,
  ...EUR_NAMQ_GDP_INDICATOR_IDS,
]);
const EUR_HICP_FPD_COVERED = new Set([...EUR_HICP_FPD_INDICATOR_IDS, ...EUR_NAMQ_GDP_INDICATOR_IDS]);
const GBP_AUTO_COVERED = new Set([GBP_BOE_INDICATOR_ID, GBP_TRADE_BALANCE_INDICATOR_ID]);
const CAD_AUTO_COVERED = new Set(CAD_AUTO_INDICATOR_IDS);
const AUD_AUTO_COVERED = new Set(AUD_AUTO_INDICATOR_IDS);
const NZD_AUTO_COVERED = new Set(NZD_AUTO_INDICATOR_IDS);
const JPY_AUTO_COVERED = new Set(JPY_AUTO_INDICATOR_IDS);
const CHF_AUTO_COVERED = new Set(CHF_AUTO_INDICATOR_IDS);
const CNY_AUTO_COVERED = new Set(CNY_AUTO_INDICATOR_IDS);

// "Hoy" en UTC-4 (hora del usuario), no en UTC del navegador/servidor —
// pedido explícito: cerca de la medianoche UTC, new Date().toISOString()
// ya mostraba el día siguiente mientras en UTC-4 seguía siendo el día
// anterior (ej. cargando a las 21:xx UTC-4 del 20-ago, que son las 01:xx
// UTC del 21-ago).
function todayUtcMinus4(): string {
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

function IndicatorRow({ id, isChild = false }: { id: string; isChild?: boolean }) {
  const meta = INDICATORS.find((m) => m.id === id)!;
  const { getSeries, addPoint, removeLastPoint, forecasts, updateForecast, clearForecast, getReleaseStage } = useMacroData();
  const points = getSeries(id);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const freshness = getFreshness(points, meta.frequency);
  const today = todayUtcMinus4();
  const [date, setDate] = useState(today);
  const [publishedDateInput, setPublishedDateInput] = useState(today);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [forecastInput, setForecastInput] = useState('');
  const [savingForecast, setSavingForecast] = useState(false);
  const [clearingForecast, setClearingForecast] = useState(false);

  // Etapa del último punto realmente cargado (si se especificó una) — cae a
  // la etapa fija del indicador para los que todavía no cargaron nada con
  // este campo. Ver IndicatorMeta.releaseStage en types.ts.
  const currentStage = getReleaseStage(id) ?? meta.releaseStage;
  // Para el próximo punto a cargar, arrancamos sugiriendo lo opuesto al
  // último (preliminar → final → preliminar → …), que es la secuencia que
  // siguen los reportes que trackean ambas vueltas.
  const [stageInput, setStageInput] = useState<'preliminar' | 'final'>(
    currentStage === 'preliminar' ? 'final' : 'preliminar',
  );

  const isPercentFormat = meta.format === 'pct' || meta.format === 'pct1';
  const isFred =
    FRED_COVERED.has(id) ||
    EUR_AUTO_COVERED.has(id) ||
    GBP_AUTO_COVERED.has(id) ||
    CAD_AUTO_COVERED.has(id) ||
    AUD_AUTO_COVERED.has(id) ||
    NZD_AUTO_COVERED.has(id) ||
    JPY_AUTO_COVERED.has(id) ||
    CHF_AUTO_COVERED.has(id) ||
    CNY_AUTO_COVERED.has(id);
  const currentForecast = forecasts[id];

  async function handleSave() {
    const raw = parseFloat(value);
    if (Number.isNaN(raw)) return;
    const stored = isPercentFormat ? raw / 100 : raw;
    setSaving(true);
    await addPoint(id, date, stored, meta.releaseStage ? stageInput : undefined, publishedDateInput || undefined);
    setSaving(false);
    setValue('');
    if (meta.releaseStage) setStageInput(stageInput === 'preliminar' ? 'final' : 'preliminar');
  }

  async function handleSaveForecast() {
    const raw = parseFloat(forecastInput);
    if (Number.isNaN(raw)) return;
    const stored = isPercentFormat ? raw / 100 : raw;
    setSavingForecast(true);
    await updateForecast(id, stored);
    setSavingForecast(false);
    setForecastInput('');
  }

  async function handleClearForecast() {
    setClearingForecast(true);
    await clearForecast(id);
    setClearingForecast(false);
    setForecastInput('');
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="py-2.5 pr-3" style={isChild ? { paddingLeft: '1.5rem' } : undefined}>
        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {isChild && (
            <span style={{ color: 'var(--text-muted)' }} aria-hidden>
              ↳
            </span>
          )}
          {meta.label}
          {isFred && (
            <span
              className="rounded px-1 py-0.5 text-[10px] font-semibold"
              style={{ color: 'var(--series-1)', border: '1px solid var(--border)' }}
              title={
                EUR_HICP_FPD_COVERED.has(id)
                  ? 'Se sincroniza automáticamente desde Eurostat'
                  : id === EUR_EUROSTAT_INDICATOR_ID
                    ? 'Se sincroniza automáticamente desde Eurostat'
                    : id === GBP_BOE_INDICATOR_ID
                    ? 'Se sincroniza automáticamente desde el Banco de Inglaterra'
                    : CAD_AUTO_COVERED.has(id)
                      ? 'Se sincroniza automáticamente desde StatCan / Bank of Canada'
                      : AUD_AUTO_COVERED.has(id)
                        ? 'Se sincroniza automáticamente desde ABS / RBA'
                        : NZD_AUTO_COVERED.has(id)
                          ? 'Se sincroniza automáticamente desde Stats NZ'
                          : JPY_AUTO_COVERED.has(id)
                            ? 'Se sincroniza automáticamente desde e-Stat / BOJ / Aduanas de Japón'
                            : CHF_AUTO_COVERED.has(id)
                              ? 'Se sincroniza automáticamente desde el SNB Data Portal / SECO / KOF'
                              : CNY_AUTO_COVERED.has(id)
                                ? 'Se sincroniza automáticamente desde chinadata.live (NBS/GACC, agregador no oficial)'
                                : 'Se sincroniza automáticamente desde FRED'
              }
            >
              {EUR_HICP_FPD_COVERED.has(id)
                ? 'EUROSTAT'
                : id === EUR_EUROSTAT_INDICATOR_ID
                ? 'EUROSTAT'
                : id === GBP_BOE_INDICATOR_ID
                  ? 'BOE'
                  : CAD_AUTO_COVERED.has(id)
                    ? 'STATCAN'
                    : AUD_AUTO_COVERED.has(id)
                      ? 'ABS'
                      : NZD_AUTO_COVERED.has(id)
                        ? 'STATS NZ'
                        : JPY_AUTO_COVERED.has(id)
                          ? 'E-STAT'
                          : CHF_AUTO_COVERED.has(id)
                            ? 'SNB'
                            : CNY_AUTO_COVERED.has(id)
                              ? 'NBS'
                              : 'FRED'}
            </span>
          )}
          {currentStage && (
            <span
              className="rounded px-1 py-0.5 text-[10px] font-semibold uppercase"
              style={{
                color: currentStage === 'preliminar' ? 'var(--status-warning)' : 'var(--text-muted)',
                border: `1px solid ${currentStage === 'preliminar' ? 'var(--status-warning)' : 'var(--text-muted)'}`,
              }}
              title={
                currentStage === 'preliminar'
                  ? 'Lectura preliminar/adelantada — la fuente publica una revisión posterior de este mismo dato.'
                  : 'Lectura final/revisada — la fuente publicó antes una versión preliminar de este mismo dato.'
              }
            >
              {currentStage === 'preliminar' ? 'Preliminar' : 'Final'}
            </span>
          )}
        </div>
        <div className="mt-0.5">
          <FreshnessBadge freshness={freshness} />
        </div>
      </td>
      <td className="py-2.5 pr-3 text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {prev ? formatValue(prev[1], meta.format) : '—'}
      </td>
      <td className="py-2.5 pr-3 text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {last ? formatValue(last[1], meta.format) : '—'}
        <div className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>
          {last?.[0] ?? 'sin dato'}
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="any"
            value={forecastInput}
            onChange={(e) => setForecastInput(e.target.value)}
            placeholder={currentForecast !== undefined ? formatValue(currentForecast, meta.format) : isPercentFormat ? '%' : 'valor'}
            className="w-20 rounded-md px-2 py-1 text-sm tabular-nums"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleSaveForecast}
            disabled={forecastInput === '' || savingForecast}
            className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-40"
            style={{ color: 'var(--series-5)', border: '1px solid var(--border)' }}
          >
            {savingForecast ? '…' : 'OK'}
          </button>
          {currentForecast !== undefined && (
            <button
              onClick={handleClearForecast}
              disabled={clearingForecast}
              title="Quitar la previsión — el próximo release no tiene forecast de consenso"
              className="rounded-md px-1.5 py-1 text-xs font-semibold disabled:opacity-40"
              style={{ color: 'var(--status-critical)', border: '1px solid var(--border)' }}
            >
              {clearingForecast ? '…' : '✕'}
            </button>
          )}
        </div>
      </td>
      {isFred ? (
        <td className="py-2.5 text-xs" style={{ color: 'var(--text-muted)' }} colSpan={2}>
          Se sincroniza solo cada 30 minutos (GitHub Actions) — no requiere carga manual.
        </td>
      ) : (
        <>
          <td className="py-2.5 pr-3">
            <div className="flex items-end gap-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Período
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  title="Fecha del dato — el período al que corresponde (ej. 01/07/2026 para el CPI de julio)"
                  className="w-32 rounded-md px-2 py-1 text-sm"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Publicado
                </span>
                <input
                  type="date"
                  value={publishedDateInput}
                  onChange={(e) => setPublishedDateInput(e.target.value)}
                  title="Fecha de publicación — cuándo salió este dato (puede ser distinta a la fecha del período, ej. un CPI de julio publicado en agosto)"
                  className="w-32 rounded-md px-2 py-1 text-sm"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isPercentFormat ? '%' : 'valor'}
                className="w-20 rounded-md px-2 py-1 text-sm tabular-nums"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              {meta.releaseStage && (
                <select
                  value={stageInput}
                  onChange={(e) => setStageInput(e.target.value as 'preliminar' | 'final')}
                  className="rounded-md px-1 py-1 text-[11px]"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  title="Etapa de este dato — al guardar, si ya existe un punto para esta misma fecha se reemplaza (mismo casillero), y la insignia de la tarjeta pasa a mostrar esta etapa."
                >
                  <option value="preliminar">Preliminar</option>
                  <option value="final">Final</option>
                </select>
              )}
            </div>
          </td>
          <td className="py-2.5 text-right">
            <button
              onClick={handleSave}
              disabled={value === '' || saving}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--series-1)' }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={() => removeLastPoint(id)}
              className="ml-2 rounded-md px-2 py-1.5 text-xs"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              title="Deshacer el último punto que agregaste"
            >
              Deshacer
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function FomcWatchRow({ meetingDate }: { meetingDate: string }) {
  const { fomcWatch, updateFomcWatch } = useMacroData();
  const current = fomcWatch[meetingDate];
  const [cut, setCut] = useState(current ? String(current.probCut) : '');
  const [hold, setHold] = useState(current ? String(current.probHold) : '');
  const [hike, setHike] = useState(current ? String(current.probHike) : '');
  const [note, setNote] = useState(current?.note ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const probCut = parseInt(cut, 10) || 0;
    const probHold = parseInt(hold, 10) || 0;
    const probHike = parseInt(hike, 10) || 0;
    setSaving(true);
    await updateFomcWatch(meetingDate, { probCut, probHold, probHike, note });
    setSaving(false);
  }

  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {formatDate(meetingDate)}
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          max={100}
          value={cut}
          onChange={(e) => setCut(e.target.value)}
          placeholder="%"
          className="w-16 rounded-md px-2 py-1 text-sm tabular-nums"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          max={100}
          value={hold}
          onChange={(e) => setHold(e.target.value)}
          placeholder="%"
          className="w-16 rounded-md px-2 py-1 text-sm tabular-nums"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          max={100}
          value={hike}
          onChange={(e) => setHike(e.target.value)}
          placeholder="%"
          className="w-16 rounded-md px-2 py-1 text-sm tabular-nums"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="nota opcional (ej. -25pb más probable)"
          className="w-56 rounded-md px-2 py-1 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--series-1)' }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}

export function Actualizar() {
  const { resetOverrides, exportJson, syncMode } = useMacroData();
  const { currency } = useCurrency();
  const sections = ['tasas', 'inflacion', 'empleo', 'confianza', 'crecimiento'] as const;

  function handleExport() {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historical-series.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    const msg =
      syncMode === 'cloud'
        ? 'Esto borrará todos los datos manuales de la base de datos (Supabase), para todos los dispositivos. ¿Continuar?'
        : 'Esto borrará todos los datos que agregaste manualmente en este navegador. ¿Continuar?';
    if (confirm(msg)) {
      resetOverrides();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Actualizar Datos
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          {syncMode === 'cloud' ? (
            <>
              Agrega el último dato publicado de cada indicador. Se guarda en la base de datos (Supabase) al
              instante y se sincroniza en todos los dispositivos. Los indicadores automáticos (insignia con la
              fuente) ya no requieren tocar nada — un workflow de GitHub Actions los sincroniza solo cada 30
              minutos.
            </>
          ) : (
            <>
              Agrega el último dato publicado de cada indicador. Se guarda solo en este navegador (no hay base de
              datos configurada todavía). Pulsa <strong>“Exportar JSON”</strong> y reemplaza{' '}
              <code>src/data/historical-series.json</code> en el repositorio para dejarlo fijo para todos.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--series-2)' }}
          >
            Exportar JSON
          </button>
          <button
            onClick={handleReset}
            className="rounded-md px-4 py-2 text-sm font-semibold"
            style={{ color: 'var(--delta-bad)', border: '1px solid var(--border)' }}
          >
            Borrar cambios locales
          </button>
        </div>
      </div>

      {sections.map((section) => {
        const rows = INDICATORS.filter((m) => m.section === section && (m.currency ?? 'USD') === currency);
        if (rows.length === 0) return null;
        // Padre inmediatamente seguido de sus subcomponentes (ISM/PMI/GDP),
        // en vez de todos los padres primero y los hijos amontonados al
        // final — mismo orden visual que ya usa Crecimiento.tsx para las
        // tarjetas, ver lib/indicatorGroups.ts.
        const groups = groupByParent(rows);
        return (
          <div key={section}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {SECTION_LABELS[currency][section]}
            </h2>
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full" style={{ background: 'var(--surface-1)' }}>
                <thead>
                  <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                    <th className="px-3 pt-3 pb-2 font-medium">Indicador</th>
                    <th className="px-3 pt-3 pb-2 font-medium">Anterior</th>
                    <th className="px-3 pt-3 pb-2 font-medium">Actual</th>
                    <th className="px-3 pt-3 pb-2 font-medium">Previsión</th>
                    <th className="px-3 pt-3 pb-2 font-medium">Carga manual</th>
                    <th className="px-3 pt-3 pb-2" />
                  </tr>
                </thead>
                <tbody className="px-3">
                  {groups.map(({ parent, children }) => (
                    <Fragment key={parent.id}>
                      <IndicatorRow id={parent.id} />
                      {children.map((child) => (
                        <IndicatorRow key={child.id} id={child.id} isChild />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {currency === 'USD' && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            FOMC Watch — Previsión de Tasas
          </h2>
          <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Probabilidades (0-100, no necesitan sumar exactamente 100) que el mercado de futuros asigna a cada
            resultado de la próxima reunión de la Fed. Consúltalas en{' '}
            <a
              href="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              CME FedWatch
            </a>
            .
          </p>
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full" style={{ background: 'var(--surface-1)' }}>
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                  <th className="px-3 pt-3 pb-2 font-medium">Reunión</th>
                  <th className="px-3 pt-3 pb-2 font-medium">Baja %</th>
                  <th className="px-3 pt-3 pb-2 font-medium">Mantiene %</th>
                  <th className="px-3 pt-3 pb-2 font-medium">Sube %</th>
                  <th className="px-3 pt-3 pb-2 font-medium">Nota</th>
                  <th className="px-3 pt-3 pb-2" />
                </tr>
              </thead>
              <tbody>
                {upcomingFomcMeetings().map((m) => (
                  <FomcWatchRow key={m.date} meetingDate={m.date} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
