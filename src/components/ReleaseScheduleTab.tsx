// Pestaña que no navega a ningún lado — al pasar el mouse muestra un
// resumen de CUÁNDO suele publicarse cada tipo de dato. Pedido explícito
// del usuario, con dos ejemplos concretos (CPI 3ra semana del mes, PMI
// preliminar 3ra semana + final 1-2 semanas después) que se generalizaron
// al resto de los tipos de indicador más comunes del dashboard. Son
// patrones habituales, no una fecha exacta por país — cada indicador
// puntual puede variar un poco.
const SCHEDULE_GROUPS: { title: string; rows: { label: string; timing: string }[] }[] = [
  {
    title: 'Inflación',
    rows: [
      { label: 'IPC / CPI', timing: 'Se publica ~la 2ª-3ª semana del mes, con el dato del mes anterior.' },
      { label: 'IPC de Tokio (JPY)', timing: 'Adelanto del CPI nacional — sale ~3-4 semanas antes, fin del mes en curso.' },
      { label: 'PPI / Precios al productor', timing: 'Similar al CPI, unos días antes o después según el país.' },
    ],
  },
  {
    title: 'PMI',
    rows: [
      {
        label: 'Con Flash (EUR, GBP, JPY, AUD, USD-S&P Global)',
        timing: 'Preliminar (flash) ~3ª semana del mes en curso. Final 1-2 semanas después (fin de mes / 1°-3° día hábil del mes siguiente).',
      },
      { label: 'ISM (USD)', timing: 'Una sola publicación: 1° día hábil del mes siguiente (Manufactura) y ~3° día hábil (Servicios).' },
      { label: 'CAD / CHF', timing: 'Una sola publicación, sin flash: 1°-3° día hábil del mes siguiente.' },
      { label: 'NZD (BusinessNZ)', timing: 'Una sola publicación, sin flash: ~10-15 días hábiles después de cerrado el mes — el más lento del grupo.' },
      { label: 'CNY (NBS)', timing: 'Una sola publicación: último día del mes o 1° día hábil del mes siguiente.' },
    ],
  },
  {
    title: 'Empleo',
    rows: [
      { label: 'Nóminas no agrícolas (USD)', timing: 'Primer viernes del mes siguiente.' },
      { label: 'Tasa de desempleo', timing: 'Suele salir junto con el dato de nóminas/empleo del mes.' },
    ],
  },
  {
    title: 'Crecimiento',
    rows: [
      { label: 'PIB / GDP', timing: 'Trimestral. Primera estimación ~4-6 semanas después de cerrado el trimestre, con 1-2 revisiones posteriores.' },
      { label: 'Ventas Minoristas', timing: 'Mensual, ~2ª-3ª semana del mes siguiente.' },
    ],
  },
  {
    title: 'Bancos centrales',
    rows: [
      { label: 'Decisiones de tasas', timing: 'Calendario propio de cada banco (6-8 reuniones al año) — no es mensual, ver la sección Tasas.' },
    ],
  },
];

export function ReleaseScheduleTab() {
  return (
    <div className="group relative hidden sm:block">
      <span
        tabIndex={0}
        className="inline-flex cursor-default items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        📅 Cuándo se publican
      </span>
      <div
        className="invisible absolute right-0 top-full z-20 mt-1 w-[min(90vw,420px)] rounded-xl p-3 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Cuándo suele salir cada dato (patrón habitual, no fecha exacta)
        </p>
        <div className="flex flex-col gap-3">
          {SCHEDULE_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold" style={{ color: 'var(--series-1)' }}>
                {group.title}
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {group.rows.map((row) => (
                  <li key={row.label} className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {row.label}:
                    </span>{' '}
                    {row.timing}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
