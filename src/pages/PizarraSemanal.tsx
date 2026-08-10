import { useMemo, useState } from 'react';
import { useMacroData } from '../data/MacroDataContext';
import { INDICATORS } from '../data/indicators';
import { WeeklyBiasStrip } from '../components/WeeklyBiasStrip';
import { WeeklyFeedCard } from '../components/WeeklyFeedCard';
import { CurrencyStrengthChart } from '../components/CurrencyStrengthChart';
import { IMPACT_LABELS } from '../lib/impact';
import { computeImpact, startOfWeek } from '../lib/weeklyHub';
import { supabaseEnabled } from '../lib/supabaseClient';
import { RESUMEN_INDICATOR_IDS } from '../lib/resumenIndicators';
import { buildPreviousValueMap } from '../lib/previousValue';
import { formatDate } from '../lib/format';
import type { ImpactLevel } from '../types';

const INDICATORS_BY_ID = new Map(INDICATORS.map((m) => [m.id, m]));

export function PizarraSemanal() {
  const { recentUpdates, forecasts } = useMacroData();
  const [filter, setFilter] = useState<ImpactLevel | 'todos'>('todos');
  const [view, setView] = useState<'feed' | 'fortaleza'>('feed');
  const [impactOverrides, setImpactOverrides] = useState<Record<string, ImpactLevel>>({});
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana actual, 1 = semana pasada, ...

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() - 7 * weekOffset);
    return d;
  }, [weekOffset]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const previousValueByKey = useMemo(() => buildPreviousValueMap(recentUpdates), [recentUpdates]);

  const cards = useMemo(() => {
    return recentUpdates
      .filter((u) => {
        const updatedAt = new Date(u.updatedAt);
        return updatedAt >= weekStart && updatedAt < weekEnd && RESUMEN_INDICATOR_IDS.has(u.indicatorId);
      })
      .map((u) => ({ update: u, meta: INDICATORS_BY_ID.get(u.indicatorId) }))
      .filter((c): c is { update: (typeof recentUpdates)[number]; meta: NonNullable<(typeof c)['meta']> } => Boolean(c.meta))
      .sort((a, b) => b.update.updatedAt.localeCompare(a.update.updatedAt));
  }, [recentUpdates, weekStart, weekEnd]);

  const withImpact = cards.map(({ update, meta }) => {
    const key = `${update.indicatorId}:${update.date}`;
    const forecast = forecasts[update.indicatorId];
    const previous = previousValueByKey.get(`${update.indicatorId}:${update.date}`);
    const impact = impactOverrides[key] ?? computeImpact(update.value, forecast);
    return { update, meta, forecast, previous, impact, key };
  });

  const filtered = filter === 'todos' ? withImpact : withImpact.filter((c) => c.impact === filter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Pizarra Semanal
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          Seguimiento semanal, sin ruido: solo los indicadores que ya se destacan en Resumen de cada divisa (el Score
          Compuesto), juntados en un solo lugar — Anterior/Previsión/Real de cada dato cargado o sincronizado. El
          nivel de impacto es automático (por sorpresa vs. previsión) y se puede corregir a mano en cada tarjeta.
          Fortaleza usa esos mismos datos, pero con el histórico completo para ver la tendencia.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Sesgo por Divisa
        </h2>
        <WeeklyBiasStrip />
      </div>

      {!supabaseEnabled ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          La Pizarra necesita Supabase configurado (modo local activo ahora mismo) — el feed se arma a partir de la
          hora real de carga de cada dato, que solo se guarda en la nube.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 rounded-full p-1" style={{ background: 'var(--surface-2)' }}>
              {(['feed', 'fortaleza'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: view === v ? 'var(--series-1)' : 'transparent',
                    color: view === v ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {v === 'feed' ? '📋 Feed' : '💪 Fortaleza'}
                </button>
              ))}
            </div>
            {view === 'feed' && (
              <div className="flex flex-wrap gap-1.5">
                {(['todos', 'alto', 'medio', 'bajo'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilter(level)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: filter === level ? 'var(--series-1)' : 'transparent',
                      color: filter === level ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {level === 'todos' ? 'Todos' : IMPACT_LABELS[level]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {view === 'feed' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="rounded-md px-2.5 py-1 text-xs font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                ‹ Semana anterior
              </button>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {weekOffset === 0 ? 'Esta semana' : `Semana del ${formatDate(weekStart.toISOString().slice(0, 10))}`}
              </span>
              <button
                onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                disabled={weekOffset === 0}
                className="rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Semana siguiente ›
              </button>
              {weekOffset > 0 && (
                <button onClick={() => setWeekOffset(0)} className="text-xs font-semibold" style={{ color: 'var(--series-1)' }}>
                  Volver a esta semana
                </button>
              )}
            </div>
          )}

          {view === 'fortaleza' ? (
            <CurrencyStrengthChart />
          ) : filtered.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin novedades cargadas {weekOffset === 0 ? 'todavía esta semana' : 'esa semana'}
              {filter !== 'todos' ? ` con ${IMPACT_LABELS[filter]}` : ''}.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ update, meta, forecast, previous, impact, key }) => (
                <WeeklyFeedCard
                  key={key}
                  meta={meta}
                  date={update.date}
                  value={update.value}
                  forecast={forecast}
                  previous={previous}
                  updatedAt={update.updatedAt}
                  impact={impact}
                  onOverrideImpact={(level) => setImpactOverrides((prev) => ({ ...prev, [key]: level }))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
