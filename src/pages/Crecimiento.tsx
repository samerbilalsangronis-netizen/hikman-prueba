import { useCurrency } from '../data/CurrencyContext';
import { SectionGrid } from '../components/SectionGrid';

export function Crecimiento() {
  const { currency } = useCurrency();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Crecimiento
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'EUR'
            ? 'PIB, PMI, ventas minoristas y producción industrial de la Eurozona.'
            : currency === 'GBP'
              ? 'PIB mensual, PMI Flash y ventas minoristas del Reino Unido.'
              : currency === 'CAD'
                ? 'PIB mensual, PMI, ventas minoristas y balanza comercial de Canadá.'
                : currency === 'AUD'
                  ? 'PIB trimestral, PMI, gasto de los hogares y balanza comercial de Australia.'
                  : currency === 'NZD'
                    ? 'PIB trimestral, PMI, ventas minoristas y balanza comercial de Nueva Zelanda.'
                    : currency === 'JPY'
                      ? 'PIB trimestral, PMI, ventas minoristas y balanza comercial de Japón.'
                      : currency === 'CHF'
                        ? 'PIB trimestral, PMI, ventas minoristas y balanza comercial de Suiza.'
                        : currency === 'CNY'
                          ? 'PIB, PMI (Manufacturero, No Manufacturero y Compuesto), ventas minoristas, producción industrial, inversión en activos fijos y balanza comercial de China.'
                          : 'PIB, PMI (ISM y S&P Global), ventas minoristas, producción industrial, balanza comercial y encuestas regionales — el pulso de la actividad económica real, más allá de precios y empleo.'}
        </p>
      </div>
      <SectionGrid section="crecimiento" months={36} />
    </div>
  );
}
