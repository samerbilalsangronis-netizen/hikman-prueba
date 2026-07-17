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
            : 'Sentimiento del consumidor: Universidad de Michigan y Conference Board.'}
        </p>
      </div>
      <SectionGrid section="confianza" months={36} />
    </div>
  );
}
