import { indicatorsBySection } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ChartCard } from './ChartCard';
import type { Section } from '../types';

export function SectionGrid({ section, months }: { section: Section; months?: number }) {
  const { getSeries, forecasts } = useMacroData();
  const { currency } = useCurrency();
  const items = indicatorsBySection(section, currency);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((meta) => (
        <ChartCard key={meta.id} meta={meta} points={getSeries(meta.id)} months={months} forecast={forecasts[meta.id]} />
      ))}
    </div>
  );
}
