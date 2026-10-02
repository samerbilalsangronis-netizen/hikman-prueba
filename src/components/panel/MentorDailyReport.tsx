import { useEffect, useState } from 'react';
import { useJournal } from '../../data/JournalContext';
import { useMacroData } from '../../data/MacroDataContext';
import { todayLocalDate, weekStartOf, formatWeekRange } from '../../lib/journalWeek';

// Informe Diario de Mentoría + Agente IA (2-oct-2026, a pedido del usuario)
// — una nota de texto por día (hoy), que el agente IA (Anthropic, vía
// api/trading-alert-email.ts?action=mentor-analyze) resume en catalizadores
// / niveles clave / escenario esperado. Los viernes a la noche, un cron de
// GitHub Actions compila los 7 días de la semana en una síntesis ejecutiva
// (?action=mentor-synthesize) — acá también hay un botón para generarla a
// mano sin esperar al cron.

export function MentorDailyReport() {
  const { entries, syntheses, saveEntry, setAiAnalysis, addSynthesis, uploadJournalImage } = useJournal();
  const { syncMode } = useMacroData();
  const today = todayLocalDate();
  const weekStart = weekStartOf(today);
  const entry = entries.find((e) => e.kind === 'mentoria' && e.date === today);
  const synthesis = syntheses.find((s) => s.weekStart === weekStart);

  const [text, setText] = useState(entry?.text ?? '');
  const [analyzing, setAnalyzing] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(entry?.text ?? '');
  }, [entry?.id]);

  function handleTextBlur() {
    if (text === (entry?.text ?? '')) return;
    saveEntry('mentoria', today, { text });
  }

  async function handleAnalyze() {
    if (!text.trim()) return;
    setError(null);
    setAnalyzing(true);
    try {
      const saved = await saveEntry('mentoria', today, { text });
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
      await saveEntry('mentoria', today, { text, imageUrls: nextUrls });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          🧠 Informe Diario Nufal (IA)
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Carga obligatoria diaria — el agente IA extrae catalizadores, niveles clave y el escenario esperado.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleTextBlur}
        placeholder="Pegá o escribí el resumen de hoy del mentor…"
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
    </div>
  );
}
