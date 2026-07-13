import { useState } from 'react';
import { indicatorsBySection } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { ChartCard } from '../components/ChartCard';

export function Ism() {
  const { getSeries, forecasts } = useMacroData();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const all = indicatorsBySection('ism');
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
          ISM / Sentimiento
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Índices de actividad manufacturera y de servicios (PMI). El ISM y el S&P Global miden lo mismo con
          metodologías distintas — no tienen por qué coincidir. Los índices con subcomponentes se pueden expandir
          (botón ▸ junto a la insignia de frescura).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {topLevel.map((meta) => {
          const children = childrenByParent.get(meta.id);
          return (
            <ChartCard
              key={meta.id}
              meta={meta}
              points={getSeries(meta.id)}
              months={36}
              forecast={forecasts[meta.id]}
              expandControl={
                children ? { expanded: expanded.has(meta.id), onToggle: () => toggle(meta.id), childCount: children.length } : undefined
              }
            />
          );
        })}
      </div>

      {[...expanded].map((parentId) => {
        const parent = topLevel.find((m) => m.id === parentId);
        const children = childrenByParent.get(parentId);
        if (!parent || !children) return null;
        return (
          <div key={parentId} className="rounded-xl p-4" style={{ border: '1px dashed var(--border)' }}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--series-1)' }}>▾</span>
              Subcomponentes — {parent.label}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {children.map((meta) => (
                <ChartCard key={meta.id} meta={meta} points={getSeries(meta.id)} months={36} forecast={forecasts[meta.id]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
