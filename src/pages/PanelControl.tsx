import { useOutletContext } from 'react-router-dom';
import { useMacroData } from '../data/MacroDataContext';
import { CURRENCIES } from '../data/CurrencyContext';
import { MarqueeTicker } from '../components/MarqueeTicker';
import { MarketIndicatorsPanel } from '../components/MarketIndicatorsPanel';
import { CurrencyBiasCard } from '../components/CurrencyBiasCard';
import { DocumentUploadList } from '../components/DocumentUploadList';

export function PanelControl() {
  const { theme } = useOutletContext<{ theme: 'light' | 'dark' }>();
  const { headlines, biases, reports, addReport, deleteReport, mentorNotes, addMentorNote, deleteMentorNote } = useMacroData();

  const pinnedHeadlines = headlines.filter((h) => h.pinned);

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 sm:-mx-6">
        <MarqueeTicker headlines={pinnedHeadlines} />
      </div>

      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Panel de Control
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Vista general: mercado, sesgo por divisa, informes económicos y resúmenes de mentoría.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_300px]">
        <aside className="flex flex-col gap-6 lg:order-1">
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <DocumentUploadList
              title="Informes Económicos"
              description="Documentos y notas de referencia para consulta rápida."
              entries={reports}
              onAdd={addReport}
              onDelete={deleteReport}
            />
          </div>
        </aside>

        <div className="flex flex-col gap-6 lg:order-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Sesgo por Divisa
            </h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {CURRENCIES.map((currency) => {
                const bias = biases[currency];
                return bias ? <CurrencyBiasCard key={currency} bias={bias} /> : null;
              })}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <DocumentUploadList
              title="Resúmenes de Nufal Bakali"
              description="Notas y resúmenes de tu mentor, siempre a mano."
              entries={mentorNotes}
              onAdd={addMentorNote}
              onDelete={deleteMentorNote}
            />
          </div>
        </div>

        <aside className="lg:order-3">
          <MarketIndicatorsPanel theme={theme} />
        </aside>
      </div>
    </div>
  );
}
