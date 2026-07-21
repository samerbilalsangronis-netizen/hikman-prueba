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
            : currency === 'GBP'
              ? 'CPI y Core CPI del Reino Unido, variación mensual e interanual.'
              : currency === 'CAD'
                ? 'CPI y Core CPI de Canadá, variación mensual e interanual.'
                : currency === 'AUD'
                  ? 'CPI, Trimmed Mean, Weighted Median y PPI de Australia, variación trimestral e interanual.'
                  : currency === 'NZD'
                    ? 'CPI de Nueva Zelanda, variación trimestral e interanual.'
                    : 'CPI, Core CPI, PPI y Core PPI, variación mensual.'}
        </p>
      </div>
      <SectionGrid section="inflacion" months={36} />
    </div>
  );
}
