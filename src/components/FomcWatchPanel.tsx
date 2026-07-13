import { upcomingFomcMeetings } from '../data/fomcMeetings';
import { useMacroData } from '../data/MacroDataContext';
import { formatDate } from '../lib/format';

export function FomcWatchPanel() {
  const { fomcWatch } = useMacroData();
  const meetings = upcomingFomcMeetings();

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            FOMC Watch — Qué descuenta el mercado
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Probabilidad que el mercado de futuros asigna a cada resultado de la próxima reunión de la Fed. Carga
            manual (ver{' '}
            <a
              href="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              CME FedWatch
            </a>
            ) desde "Actualizar Datos".
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {meetings.map((m) => {
          const p = fomcWatch[m.date];
          const hasData = p && p.probCut + p.probHold + p.probHike > 0;
          return (
            <div key={m.date}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(m.date)}
                  {m.sep && (
                    <span className="ml-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      (con proyecciones)
                    </span>
                  )}
                </span>
                {hasData && p.note && <span style={{ color: 'var(--text-muted)' }}>{p.note}</span>}
              </div>
              {hasData ? (
                <>
                  <div className="mt-1 flex h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--gridline)' }}>
                    {p.probCut > 0 && (
                      <div style={{ width: `${p.probCut}%`, background: 'var(--status-good)' }} title={`Baja: ${p.probCut}%`} />
                    )}
                    {p.probHold > 0 && (
                      <div
                        style={{ width: `${p.probHold}%`, background: 'var(--text-muted)' }}
                        title={`Mantiene: ${p.probHold}%`}
                      />
                    )}
                    {p.probHike > 0 && (
                      <div style={{ width: `${p.probHike}%`, background: 'var(--status-critical)' }} title={`Sube: ${p.probHike}%`} />
                    )}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    <span>Baja {p.probCut}%</span>
                    <span>Mantiene {p.probHold}%</span>
                    <span>Sube {p.probHike}%</span>
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Sin datos cargados
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
