import { useState } from 'react';
import { useMacroData } from '../data/MacroDataContext';
import { BIAS_COLORS, BIAS_LABELS, BIAS_SCORE } from '../lib/bias';
import type { BiasLevel, CurrencyBias } from '../types';
import { CurrencyBiasCard } from './CurrencyBiasCard';

// Tarjeta compacta para el grid horizontal del Panel de Control (2-oct-2026,
// a pedido del usuario — mockup de referencia) — reemplaza la lista vertical
// de CurrencyBiasCard ahí, pero NO reemplaza a CurrencyBiasCard en sí: esa
// sigue siendo el único lugar con el editor completo (resumen WYSIWYG,
// motivos, tasa/próxima reunión, historial), así que esta tarjeta abre esa
// misma card en un modal al hacer clic, en vez de duplicar todo ese editor
// en formato chico.

// Gráfico del histórico del sesgo (11-oct-2026, a pedido del usuario —
// reemplaza la sparkline de FX): cada semana archivada + la actual,
// ubicadas en una escala fija de dovish (abajo) a hawkish (arriba), así
// "bajista" se ve a la baja y "alcista" al alza. Escalonado porque el sesgo
// es un valor por semana, no continuo. Con una sola semana cargada se
// dibuja el tramo desde Neutro hasta el sesgo actual, para que la dirección
// se vea igual desde el primer día.
interface BiasPoint {
  level: BiasLevel;
  startedAt: string;
}

function biasPoints(bias: CurrencyBias): BiasPoint[] {
  const snapshots = [...bias.history].reverse().concat(bias.current);
  return snapshots.filter((s): s is typeof s & { level: BiasLevel } => s.level !== null).map((s) => ({ level: s.level, startedAt: s.startedAt }));
}

function BiasHistoryChart({ bias }: { bias: CurrencyBias }) {
  const real = biasPoints(bias);
  const current = bias.current.level;
  if (real.length === 0 || !current) {
    return (
      <div className="flex h-10 w-full items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Sin sesgo cargado
      </div>
    );
  }
  const points: (BiasPoint & { synthetic?: boolean })[] = real.length === 1 ? [{ level: 'neutral', startedAt: real[0].startedAt, synthetic: true }, real[0]] : real;
  const w = 100;
  const h = 32;
  const pad = 4;
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (level: BiasLevel) => pad + ((2 - BIAS_SCORE[level]) / 4) * (h - pad * 2);
  // Escalón: horizontal hasta la próxima semana y recién ahí sube/baja. El
  // último tramo (hacia el sesgo actual) va en diagonal para que la
  // dirección del cambio más reciente se lea de un vistazo.
  let d = `M ${x(0)} ${y(points[0].level)}`;
  for (let i = 1; i < points.length; i++) {
    if (i < points.length - 1) d += ` H ${x(i)} V ${y(points[i].level)}`;
    else d += ` L ${x(i)} ${y(points[i].level)}`;
  }
  const color = BIAS_COLORS[current];
  const gradientId = `bias-fill-${bias.currency}`;
  const weeks = real.length;
  return (
    <div className="flex flex-col gap-0.5">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={0} x2={w} y1={y('neutral')} y2={y('neutral')} stroke="var(--gridline)" strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${gradientId})`} stroke="none" />
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }} title={real.map((p) => `${new Date(p.startedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}: ${BIAS_LABELS[p.level]}`).join('\n')}>
        Histórico de sesgo · {weeks} {weeks === 1 ? 'semana' : 'semanas'}
      </span>
    </div>
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
  const { rolloverBias } = useMacroData();
  const [expanded, setExpanded] = useState(false);

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
        <BiasHistoryChart bias={bias} />
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
