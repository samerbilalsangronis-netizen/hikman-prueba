import { CURRENCIES } from '../../data/CurrencyContext';
import { useMacroData } from '../../data/MacroDataContext';
import { BIAS_COLORS, BIAS_LABELS, BIAS_SCORE } from '../../lib/bias';
import { isCurrentWeek, shiftWeek } from '../../lib/journalWeek';
import type { BiasLevel, Currency, CurrencyBias } from '../../types';

// Columna de sesgo de la hoja semanal del Cuaderno de Economía (25-oct-2026,
// a pedido del usuario — copia del cuaderno de Nufal, que anota a la
// derecha las divisas ordenadas por sesgo "pre semana" y lo va
// actualizando a medida que avanza la semana). No se carga nada a mano
// acá: sale del Cuadro de Sesgo Semanal (biases de MacroDataContext).
//   - Pre semana: el sesgo vigente al arrancar la semana (lunes 00:00) —
//     la semana archivada/en curso cuyo startedAt es el último antes de esa
//     hora.
//   - Semana actual: el sesgo de hoy (o, para una semana pasada, el
//     vigente al cerrarla).
// Simplificación conocida: si el sesgo se cambia en la semana en curso SIN
// apretar "Actualizar" antes, ese snapshot arrancó la semana anterior y
// "Pre semana" ya muestra el valor nuevo.

function localMidnight(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function levelAt(bias: CurrencyBias, time: number): BiasLevel | null {
  let best: { level: BiasLevel; t: number } | null = null;
  for (const snap of [bias.current, ...bias.history]) {
    const t = new Date(snap.startedAt).getTime();
    if (snap.level && t <= time && (!best || t > best.t)) best = { level: snap.level, t };
  }
  return best?.level ?? null;
}

interface Row {
  currency: Currency;
  level: BiasLevel;
}

function ranked(levels: Partial<Record<Currency, BiasLevel | null>>): Row[] {
  return CURRENCIES.flatMap((c) => {
    const level = levels[c];
    return level ? [{ currency: c, level }] : [];
  }).sort((a, b) => BIAS_SCORE[b.level] - BIAS_SCORE[a.level]);
}

function BiasList({ title, rows, previous }: { title: string; rows: Row[]; previous?: Partial<Record<Currency, BiasLevel | null>> }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {title}
      </span>
      {rows.length === 0 ? (
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Sin sesgo cargado
        </span>
      ) : (
        rows.map(({ currency, level }) => {
          const before = previous?.[currency];
          const delta = before ? BIAS_SCORE[level] - BIAS_SCORE[before] : 0;
          return (
            <div key={currency} className="flex items-center justify-between gap-2" title={`${currency}: ${BIAS_LABELS[level]}${before && delta !== 0 ? ` (antes ${BIAS_LABELS[before]})` : ''}`}>
              <span className="text-sm font-bold tracking-wide" style={{ color: BIAS_COLORS[level] }}>
                {currency}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {BIAS_LABELS[level]}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export function WeekBiasSidebar({ weekStart }: { weekStart: string }) {
  const { biases } = useMacroData();
  const start = localMidnight(weekStart);
  const end = isCurrentWeek(weekStart) ? Date.now() : localMidnight(shiftWeek(weekStart, 1)) - 1;

  const pre: Partial<Record<Currency, BiasLevel | null>> = {};
  const now: Partial<Record<Currency, BiasLevel | null>> = {};
  for (const c of CURRENCIES) {
    const bias = biases[c];
    if (!bias) continue;
    pre[c] = levelAt(bias, start);
    now[c] = isCurrentWeek(weekStart) ? bias.current.level : levelAt(bias, end);
  }

  return (
    <div className="flex flex-col gap-4 lg:pl-4" style={{ borderLeft: '2px solid var(--series-1)' }}>
      <div className="pl-3 lg:pl-0">
        <BiasList title="Pre semana" rows={ranked(pre)} />
      </div>
      <div className="pl-3 lg:pl-0">
        <BiasList title={isCurrentWeek(weekStart) ? 'Semana actual' : 'Cierre de semana'} rows={ranked(now)} previous={pre} />
      </div>
      <p className="pl-3 text-[10px] lg:pl-0" style={{ color: 'var(--text-muted)' }}>
        Sale del Cuadro de Sesgo Semanal — se actualiza solo al cambiar el sesgo de cada divisa.
      </p>
    </div>
  );
}
