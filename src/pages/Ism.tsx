import { Fragment, useState } from 'react';
import { indicatorsBySection } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ChartCard } from '../components/ChartCard';

export function Ism() {
  const { getSeries, forecasts } = useMacroData();
  const { currency } = useCurrency();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const all = indicatorsBySection('ism', currency);
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
          {currency === 'EUR' ? 'PMI / Sentimiento' : 'ISM / Sentimiento'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'EUR'
            ? 'PMI Flash de manufactura y servicios, y encuestas de confianza (Consumidor, Empresarial, ZEW) de la Eurozona.'
            : 'Índices de actividad manufacturera y de servicios (PMI). El ISM y el S&P Global miden lo mismo con metodologías distintas — no tienen por qué coincidir. Haz clic en ISM Manufactura o ISM Servicios para desglosar sus subcomponentes; haz clic de nuevo para volver a colapsar.'}
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
                  rompiendo la fila del grid, en vez de amontonarse al final de la página
                  donde quedaba fuera de la vista sin hacer scroll. */}
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
