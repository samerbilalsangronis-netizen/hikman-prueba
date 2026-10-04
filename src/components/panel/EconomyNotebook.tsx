import { useEffect, useMemo, useState } from 'react';
import { useJournal } from '../../data/JournalContext';
import { useMacroData } from '../../data/MacroDataContext';
import { JOURNAL_COLORS, JOURNAL_COLOR_HEX, JOURNAL_COLOR_LABELS } from '../../lib/journalColors';
import { dayLabel, datesOfWeek, formatWeekRange, todayLocalDate, weekStartOf } from '../../lib/journalWeek';
import type { JournalColor, JournalEntry } from '../../types';

// Cuaderno de Economía (2-oct-2026, a pedido del usuario) — diario tipo
// "feed" con una entrada por día (lunes a domingo), color semántico y fotos
// opcionales. No hay una acción de "archivar": cualquier entrada cuya fecha
// cae fuera de la semana en curso ya cuenta como historial (ver
// lib/journalWeek.ts) — la Bóveda solo agrupa y muestra lo que ya pasó.

function ColorPicker({ value, onChange }: { value: JournalColor; onChange: (c: JournalColor) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {JOURNAL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={JOURNAL_COLOR_LABELS[c]}
          className="h-6 w-6 rounded-full transition-transform"
          style={{
            background: JOURNAL_COLOR_HEX[c],
            outline: value === c ? '2px solid var(--text-primary)' : 'none',
            outlineOffset: 2,
            transform: value === c ? 'scale(1.1)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  );
}

function EntryImages({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="" className="h-16 w-16 rounded-md object-cover" style={{ border: '1px solid var(--border)' }} />
        </a>
      ))}
    </div>
  );
}

function DayEditor({ date }: { date: string }) {
  const { entries, saveEntry, uploadJournalImage } = useJournal();
  const { syncMode } = useMacroData();
  const entry = entries.find((e) => e.kind === 'economia' && e.date === date);
  const [text, setText] = useState(entry?.text ?? '');
  const [color, setColor] = useState<JournalColor>(entry?.color ?? 'gris');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(entry?.text ?? '');
    setColor(entry?.color ?? 'gris');
  }, [entry?.id, date]);

  function handleColorChange(c: JournalColor) {
    setColor(c);
    saveEntry('economia', date, { color: c });
  }

  function handleTextBlur() {
    if (text === (entry?.text ?? '')) return;
    saveEntry('economia', date, { text });
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadJournalImage(file);
      const nextUrls = [...(entry?.imageUrls ?? []), url];
      await saveEntry('economia', date, { imageUrls: nextUrls });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {dayLabel(date)} · {new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
        </span>
        <ColorPicker value={color} onChange={handleColorChange} />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleTextBlur}
        placeholder="Narrativa del mercado de hoy… (ej. CPI USD sorprendió a la baja)"
        rows={4}
        className="w-full resize-none rounded-md px-3 py-2 text-sm"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      <EntryImages urls={entry?.imageUrls ?? []} />
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          disabled={syncMode !== 'cloud' || uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
        />
        {uploading && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Subiendo…</span>}
      </div>
      {syncMode !== 'cloud' && (
        <p className="text-[11px]" style={{ color: 'var(--status-warning)' }}>
          Subir imágenes necesita Supabase configurado.
        </p>
      )}
      {error && <p className="text-xs" style={{ color: 'var(--delta-bad)' }}>{error}</p>}
    </div>
  );
}

function pastWeeks(entries: JournalEntry[]): string[] {
  const currentWeek = weekStartOf(todayLocalDate());
  const weeks = new Set(entries.filter((e) => e.kind === 'economia').map((e) => weekStartOf(e.date)));
  weeks.delete(currentWeek);
  return [...weeks].sort((a, b) => b.localeCompare(a));
}

function HistoryModal({ onClose }: { onClose: () => void }) {
  const { entries } = useJournal();
  const weeks = useMemo(() => pastWeeks(entries), [entries]);
  const [selected, setSelected] = useState(weeks[0]);

  const weekEntries = useMemo(() => {
    if (!selected) return [];
    const dates = datesOfWeek(selected);
    return dates.map((d) => entries.find((e) => e.kind === 'economia' && e.date === d)).filter((e): e is JournalEntry => !!e && (e.text.length > 0 || e.imageUrls.length > 0));
  }, [entries, selected]);

  return (
    <div className="fixed inset-0 z-[60] flex overflow-y-auto p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} role="dialog" aria-modal="true">
      <div className="m-auto w-full max-w-2xl rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            🗄️ Bóveda del Cuaderno de Economía
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
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Esa semana no tiene entradas.</p>
              ) : (
                weekEntries.map((e) => (
                  <div key={e.id} className="flex flex-col gap-1.5 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: JOURNAL_COLOR_HEX[e.color] }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {dayLabel(e.date)} · {e.date}
                      </span>
                    </div>
                    {e.text && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{e.text}</p>}
                    <EntryImages urls={e.imageUrls} />
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

export function EconomyNotebook() {
  const today = todayLocalDate();
  const currentWeekStart = weekStartOf(today);
  const days = useMemo(() => datesOfWeek(currentWeekStart), [currentWeekStart]);
  const [selectedDay, setSelectedDay] = useState(today);
  const [showHistory, setShowHistory] = useState(false);
  const { entries } = useJournal();

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            📓 Cuaderno de Economía
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Bitácora diaria de la narrativa del mercado — semana {formatWeekRange(currentWeekStart)}.
          </p>
        </div>
        <button onClick={() => setShowHistory(true)} className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Historial (Bóveda)
        </button>
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-full p-0.5" style={{ border: '1px solid var(--border)' }}>
        {days.map((d) => {
          const hasEntry = entries.some((e) => e.kind === 'economia' && e.date === d && (e.text.length > 0 || e.imageUrls.length > 0));
          const entryColor = entries.find((e) => e.kind === 'economia' && e.date === d)?.color;
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className="relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: selectedDay === d ? 'var(--series-1)' : 'transparent', color: selectedDay === d ? '#fff' : 'var(--text-secondary)' }}
            >
              {dayLabel(d, true)}
              {hasEntry && entryColor && (
                <span
                  className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: JOURNAL_COLOR_HEX[entryColor] }}
                />
              )}
            </button>
          );
        })}
      </div>

      <DayEditor date={selectedDay} />

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
