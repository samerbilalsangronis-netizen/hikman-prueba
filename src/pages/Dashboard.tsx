import { indicatorsBySection } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { ChartCard } from '../components/ChartCard';
import { ScorePanel } from '../components/ScorePanel';
import { getFreshness } from '../lib/freshness';
import { INDICATORS } from '../data/indicators';

const HIGHLIGHTS = ['fed_funds_rate', 'cpi_yoy', 'nfp', 'ism_manuf'];

export function Dashboard() {
  const { getSeries, scoreRows, forecasts } = useMacroData();

  const staleCount = INDICATORS.filter((m) => getFreshness(getSeries(m.id), m.frequency).level !== 'ok').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Resumen Fundamental del USD
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {staleCount > 0
            ? `${staleCount} de ${INDICATORS.length} indicadores necesitan revisión o actualización.`
            : 'Todos los indicadores están al día.'}
        </p>
      </div>

      <ScorePanel rows={scoreRows} />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Indicadores Clave
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HIGHLIGHTS.map((id) => {
            const meta = INDICATORS.find((m) => m.id === id)!;
            return <ChartCard key={id} meta={meta} points={getSeries(id)} months={24} forecast={forecasts[id]} />;
          })}
        </div>
      </div>

      {(['ism', 'empleo', 'inflacion', 'tasas'] as const).map((section) => (
        <div key={section}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {section === 'ism' && 'ISM / Sentimiento'}
            {section === 'empleo' && 'Empleo'}
            {section === 'inflacion' && 'Inflación'}
            {section === 'tasas' && 'Tasas y Reserva Federal'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {indicatorsBySection(section)
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
