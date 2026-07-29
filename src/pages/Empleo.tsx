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
            : currency === 'GBP'
              ? 'Tasa de desempleo, Claimant Count y crecimiento salarial (con y sin bonos) del Reino Unido.'
              : currency === 'CAD'
                ? 'Tasa de desempleo y cambios mensuales en el empleo de Canadá.'
                : currency === 'AUD'
                  ? 'Tasa de desempleo y cambios mensuales en el empleo de Australia.'
                  : currency === 'NZD'
                    ? 'Tasa de desempleo y cambios en el empleo de Nueva Zelanda.'
                    : currency === 'JPY'
                      ? 'Tasa de desempleo de Japón.'
                      : currency === 'CHF'
                        ? 'Tasa de desempleo y cambios en el empleo de Suiza.'
                        : 'Nóminas no agrícolas, desempleo, salarios, JOLTS y ADP.'}
        </p>
      </div>
      <SectionGrid section="empleo" months={36} />
    </div>
  );
}
