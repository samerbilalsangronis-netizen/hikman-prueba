import { SectionGrid } from '../components/SectionGrid';

export function Ism() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          ISM / Sentimiento
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Índices de actividad manufacturera y de servicios (PMI).
        </p>
      </div>
      <SectionGrid section="ism" months={36} />
    </div>
  );
}
