import { SectionGrid } from '../components/SectionGrid';
import { FomcWatchPanel } from '../components/FomcWatchPanel';
import { useCurrency } from '../data/CurrencyContext';

export function Tasas() {
  const { currency } = useCurrency();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {currency === 'EUR'
            ? 'Tasas y Banco Central Europeo'
            : currency === 'GBP'
              ? 'Tasas y Banco de Inglaterra'
              : currency === 'CAD'
                ? 'Tasas y Bank of Canada'
                : currency === 'AUD'
                  ? 'Tasas y Reserve Bank of Australia'
                  : 'Tasas y Reserva Federal'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'EUR'
            ? 'Las tres tasas oficiales del corredor del BCE: Depósito, Refinanciación y Marginal.'
            : currency === 'GBP'
              ? 'El BoE, a diferencia del BCE, mueve una sola tasa oficial (Bank Rate) — no un corredor.'
              : currency === 'CAD'
                ? 'El BoC, como la Fed y el BoE, mueve una sola tasa oficial (overnight rate target).'
                : currency === 'AUD'
                  ? 'El RBA, como la Fed/BoE/BoC, mueve una sola tasa oficial (cash rate target).'
                  : 'Tasa de referencia, bono a 10 años y balance de la Fed — los motores directos del USD.'}
        </p>
      </div>
      {currency === 'USD' && <FomcWatchPanel />}
      <SectionGrid section="tasas" months={60} />
    </div>
  );
}
