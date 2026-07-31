import { useState } from 'react';
import { indicatorsBySection } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ChartCard } from '../components/ChartCard';
import { SubcomponentModal } from '../components/SubcomponentModal';
import { groupByParent } from '../lib/indicatorGroups';

export function Crecimiento() {
  const { getSeries, forecasts } = useMacroData();
  const { currency } = useCurrency();
  const [openParentId, setOpenParentId] = useState<string | null>(null);

  const groups = groupByParent(indicatorsBySection('crecimiento', currency));
  const openGroup = groups.find((g) => g.parent.id === openParentId);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ parent, children }) => (
          <ChartCard
            key={parent.id}
            meta={parent}
            points={getSeries(parent.id)}
            months={36}
            forecast={forecasts[parent.id]}
            subcomponentsControl={children.length > 0 ? { onOpen: () => setOpenParentId(parent.id), childCount: children.length } : undefined}
          />
        ))}
      </div>

      {openGroup && (
        <SubcomponentModal
          parent={openGroup.parent}
          children={openGroup.children}
          getSeries={getSeries}
          forecasts={forecasts}
          onClose={() => setOpenParentId(null)}
        />
      )}
    </div>
  );
}
