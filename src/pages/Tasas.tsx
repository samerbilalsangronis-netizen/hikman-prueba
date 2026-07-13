import { SectionGrid } from '../components/SectionGrid';
import { FomcWatchPanel } from '../components/FomcWatchPanel';

export function Tasas() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Tasas y Reserva Federal
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Tasa de referencia, bono a 10 años, masa monetaria M2 y balance de la Fed — los motores directos del USD.
          En el Excel original estos cuatro llevaban entre 1 y 11 años sin actualizarse.
        </p>
      </div>
      <FomcWatchPanel />
      <SectionGrid section="tasas" months={60} />
    </div>
  );
}
