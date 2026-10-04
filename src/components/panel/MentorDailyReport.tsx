import { useEffect, useMemo, useState } from 'react';
import { useJournal } from '../../data/JournalContext';
import { useMacroData } from '../../data/MacroDataContext';
import { todayLocalDate, weekStartOf, formatWeekRange, datesOfWeek, dayLabel } from '../../lib/journalWeek';
import type { JournalEntry } from '../../types';

// Informe Diario de Mentoría + Agente IA (2-oct-2026, a pedido del usuario)
// — una nota de texto por día, que el agente IA (vía
// api/trading-alert-email.ts?action=mentor-analyze) resume en catalizadores
// / niveles clave / escenario esperado. Los viernes a la noche, un cron de
// GitHub Actions compila los 7 días de la semana en una síntesis ejecutiva
// (?action=mentor-synthesize) — acá también hay un botón para generarla a
// mano sin esperar al cron.
//
// Navegación por día + Bóveda de historial (4-oct-2026, el usuario notó que
// solo se podía ver "hoy") — mismo patrón que EconomyNotebook.tsx: pestañas
// Lun-Dom de la semana en curso para editar, más un modal aparte para
// revisar semanas pasadas (solo lectura).

const COLLAPSED_KEY = 'hikman:mentor-report-collapsed';

function pastWeeks(entries: JournalEntry[]): string[] {
  const currentWeek = weekStartOf(todayLocalDate());
  const weeks = new Set(entries.filter((e) => e.kind === 'mentoria').map((e) => weekStartOf(e.date)));
  weeks.delete(currentWeek);
  return [...weeks].sort((a, b) => b.localeCompare(a));
}

function MentorHistoryModal({ onClose }: { onClose: () => void }) {
  const { entries } = useJournal();
  const weeks = useMemo(() => pastWeeks(entries), [entries]);
  const [selected, setSelected] = useState(weeks[0]);

  const weekEntries = useMemo(() => {
    if (!selected) return [];
    const dates = datesOfWeek(selected);
    return dates.map((d) => entries.find((e) => e.kind === 'mentoria' && e.date === d)).filter((e): e is JournalEntry => !!e && e.text.length > 0);
  }, [entries, selected]);

  return (
    <div className="fixed inset-0 z-[60] flex overflow-y-auto p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} role="dialog" aria-modal="true">
      <div className="m-auto w-full max-w-2xl rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            🗄️ Bóveda del Informe Diario Nufal
          </h3>
          <button onClick={onClose} className="shrink-0 rounded-md px-2 py-1 text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            ✕ Cerrar
          </button>
        </div>

        {weeks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Todavía no hay semanas archivadas.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {weeks.map((w) => (
                <button
                  key={w}
                  onClick={() => setSelected(w)}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: selected === w ? 'var(--series-1)' : 'transparent', color: selected === w ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  {formatWeekRange(w)}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {weekEntries.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Esa semana no tiene informes cargados.</p>
              ) : (
                weekEntries.map((e) => (
                  <div key={e.id} className="flex flex-col gap-1.5 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {dayLabel(e.date)} · {e.date}
                    </span>
                    <p className="whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {e.text}
                    </p>
                    {e.aiAnalysis?.scenario && (
                      <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                        {e.aiAnalysis.scenario}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MentorDailyReport() {
  const { entries, syntheses, saveEntry, setAiAnalysis, addSynthesis, uploadJournalImage } = useJournal();
  const { syncMode } = useMacroData();
  const today = todayLocalDate();
  const weekStart = weekStartOf(today);
  const days = useMemo(() => datesOfWeek(weekStart), [weekStart]);
  const [selectedDay, setSelectedDay] = useState(today);
  const [showHistory, setShowHistory] = useState(false);
  const entry = entries.find((e) => e.kind === 'mentoria' && e.date === selectedDay);
  const synthesis = syntheses.find((s) => s.weekStart === weekStart);

  const [text, setText] = useState(entry?.text ?? '');
  const [analyzing, setAnalyzing] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Carga manual del análisis (4-oct-2026) — mientras Gemini está limitado
  // por cuota y no hay key de Anthropic todavía, el usuario puede llevar el
  // texto a una IA externa (chat de Gemini/ChatGPT/Claude) y pegar acá los
  // catalizadores/niveles/escenario a mano — se guarda igual que si lo
  // hubiera generado el botón "Analizar con IA".
  const [showManual, setShowManual] = useState(false);
  const [manualCatalysts, setManualCatalysts] = useState('');
  const [manualKeyLevels, setManualKeyLevels] = useState('');
  const [manualScenario, setManualScenario] = useState('');
  // Minimizar la sección (4-oct-2026, mismo pedido que la Agenda Semanal) —
  // para no tener que bajar tanto hasta el Cuaderno de Economía.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setText(entry?.text ?? '');
  }, [selectedDay, entry?.id]);

  function handleTextBlur() {
    if (text === (entry?.text ?? '')) return;
    saveEntry('mentoria', selectedDay, { text });
  }

  async function handleAnalyze() {
    if (!text.trim()) return;
    setError(null);
    setAnalyzing(true);
    try {
      const saved = await saveEntry('mentoria', selectedDay, { text });
      const res = await fetch('/api/trading-alert-email?action=mentor-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await setAiAnalysis(saved.id, data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function openManual() {
    setManualCatalysts(entry?.aiAnalysis?.catalysts.join('\n') ?? '');
    setManualKeyLevels(entry?.aiAnalysis?.keyLevels.join('\n') ?? '');
    setManualScenario(entry?.aiAnalysis?.scenario ?? '');
    setShowManual(true);
  }

  async function handleSaveManual() {
    setError(null);
    try {
      const saved = await saveEntry('mentoria', selectedDay, { text });
      await setAiAnalysis(saved.id, {
        catalysts: manualCatalysts.split('\n').map((s) => s.trim()).filter(Boolean),
        keyLevels: manualKeyLevels.split('\n').map((s) => s.trim()).filter(Boolean),
        scenario: manualScenario.trim(),
        analyzedAt: new Date().toISOString(),
      });
      setShowManual(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSynthesize() {
    setError(null);
    setSynthesizing(true);
    try {
      const res = await fetch('/api/trading-alert-email?action=mentor-synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.generated === false) {
        setError(data.reason || 'No se pudo generar la síntesis.');
        return;
      }
      await addSynthesis(weekStart, data.content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSynthesizing(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadJournalImage(file);
      const nextUrls = [...(entry?.imageUrls ?? []), url];
      await saveEntry('mentoria', selectedDay, { text, imageUrls: nextUrls });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold"
            style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            title={collapsed ? 'Expandir Informe Diario Nufal' : 'Minimizar Informe Diario Nufal'}
          >
            <span className="text-sm leading-none" style={{ color: 'var(--series-1)' }}>
              {collapsed ? '▸' : '▾'}
            </span>
            🧠 Informe Diario Nufal (IA)
          </button>
          {!collapsed && (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Carga obligatoria diaria — el agente IA extrae catalizadores, niveles clave y el escenario esperado.
            </p>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setShowHistory(true)} className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Historial (Bóveda)
          </button>
        )}
      </div>

      {!collapsed && (
      <>
      <div className="flex gap-1 overflow-x-auto rounded-full p-0.5" style={{ border: '1px solid var(--border)' }}>
        {days.map((d) => {
          const hasEntry = entries.some((e) => e.kind === 'mentoria' && e.date === d && e.text.length > 0);
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className="relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: selectedDay === d ? 'var(--series-1)' : 'transparent', color: selectedDay === d ? '#fff' : 'var(--text-secondary)' }}
            >
              {dayLabel(d, true)}
              {hasEntry && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full" style={{ background: selectedDay === d ? '#fff' : 'var(--series-1)' }} />}
            </button>
          );
        })}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleTextBlur}
        placeholder="Pegá o escribí el resumen del mentor de este día…"
        rows={5}
        className="w-full resize-none rounded-md px-3 py-2 text-sm"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />

      {entry?.imageUrls && entry.imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.imageUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="" className="h-16 w-16 rounded-md object-cover" style={{ border: '1px solid var(--border)' }} />
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !text.trim()}
          className="rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--series-1)' }}
        >
          {analyzing ? 'Analizando…' : '🪄 Analizar con IA'}
        </button>
        <button
          onClick={openManual}
          className="rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          ✍️ Cargar análisis manual
        </button>
        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <input type="file" accept="image/*" disabled={syncMode !== 'cloud' || uploading} onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
          <span className="cursor-pointer rounded-full px-3 py-1.5" style={{ border: '1px solid var(--border)' }}>
            {uploading ? 'Subiendo…' : '📎 Adjuntar imagen'}
          </span>
        </label>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--delta-bad)' }}>{error}</p>}

      {entry?.aiAnalysis && (
        <div className="flex flex-col gap-2 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Análisis de Puntos Clave y Catalizadores
          </h4>
          {entry.aiAnalysis.catalysts.length > 0 && (
            <ul className="list-inside list-disc text-sm" style={{ color: 'var(--text-secondary)' }}>
              {entry.aiAnalysis.catalysts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {entry.aiAnalysis.keyLevels.length > 0 && (
            <div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Niveles clave:{' '}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {entry.aiAnalysis.keyLevels.join(' · ')}
              </span>
            </div>
          )}
          {entry.aiAnalysis.scenario && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {entry.aiAnalysis.scenario}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Síntesis Semanal ({formatWeekRange(weekStart)})
          </h4>
          <button
            onClick={handleSynthesize}
            disabled={synthesizing}
            className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {synthesizing ? 'Generando…' : synthesis ? '⟳ Regenerar' : 'Generar ahora'}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Se compila sola los viernes a la noche a partir de los informes diarios de la semana — o generala ahora manualmente.
        </p>
        {synthesis && (
          <p className="whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
            {synthesis.content}
          </p>
        )}
      </div>
      </>
      )}

      {showHistory && <MentorHistoryModal onClose={() => setShowHistory(false)} />}

      {showManual && (
        <div
          className="fixed inset-0 z-50 flex overflow-y-auto p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowManual(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Cargar análisis manual"
        >
          <div className="m-auto w-full max-w-lg rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              ✍️ Cargar análisis manual
            </h3>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Llevá el texto del día a una IA externa (Gemini, ChatGPT, Claude…), pedile catalizadores/niveles clave/escenario, y pegá acá lo que te responda.
            </p>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Catalizadores (uno por línea)
                <textarea
                  value={manualCatalysts}
                  onChange={(e) => setManualCatalysts(e.target.value)}
                  rows={3}
                  placeholder={'Ej. CPI por debajo de lo esperado\nFOMC con tono hawkish'}
                  className="w-full resize-none rounded-md px-2.5 py-1.5 text-sm"
                  style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Niveles clave (opcional, uno por línea)
                <textarea
                  value={manualKeyLevels}
                  onChange={(e) => setManualKeyLevels(e.target.value)}
                  rows={2}
                  placeholder={'Ej. Soporte 1.0850\nResistencia 1.0950'}
                  className="w-full resize-none rounded-md px-2.5 py-1.5 text-sm"
                  style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Escenario esperado
                <textarea
                  value={manualScenario}
                  onChange={(e) => setManualScenario(e.target.value)}
                  rows={3}
                  placeholder="Ej. Se espera continuidad del rally mientras..."
                  className="w-full resize-none rounded-md px-2.5 py-1.5 text-sm"
                  style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowManual(false)} className="rounded-full px-3 py-1.5 text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
              <button onClick={handleSaveManual} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--series-1)', color: '#fff' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
