import { SectionGrid } from '../components/SectionGrid';
import { useCurrency } from '../data/CurrencyContext';

export function Empleo() {
  const { currency } = useCurrency();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Empleo
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'EUR'
            ? 'Tasa de desempleo, crecimiento salarial y coste laboral de la Eurozona.'
            : 'Nóminas no agrícolas, desempleo, salarios, JOLTS y ADP.'}
        </p>
      </div>
      <SectionGrid section="empleo" months={36} />
    </div>
  );
}
