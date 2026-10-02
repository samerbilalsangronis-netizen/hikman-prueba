import { useMacroData } from '../data/MacroDataContext';
import { CURRENCIES } from '../data/CurrencyContext';
import { MarqueeTicker } from '../components/MarqueeTicker';
import { CurrencyBiasCompactCard } from '../components/CurrencyBiasCompactCard';
import { DocumentUploadList } from '../components/DocumentUploadList';
import { EconomyNotebook } from '../components/panel/EconomyNotebook';
import { MentorDailyReport } from '../components/panel/MentorDailyReport';

export function PanelControl() {
  const { headlines, biases, reports, addReport, deleteReport } = useMacroData();

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
          Vista general: sesgo por divisa, cuaderno de economía e informes de mentoría.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Cuadro de Sesgo Semanal
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CURRENCIES.map((currency) => {
            const bias = biases[currency];
            return bias ? <CurrencyBiasCompactCard key={currency} bias={bias} /> : null;
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-6 lg:order-1">
          <MentorDailyReport />
          <EconomyNotebook />
        </div>

        <aside className="flex flex-col gap-6 lg:order-2">
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
      </div>
    </div>
  );
}
