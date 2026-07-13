import { SectionGrid } from '../components/SectionGrid';

export function Empleo() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Empleo
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nóminas no agrícolas, desempleo, salarios, JOLTS y ADP.
        </p>
      </div>
      <SectionGrid section="empleo" months={36} />
    </div>
  );
}
