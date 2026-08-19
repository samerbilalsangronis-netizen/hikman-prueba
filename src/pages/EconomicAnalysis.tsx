import { useState, useMemo } from 'react';
import { useCurrency } from '../data/CurrencyContext';
import { useMacroData } from '../data/MacroDataContext';
import { INDICATORS } from '../data/indicators';
import { getFreshness } from '../lib/freshness';
import type { Currency, IndicatorMeta } from '../types';

interface DriverMonitor {
  category: 'Crecimiento' | 'Inflación' | 'Empleo' | 'Tasas' | 'PIB' | 'Balanza Comercial' | 'Fiscal' | 'Geopolítica';
  indicators: IndicatorMeta[];
  severity: 'bullish' | 'neutral' | 'bearish';
  alert?: string;
  lastUpdated?: string;
  delta?: number; // cambio porcentual desde última lectura
}

interface ChangeProposal {
  currency: Currency;
  proposedLevel: string;
  evidence: string;
  drivers: string[];
  confidence: number;
}

const DRIVER_CATEGORIES = {
  'Crecimiento': ['gdp_growth', 'industrial_production', 'retail_sales', 'pce'],
  'Inflación': ['cpi', 'pce_price', 'core_cpi', 'ppi'],
  'Empleo': ['nfp', 'unemployment_rate', 'ism_employment', 'jobless_claims'],
  'Tasas': ['fed_funds_rate', 'yield_10y', 'ois_curve'],
  'PIB': ['gdp_growth', 'gdp_revision', 'quarterly_gdp'],
  'Balanza Comercial': ['trade_balance', 'exports', 'imports'],
  'Fiscal': ['government_spending', 'budget_deficit', 'fiscal_balance'],
  'Geopolítica': [], // monitoreado manualmente por ahora
};

export function EconomicAnalysis() {
  const { currency } = useCurrency();
  const { getSeries, headline } = useMacroData();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [showProposals, setShowProposals] = useState(false);

  const drivers = useMemo<DriverMonitor[]>(() => {
    return Object.entries(DRIVER_CATEGORIES).map(([category, indicatorIds]) => {
      const categoryIndicators = INDICATORS.filter(
        (ind) =>
          indicatorIds.some(id => ind.id.includes(id)) &&
          (ind.currency ?? 'USD') === currency
      );

      if (categoryIndicators.length === 0) {
        return {
          category: category as any,
          indicators: [],
          severity: 'neutral',
          alert: 'Sin indicadores disponibles para este país',
        };
      }

      // Calcular tendencia agregada
      const freshnessCounts = categoryIndicators.map(ind =>
        getFreshness(getSeries(ind.id), ind.frequency)
      );

      const staleCount = freshnessCounts.filter(f => f.level !== 'ok').length;
      const lastUpdated = categoryIndicators
        .map(ind => getSeries(ind.id)?.[getSeries(ind.id).length - 1]?.[0])
        .filter(Boolean)
        .sort()
        .reverse()[0];

      return {
        category: category as any,
        indicators: categoryIndicators,
        severity: staleCount > categoryIndicators.length / 2 ? 'bearish' : 'neutral',
        lastUpdated,
        alert: staleCount > 0 ? `${staleCount}/${categoryIndicators.length} indicadores necesitan revisión` : undefined,
      };
    });
  }, [currency, getSeries]);

  const recentHeadlines = useMemo(() => {
    if (!headline) return [];
    return headline
      .filter(h => h.tags.includes(currency))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 5);
  }, [headline, currency]);

  const handleProposeChange = (evidence: string, drivers: string[]) => {
    // Aquí iría lógica para sugerir cambio de sesgo basado en evidencia
    const newProposal: ChangeProposal = {
      currency: currency as Currency,
      proposedLevel: 'neutral',
      evidence,
      drivers,
      confidence: 0.65,
    };
    setProposals([...proposals, newProposal]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Análisis Económico Fundamental
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency} • Monitoreo en vivo L-V • Síntesis viernes
        </p>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {drivers.map((driver) => (
          <button
            key={driver.category}
            onClick={() => setSelectedDriver(selectedDriver === driver.category ? null : driver.category)}
            className="rounded-lg p-4 text-left transition-all"
            style={{
              background: 'var(--surface-1)',
              border: selectedDriver === driver.category ? '2px solid var(--series-1)' : '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {driver.category}
              </h3>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background:
                    driver.severity === 'bullish'
                      ? 'var(--status-good)'
                      : driver.severity === 'bearish'
                        ? 'var(--status-critical)'
                        : 'var(--text-muted)',
                }}
              />
            </div>
            {driver.alert && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ⚠️ {driver.alert}
              </p>
            )}
            {driver.lastUpdated && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Última: {new Date(driver.lastUpdated).toLocaleDateString('es-AR')}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Detalle del Driver Seleccionado */}
      {selectedDriver && (
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {selectedDriver} ({currency})
            </h2>
            <button
              onClick={() => setSelectedDriver(null)}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid gap-3">
            {drivers
              .find(d => d.category === selectedDriver)
              ?.indicators.map((ind) => {
                const series = getSeries(ind.id);
                const freshness = getFreshness(series, ind.frequency);
                const lastValue = series?.[series.length - 1];
                const previousValue = series?.[series.length - 2];
                const delta = lastValue && previousValue ?
                  (((lastValue[1] - previousValue[1]) / Math.abs(previousValue[1])) * 100).toFixed(2) :
                  null;

                return (
                  <div
                    key={ind.id}
                    className="rounded-md p-3"
                    style={{ background: 'var(--surface-2)', border: `1px solid var(--border)` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {ind.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {ind.source}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded"
                        style={{
                          background:
                            freshness.level === 'ok'
                              ? 'rgba(123, 184, 106, 0.2)'
                              : freshness.level === 'warning'
                                ? 'rgba(224, 151, 90, 0.2)'
                                : 'rgba(220, 38, 38, 0.2)',
                          color:
                            freshness.level === 'ok'
                              ? 'var(--status-good)'
                              : freshness.level === 'warning'
                                ? 'var(--delta-warning)'
                                : 'var(--status-critical)',
                        }}
                      >
                        {freshness.level === 'ok' ? '✓' : '⚠'} {freshness.daysSince}d
                      </span>
                    </div>

                    {lastValue && (
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <p style={{ color: 'var(--text-muted)' }}>Última lectura</p>
                          <p
                            className="font-bold text-lg"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {lastValue[1].toFixed(2)}
                          </p>
                        </div>
                        {delta && (
                          <div>
                            <p style={{ color: 'var(--text-muted)' }}>Cambio</p>
                            <p
                              className="font-bold"
                              style={{
                                color:
                                  parseFloat(delta) > 0
                                    ? (ind.goodDirection === 'up' ? 'var(--status-good)' : 'var(--status-critical)')
                                    : (ind.goodDirection === 'down' ? 'var(--status-good)' : 'var(--status-critical)'),
                              }}
                            >
                              {parseFloat(delta) > 0 ? '+' : ''}{delta}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Titulares Recientes */}
      {recentHeadlines.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        >
          <h2 className="mb-3 font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            Titulares Recientes ({currency})
          </h2>
          <div className="flex flex-col gap-2">
            {recentHeadlines.map((h) => (
              <a
                key={h.id}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 transition-all hover:opacity-80"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded shrink-0 mt-0.5"
                    style={{
                      background:
                        h.impact === 'alto'
                          ? 'rgba(220, 38, 38, 0.2)'
                          : h.impact === 'medio'
                            ? 'rgba(224, 151, 90, 0.2)'
                            : 'rgba(107, 114, 128, 0.2)',
                      color:
                        h.impact === 'alto'
                          ? 'var(--status-critical)'
                          : h.impact === 'medio'
                            ? 'var(--delta-warning)'
                            : 'var(--text-muted)',
                    }}
                  >
                    {h.impact.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="font-semibold text-sm leading-snug"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {h.titleEs || h.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {h.source} • {new Date(h.publishedAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Propuestas de Cambio de Sesgo */}
      {proposals.length > 0 && (
        <div
          className="rounded-lg p-4 border-2"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--series-2)' }}
        >
          <h2 className="mb-3 font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            Propuestas de Cambio de Sesgo
          </h2>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            Requiere confirmación manual antes de aplicar
          </p>
          <div className="flex flex-col gap-2">
            {proposals.map((p, i) => (
              <div
                key={i}
                className="rounded-md p-3"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {p.currency}: {p.proposedLevel}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Confianza: {(p.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <button
                    className="text-xs font-semibold px-3 py-1 rounded"
                    style={{
                      background: 'var(--series-1)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Aplicar
                  </button>
                </div>
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {p.evidence}
                </p>
                <div className="flex flex-wrap gap-1">
                  {p.drivers.map((d) => (
                    <span
                      key={d}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div
        className="rounded-lg p-3 text-xs"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>
          🔄 Análisis automático: L-V 08:00-08:20 • 📊 Síntesis: Viernes • ⚠️ Cambios de sesgo: Manual con confirmación obligatoria
        </p>
      </div>
    </div>
  );
}
