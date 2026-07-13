import { useState } from 'react';
import { INDICATORS, SECTION_LABELS } from '../data/indicators';
import { useMacroData } from '../data/MacroDataContext';
import { formatValue } from '../lib/format';
import { getFreshness } from '../lib/freshness';
import { FreshnessBadge } from '../components/FreshnessBadge';

function IndicatorRow({ id }: { id: string }) {
  const meta = INDICATORS.find((m) => m.id === id)!;
  const { getSeries, addPoint, removeLastPoint } = useMacroData();
  const points = getSeries(id);
  const last = points[points.length - 1];
  const freshness = getFreshness(points, meta.frequency);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [value, setValue] = useState('');

  const isPercentFormat = meta.format === 'pct' || meta.format === 'pct1';

  function handleSave() {
    const raw = parseFloat(value);
    if (Number.isNaN(raw)) return;
    const stored = isPercentFormat ? raw / 100 : raw;
    addPoint(id, date, stored);
    setValue('');
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="py-2.5 pr-3">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {meta.label}
        </div>
        <div className="mt-0.5">
          <FreshnessBadge freshness={freshness} />
        </div>
      </td>
      <td className="py-2.5 pr-3 text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {last ? formatValue(last[1], meta.format) : '—'}
        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {last?.[0] ?? 'sin dato'}
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-36 rounded-md px-2 py-1 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isPercentFormat ? '%' : 'valor'}
            className="w-24 rounded-md px-2 py-1 text-sm tabular-nums"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          {isPercentFormat && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>%</span>}
        </div>
      </td>
      <td className="py-2.5 text-right">
        <button
          onClick={handleSave}
          disabled={value === ''}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: 'var(--series-1)' }}
        >
          Guardar
        </button>
        <button
          onClick={() => removeLastPoint(id)}
          className="ml-2 rounded-md px-2 py-1.5 text-xs"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          title="Deshacer el último punto que agregaste"
        >
          Deshacer
        </button>
      </td>
    </tr>
  );
}

export function Actualizar() {
  const { scoreRows, updateScoreValoracion, resetOverrides, exportJson } = useMacroData();
  const sections = ['tasas', 'inflacion', 'empleo', 'ism'] as const;

  function handleExport() {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historical-series.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    if (confirm('Esto borrará todos los datos que agregaste manualmente en este navegador. ¿Continuar?')) {
      resetOverrides();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Actualizar Datos
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          Agrega el último dato publicado de cada indicador, igual que hacías pegando valores en el Excel. Se guarda
          en este navegador al instante. Cuando quieras dejarlo fijo para todos, pulsa <strong>“Exportar JSON”</strong>{' '}
          y reemplaza <code>src/data/historical-series.json</code> en el repositorio.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          className="rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--series-2)' }}
        >
          Exportar JSON
        </button>
        <button
          onClick={handleReset}
          className="rounded-md px-4 py-2 text-sm font-semibold"
          style={{ color: 'var(--delta-bad)', border: '1px solid var(--border)' }}
        >
          Borrar cambios locales
        </button>
      </div>

      {sections.map((section) => (
        <div key={section}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {SECTION_LABELS[section]}
          </h2>
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full" style={{ background: 'var(--surface-1)' }}>
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                  <th className="px-3 pt-3 pb-2 font-medium">Indicador</th>
                  <th className="px-3 pt-3 pb-2 font-medium">Último dato</th>
                  <th className="px-3 pt-3 pb-2 font-medium">Fecha nueva</th>
                  <th className="px-3 pt-3 pb-2 font-medium">Valor nuevo</th>
                  <th className="px-3 pt-3 pb-2" />
                </tr>
              </thead>
              <tbody className="px-3">
                {INDICATORS.filter((m) => m.section === section).map((m) => (
                  <IndicatorRow key={m.id} id={m.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Score Compuesto USD — Valoración manual
        </h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Juicio del analista por indicador, de −2 (muy bajista para el USD) a +2 (muy alcista).
        </p>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full" style={{ background: 'var(--surface-1)' }}>
            <thead>
              <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                <th className="px-3 pt-3 pb-2 font-medium">Indicador</th>
                <th className="px-3 pt-3 pb-2 font-medium">Ponderación</th>
                <th className="px-3 pt-3 pb-2 font-medium">Valoración</th>
              </tr>
            </thead>
            <tbody>
              {scoreRows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {row.label}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {row.weight}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.valoracion}
                      onChange={(e) => updateScoreValoracion(row.id, Number(e.target.value))}
                      className="rounded-md px-2 py-1 text-sm tabular-nums"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      {[-2, -1, 0, 1, 2].map((v) => (
                        <option key={v} value={v}>
                          {v > 0 ? '+' : ''}
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
