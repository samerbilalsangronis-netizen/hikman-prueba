import { useMemo, useState } from 'react';
import { useMacroData } from '../data/MacroDataContext';
import { INDICATORS } from '../data/indicators';
import { WeeklyBiasStrip } from '../components/WeeklyBiasStrip';
import { WeeklyFeedCard } from '../components/WeeklyFeedCard';
import { IMPACT_LABELS } from '../lib/impact';
import { computeImpact, startOfWeek } from '../lib/weeklyHub';
import { supabaseEnabled } from '../lib/supabaseClient';
import type { ImpactLevel } from '../types';

const INDICATORS_BY_ID = new Map(INDICATORS.map((m) => [m.id, m]));

export function PizarraSemanal() {
  const { recentUpdates, forecasts } = useMacroData();
  const [filter, setFilter] = useState<ImpactLevel | 'todos'>('todos');
  const [impactOverrides, setImpactOverrides] = useState<Record<string, ImpactLevel>>({});

  const weekStart = useMemo(() => startOfWeek(new Date()), []);

  const cards = useMemo(() => {
    return recentUpdates
      .filter((u) => new Date(u.updatedAt) >= weekStart)
      .map((u) => ({ update: u, meta: INDICATORS_BY_ID.get(u.indicatorId) }))
      .filter((c): c is { update: (typeof recentUpdates)[number]; meta: NonNullable<(typeof c)['meta']> } => Boolean(c.meta))
      .sort((a, b) => b.update.updatedAt.localeCompare(a.update.updatedAt));
  }, [recentUpdates, weekStart]);

  const withImpact = cards.map(({ update, meta }) => {
    const key = `${update.indicatorId}:${update.date}`;
    const forecast = forecasts[update.indicatorId];
    const impact = impactOverrides[key] ?? computeImpact(update.value, forecast);
    return { update, meta, forecast, impact, key };
  });

  const filtered = filter === 'todos' ? withImpact : withImpact.filter((c) => c.impact === filter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Pizarra Semanal
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          Catalizadores de la semana en curso, juntados de todas las divisas en un solo lugar — Real vs. Previsión de
          cada dato cargado o sincronizado desde el lunes. El nivel de impacto es automático (por sorpresa vs.
          previsión) y se puede corregir a mano en cada tarjeta.
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

          {filtered.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sin novedades cargadas todavía esta semana{filter !== 'todos' ? ` con ${IMPACT_LABELS[filter]}` : ''}.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ update, meta, forecast, impact, key }) => (
                <WeeklyFeedCard
                  key={key}
                  meta={meta}
                  date={update.date}
                  value={update.value}
                  forecast={forecast}
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
