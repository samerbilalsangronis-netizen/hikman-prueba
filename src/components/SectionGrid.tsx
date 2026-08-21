import { useState } from 'react';
import { indicatorsBySection } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ChartCard } from './ChartCard';
import { SubcomponentModal } from './SubcomponentModal';
import { groupByParent } from '../lib/indicatorGroups';
import type { Section } from '../types';

export function SectionGrid({ section, months }: { section: Section; months?: number }) {
  const { getSeries, forecasts, getReleaseStage, getPublishedDate } = useMacroData();
  const { currency } = useCurrency();
  const [openParentId, setOpenParentId] = useState<string | null>(null);

  const groups = groupByParent(indicatorsBySection(section, currency));
  const openGroup = groups.find((g) => g.parent.id === openParentId);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ parent, children }) => (
          <ChartCard
            key={parent.id}
            meta={parent}
            points={getSeries(parent.id)}
            months={months}
            forecast={forecasts[parent.id]}
            releaseStage={getReleaseStage(parent.id) ?? parent.releaseStage}
            publishedDate={getPublishedDate(parent.id)}
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
          getReleaseStage={getReleaseStage}
          getPublishedDate={getPublishedDate}
          onClose={() => setOpenParentId(null)}
        />
      )}
    </>
  );
}
