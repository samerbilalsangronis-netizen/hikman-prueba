import { useMemo, useState } from 'react';
import { useMacroData } from '../data/MacroDataContext';
import { BIAS_COLORS, BIAS_LABELS } from '../lib/bias';
import { FX_INDICATOR_ID } from '../lib/fxIndicator';
import type { CurrencyBias } from '../types';
import { CurrencyBiasCard } from './CurrencyBiasCard';

// Tarjeta compacta para el grid horizontal del Panel de Control (2-oct-2026,
// a pedido del usuario — mockup de referencia) — reemplaza la lista vertical
// de CurrencyBiasCard ahí, pero NO reemplaza a CurrencyBiasCard en sí: esa
// sigue siendo el único lugar con el editor completo (resumen WYSIWYG,
// motivos, tasa/próxima reunión, historial), así que esta tarjeta abre esa
// misma card en un modal al hacer clic, en vez de duplicar todo ese editor
// en formato chico.

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-8 w-full items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Sin datos de FX
      </div>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const step = w / (points.length - 1);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ');
  const up = points[points.length - 1] >= points[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={up ? 'var(--status-good)' : 'var(--status-critical)'} strokeWidth={2} />
    </svg>
  );
}

// Días transcurridos desde que arrancó la semana en curso de este sesgo
// (bias.current.startedAt) — el reset sigue siendo MANUAL (botón
// "Actualizar", igual que antes), esto solo visualiza cuánto pasó desde la
// última vez que se tocó.
function daysElapsed(startedAt: string): number {
  const start = new Date(startedAt).setHours(0, 0, 0, 0);
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now - start) / 86_400_000));
}

export function CurrencyBiasCompactCard({ bias }: { bias: CurrencyBias }) {
  const { getSeries, rolloverBias } = useMacroData();
  const [expanded, setExpanded] = useState(false);
  const fxId = FX_INDICATOR_ID[bias.currency];
  const sparkPoints = useMemo(() => (fxId ? getSeries(fxId).slice(-14).map(([, v]) => v) : []), [getSeries, fxId]);

  const elapsed = daysElapsed(bias.current.startedAt);
  const dayOfCycle = Math.min(elapsed + 1, 7);
  // Pulso de "recién actualizado" — el sesgo cambió hoy mismo.
  const recentlyUpdated = elapsed === 0;
  const level = bias.current.level;

  function handleRollover(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = window.confirm(
      `¿Actualizar sesgo de ${bias.currency}? La semana en curso se archiva en el historial y arranca una semana nueva en blanco. El badge grande se mantiene hasta que lo cambies vos.`,
    );
    if (!ok) return;
    rolloverBias(bias.currency);
  }

  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(true)}
        className="flex cursor-pointer flex-col gap-2 rounded-xl p-3 text-left transition-transform hover:-translate-y-0.5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {bias.currency}
          </span>
          {recentlyUpdated && (
            <span className="bias-pulse h-2 w-2 rounded-full" style={{ background: 'var(--series-1)' }} title="Sesgo actualizado hoy" />
          )}
        </div>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {bias.centralBank}
        </p>
        <MiniSparkline points={sparkPoints} />
        <span
          className="self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: level ? BIAS_COLORS[level] : 'var(--surface-2)', color: level ? '#fff' : 'var(--text-muted)' }}
        >
          {level ? BIAS_LABELS[level] : 'Sin definir'}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < dayOfCycle ? 'var(--series-1)' : 'var(--surface-2)' }} />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Día {dayOfCycle} de 7
          </span>
        </div>
        <button
          onClick={handleRollover}
          className="mt-1 rounded-full py-1 text-[11px] font-semibold text-white"
          style={{ background: 'var(--series-2)' }}
        >
          ⟳ Actualizar
        </button>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[60] flex overflow-y-auto p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Sesgo de ${bias.currency}`}
        >
          {/* m-auto (no items-center en el padre) centra cuando el contenido
              entra en pantalla pero deja hacer scroll hasta el principio
              cuando es más alto que la ventana — con items-center, el
              navegador recorta el overflow de ARRIBA y no deja llegar ahí
              (bug de scroll conocido de flexbox centrado). */}
          <div className="m-auto w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CurrencyBiasCard bias={bias} />
          </div>
        </div>
      )}
    </>
  );
}
