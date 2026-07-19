import { Fragment, useState } from 'react';
import { indicatorsBySection } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ChartCard } from '../components/ChartCard';

export function Crecimiento() {
  const { getSeries, forecasts } = useMacroData();
  const { currency } = useCurrency();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const all = indicatorsBySection('crecimiento', currency);
  const topLevel = all.filter((m) => !m.parentId);
  const childrenByParent = new Map<string, typeof all>();
  for (const m of all) {
    if (m.parentId) childrenByParent.set(m.parentId, [...(childrenByParent.get(m.parentId) ?? []), m]);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
                : 'PIB, PMI (ISM y S&P Global), ventas minoristas, producción industrial, balanza comercial y encuestas regionales — el pulso de la actividad económica real, más allá de precios y empleo.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {topLevel.map((meta) => {
          const children = childrenByParent.get(meta.id);
          const isExpanded = expanded.has(meta.id);
          return (
            <Fragment key={meta.id}>
              <ChartCard
                meta={meta}
                points={getSeries(meta.id)}
                months={36}
                forecast={forecasts[meta.id]}
                expandControl={
                  children ? { expanded: isExpanded, onToggle: () => toggle(meta.id), childCount: children.length } : undefined
                }
              />
              {/* col-span-full: el panel aparece justo debajo de la tarjeta clickeada,
                  dentro del mismo grid, en vez de amontonarse en una sección aparte. */}
              {isExpanded && children && (
                <div className="col-span-full rounded-xl p-4" style={{ border: '1px dashed var(--border)' }}>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--series-1)' }}>▾</span>
                    Subcomponentes — {meta.label}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {children.map((child) => (
                      <ChartCard key={child.id} meta={child} points={getSeries(child.id)} months={36} forecast={forecasts[child.id]} />
                    ))}
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
