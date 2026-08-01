import { indicatorsByCountry } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ChartCard } from '../components/ChartCard';
import type { IndicatorMeta, Section } from '../types';

const SECTION_ORDER: Section[] = ['crecimiento', 'empleo', 'inflacion', 'confianza', 'tasas'];
const SECTION_LABELS: Record<Section, string> = {
  score: 'Score',
  tasas: 'Tasas',
  inflacion: 'Inflación',
  empleo: 'Empleo',
  confianza: 'Confianza / Sentimiento',
  crecimiento: 'Crecimiento',
};

interface CountryPageProps {
  country: NonNullable<IndicatorMeta['country']>;
  title: string;
}

export function CountryPage({ country, title }: CountryPageProps) {
  const { getSeries, forecasts, getReleaseStage } = useMacroData();
  const { currency } = useCurrency();
  const items = indicatorsByCountry(country, currency);
  const sections = SECTION_ORDER.filter((section) => items.some((i) => i.section === section));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Indicadores propios de {title}, aparte del agregado de {currency}.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Todavía no hay indicadores cargados para {title}.
        </p>
      ) : (
        sections.map((section) => (
          <div key={section}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {SECTION_LABELS[section]}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items
                .filter((meta) => meta.section === section)
                .map((meta) => (
                  <ChartCard
                    key={meta.id}
                    meta={meta}
                    points={getSeries(meta.id)}
                    months={24}
                    forecast={forecasts[meta.id]}
                    releaseStage={getReleaseStage(meta.id) ?? meta.releaseStage}
                  />
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
