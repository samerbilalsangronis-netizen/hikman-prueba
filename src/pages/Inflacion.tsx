import { SectionGrid } from '../components/SectionGrid';
import { useCurrency } from '../data/CurrencyContext';

export function Inflacion() {
  const { currency } = useCurrency();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Inflación
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'EUR'
            ? 'CPI y Core CPI (HICP), variación mensual e interanual.'
            : 'CPI, Core CPI, PPI y Core PPI, variación mensual.'}
        </p>
      </div>
      <SectionGrid section="inflacion" months={36} />
    </div>
  );
}
