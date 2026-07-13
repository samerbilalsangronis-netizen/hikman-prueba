import { SectionGrid } from '../components/SectionGrid';

export function Crecimiento() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Crecimiento
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          PIB, ventas minoristas, producción industrial, balanza comercial y encuestas regionales — el pulso de la
          actividad económica real, más allá de precios y empleo.
        </p>
      </div>
      <SectionGrid section="crecimiento" months={36} />
    </div>
  );
}
