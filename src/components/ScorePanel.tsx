import type { ScoreRow } from '../types';

function valoracionColor(v: number): string {
  if (v > 0) return 'var(--status-good)';
  if (v < 0) return 'var(--status-critical)';
  return 'var(--text-muted)';
}

interface ScorePanelProps {
  rows: ScoreRow[];
  title?: string;
  /** Si se pasa, cada fila se vuelve editable con un <select> que llama a esto. */
  onChangeValoracion?: (id: string, valoracion: number) => void;
}

export function ScorePanel({ rows, title = 'Score Compuesto USD', onChangeValoracion }: ScorePanelProps) {
  const counted = rows.filter((r) => r.weight !== 'Informativo');
  const total = counted.reduce((sum, r) => sum + r.valoracion, 0);
  const max = counted.length * 2;

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {onChangeValoracion
              ? 'Suma de valoraciones manuales (−2 a +2) de los indicadores núcleo. Se actualiza al instante.'
              : 'Suma de valoraciones manuales (−2 a +2) de los indicadores núcleo.'}
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-3xl font-bold tabular-nums"
            style={{ color: total > 0 ? 'var(--delta-good)' : total < 0 ? 'var(--delta-bad)' : 'var(--text-primary)' }}
          >
            {total > 0 ? '+' : ''}
            {total}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            rango −{max} a +{max}
          </div>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--gridline)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((total + max) / (2 * max)) * 100}%`,
            background: total >= 0 ? 'var(--status-good)' : 'var(--status-critical)',
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-2 py-1 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
            {onChangeValoracion ? (
              <select
                value={row.valoracion}
                onChange={(e) => onChangeValoracion(row.id, Number(e.target.value))}
                className="rounded-md px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums"
                style={{ color: valoracionColor(row.valoracion), border: '1px solid var(--border)', background: 'var(--surface-2)' }}
              >
                {[-2, -1, 0, 1, 2].map((v) => (
                  <option key={v} value={v}>
                    {v > 0 ? '+' : ''}
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="min-w-[2rem] rounded-md px-1.5 text-center text-xs font-semibold tabular-nums"
                style={{ color: valoracionColor(row.valoracion), border: '1px solid var(--border)' }}
              >
                {row.valoracion > 0 ? '+' : ''}
                {row.valoracion}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
