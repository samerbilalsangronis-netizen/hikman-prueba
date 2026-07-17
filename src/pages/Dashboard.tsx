import { indicatorsBySection, SECTION_LABELS } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ChartCard } from '../components/ChartCard';
import { ScorePanel } from '../components/ScorePanel';
import { getFreshness } from '../lib/freshness';
import { INDICATORS } from '../data/indicators';
import type { Currency } from '../types';

const HIGHLIGHTS: Record<Currency, string[]> = {
  USD: ['fed_funds_rate', 'cpi_yoy', 'nfp', 'ism_manuf'],
  EUR: ['eur_ecb_deposit_rate', 'eur_cpi_yoy', 'eur_unemployment', 'eur_pmi_manuf_flash'],
};

export function Dashboard() {
  const { getSeries, scoreRows, forecasts } = useMacroData();
  const { currency } = useCurrency();

  const currencyIndicators = INDICATORS.filter((m) => (m.currency ?? 'USD') === currency);
  const staleCount = currencyIndicators.filter((m) => getFreshness(getSeries(m.id), m.frequency).level !== 'ok').length;
  const currencyScoreRows = scoreRows.filter((r) => (r.currency ?? 'USD') === currency);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Resumen Fundamental del {currency}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {staleCount > 0
            ? `${staleCount} de ${currencyIndicators.length} indicadores necesitan revisión o actualización.`
            : 'Todos los indicadores están al día.'}
        </p>
      </div>

      <ScorePanel rows={currencyScoreRows} title={`Score Compuesto ${currency}`} />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Indicadores Clave
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HIGHLIGHTS[currency].map((id) => {
            const meta = INDICATORS.find((m) => m.id === id)!;
            return <ChartCard key={id} meta={meta} points={getSeries(id)} months={24} forecast={forecasts[id]} />;
          })}
        </div>
      </div>

      {(['ism', 'empleo', 'inflacion', 'crecimiento', 'tasas'] as const).map((section) => (
        <div key={section}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {SECTION_LABELS[currency][section]}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {indicatorsBySection(section, currency)
              .filter((meta) => !meta.parentId)
              .slice(0, 3)
              .map((meta) => (
                <ChartCard key={meta.id} meta={meta} points={getSeries(meta.id)} months={24} forecast={forecasts[meta.id]} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
