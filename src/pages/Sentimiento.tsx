import { SectionGrid } from '../components/SectionGrid';
import { useCurrency } from '../data/CurrencyContext';

export function Sentimiento() {
  const { currency } = useCurrency();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Confianza / Sentimiento
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'EUR'
            ? 'Encuestas de confianza del consumidor, empresarial y ZEW de la Eurozona.'
            : currency === 'GBP'
              ? 'Barómetro de confianza del consumidor GfK del Reino Unido.'
              : currency === 'CAD'
                ? 'Confianza empresarial y del consumidor de Canadá (Conference Board of Canada).'
                : currency === 'AUD'
                  ? 'Confianza empresarial (NAB) y del consumidor (Westpac-Melbourne Institute) de Australia.'
                  : currency === 'NZD'
                    ? 'Confianza empresarial (ANZ Business Outlook) y del consumidor (ANZ-Roy Morgan) de Nueva Zelanda.'
                    : currency === 'JPY'
                      ? 'Encuesta Tankan del BOJ (confianza empresarial) y confianza del consumidor del Gabinete de Japón.'
                      : 'Sentimiento del consumidor: Universidad de Michigan y Conference Board.'}
        </p>
      </div>
      <SectionGrid section="confianza" months={36} />
    </div>
  );
}
