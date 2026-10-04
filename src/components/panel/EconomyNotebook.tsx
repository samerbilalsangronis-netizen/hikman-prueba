import { useEffect, useMemo, useRef, useState } from 'react';
import { useJournal } from '../../data/JournalContext';
import { useMacroData } from '../../data/MacroDataContext';
import { JOURNAL_COLORS, JOURNAL_COLOR_HEX, JOURNAL_COLOR_LABELS } from '../../lib/journalColors';
import { JOURNAL_STICKERS } from '../../lib/journalStickers';
import { sanitizeJournalHtml, stickerHtml, toDisplayHtml, transformSelectionCase, type CaseMode } from '../../lib/richText';
import { dayLabel, datesOfWeek, formatWeekRange, todayLocalDate, weekStartOf } from '../../lib/journalWeek';
import type { JournalEntry, PinnedImage } from '../../types';

// Cuaderno de Economía (2-oct-2026, editor de texto enriquecido agregado
// 4-oct-2026 a pedido del usuario) — diario tipo "feed" con una entrada por
// día (lunes a domingo) y fotos opcionales. El texto es un contentEditable
// (mismo patrón que el resumen semanal de CurrencyBiasCard.tsx): se puede
// seleccionar una frase y resaltarla con cualquiera de los 6 colores de la
// escala de sentimiento, o insertar un "sticker" de referencia (Hawkish/
// Dovish/etc.) en el cursor. No hay una acción de "archivar": cualquier
// entrada cuya fecha cae fuera de la semana en curso ya cuenta como
// historial (ver lib/journalWeek.ts) — la Bóveda solo agrupa y muestra lo
// que ya pasó.

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

const PIN_DEFAULT_SIZE = { width: 220, height: 160 };
const PIN_MIN_SIZE = 60;

type PinDrag = { mode: 'move' | 'resize'; pointerId: number; startX: number; startY: number; orig: { x: number; y: number; width: number; height: number } };

/** Captura pegada que flota libre sobre el cuaderno (4-oct-2026) — se mueve
 * arrastrando la imagen y se redimensiona desde la esquina inferior derecha,
 * ambos con Pointer Events (sin librería nueva). Mientras se arrastra, la
 * posición vive en estado local (no se guarda en cada pixel de movimiento,
 * eso saturaría Supabase) — el commit real al cuaderno pasa solo al soltar
 * (pointerup), vía onCommit. Bloqueada (locked) desactiva ambos gestos. */
function PinnedImageBox({ image, onCommit, onDelete }: { image: PinnedImage; onCommit: (patch: Partial<Pick<PinnedImage, 'x' | 'y' | 'width' | 'height' | 'locked'>>) => void; onDelete: () => void }) {
  const [box, setBox] = useState({ x: image.x, y: image.y, width: image.width, height: image.height });
  const dragRef = useRef<PinDrag | null>(null);

  useEffect(() => {
    if (!dragRef.current) setBox({ x: image.x, y: image.y, width: image.width, height: image.height });
  }, [image.x, image.y, image.width, image.height]);

  function startDrag(e: React.PointerEvent, mode: PinDrag['mode']) {
    if (image.locked) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, orig: box };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.mode === 'move') {
      setBox({ ...drag.orig, x: Math.max(0, drag.orig.x + dx), y: Math.max(0, drag.orig.y + dy) });
    } else {
      setBox({ ...drag.orig, width: Math.max(PIN_MIN_SIZE, drag.orig.width + dx), height: Math.max(PIN_MIN_SIZE, drag.orig.height + dy) });
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
    onCommit(box);
  }

  return (
    <div
      className="journal-pin-box"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={image.url}
        alt="Captura pegada"
        draggable={false}
        onPointerDown={(e) => startDrag(e, 'move')}
        style={{ border: image.locked ? '1px solid var(--border)' : '2px solid var(--series-1)', cursor: image.locked ? 'default' : 'grab' }}
      />
      <div className="journal-pin-controls">
        <button type="button" className="journal-pin-btn" title={image.locked ? 'Desbloquear' : 'Bloquear para que no se mueva'} onClick={() => onCommit({ locked: !image.locked })}>
          {image.locked ? '🔒' : '🔓'}
        </button>
        <button type="button" className="journal-pin-btn" title="Eliminar captura" onClick={onDelete}>
          ✕
        </button>
      </div>
      {!image.locked && <div className="journal-pin-handle" title="Arrastrá para agrandar/achicar" onPointerDown={(e) => startDrag(e, 'resize')} />}
    </div>
  );
}

function PinCanvas({ images, onChange, onDelete }: { images: PinnedImage[]; onChange: (id: string, patch: Partial<Pick<PinnedImage, 'x' | 'y' | 'width' | 'height' | 'locked'>>) => void; onDelete: (id: string) => void }) {
  const canvasHeight = Math.max(140, ...images.map((img) => img.y + img.height + 16));
  return (
    <div className="journal-pin-canvas" style={{ height: canvasHeight, minHeight: 140 }}>
      {images.length === 0 && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Ctrl+V acá (o en el texto de arriba) para anclar una captura — se puede arrastrar, redimensionar y bloquear.
        </span>
      )}
      {images.map((img) => (
        <PinnedImageBox key={img.id} image={img} onCommit={(patch) => onChange(img.id, patch)} onDelete={() => onDelete(img.id)} />
      ))}
    </div>
  );
}

function DayEditor({ date }: { date: string }) {
  const { entries, saveEntry, uploadJournalImage } = useJournal();
  const { syncMode } = useMacroData();
  const entry = entries.find((e) => e.kind === 'economia' && e.date === date);

  const editorRef = useRef<HTMLDivElement>(null);
  const lastSyncedRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza el contentEditable con entry.text solo cuando el cambio viene
  // de "afuera" (cambiar de día, carga inicial) — nunca mientras el usuario
  // está escribiendo, porque pisarle el innerHTML le resetearía el cursor a
  // cada tecla. Mismo patrón que CurrencyBiasCard.tsx.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = toDisplayHtml(entry?.text ?? '');
    if (document.activeElement === el && lastSyncedRef.current !== null) return;
    el.innerHTML = html;
    lastSyncedRef.current = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, entry?.id]);

  function commitFromDom() {
    const el = editorRef.current;
    if (!el) return;
    const html = sanitizeJournalHtml(el.innerHTML);
    lastSyncedRef.current = html;
    saveEntry('economia', date, { text: html });
  }

  // onMouseDown con preventDefault evita que el botón le robe el foco/la
  // selección al contentEditable antes de aplicar execCommand — si no, la
  // selección de texto ya estaría vacía al hacer click en un color.
  function applyHighlight(hex: string) {
    editorRef.current?.focus();
    // Sin esto, foreColor genera <font color="..."> en vez de
    // <span style="color:...">, que es lo que sabe leer sanitizeJournalHtml.
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, hex);
    commitFromDom();
  }

  function removeHighlight() {
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, 'inherit');
    commitFromDom();
  }

  function insertSticker(label: string, color: string, textColor: string) {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, stickerHtml(label, color, textColor));
    commitFromDom();
  }

  // Negrita/cursiva/subrayado (4-oct-2026, a pedido del usuario) — nativos
  // del navegador; sanitizeJournalHtml ya sabe leer tanto <strong>/<em>/<u>
  // como la versión en estilo inline que puede salir con styleWithCSS
  // activado (ver comentario ahí), así que no hace falta desactivarlo acá.
  function applyBold() {
    editorRef.current?.focus();
    document.execCommand('bold');
    commitFromDom();
  }

  function applyItalic() {
    editorRef.current?.focus();
    document.execCommand('italic');
    commitFromDom();
  }

  function applyUnderline() {
    editorRef.current?.focus();
    document.execCommand('underline');
    commitFromDom();
  }

  // Mayúscula/minúscula/tipo título (4-oct-2026) — transforma el texto
  // SELECCIONADO preservando su formato (ver transformSelectionCase).
  function applyCase(mode: CaseMode) {
    editorRef.current?.focus();
    if (transformSelectionCase(mode)) commitFromDom();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      commitFromDom();
    }
  }

  // Pegar capturas de pantalla directo con Ctrl+V (4-oct-2026, a pedido del
  // usuario) — NO se insertan en el flujo del texto: quedan como un objeto
  // libre en el lienzo de abajo (PinCanvas), que se puede arrastrar a
  // cualquier parte, redimensionar desde la esquina y bloquear en su lugar.
  // Posición inicial escalonada (según cuántas ya hay) para que no caigan
  // todas apiladas exactamente una sobre otra.
  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    let imageFile: File | null = null;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        imageFile = item.getAsFile();
        break;
      }
    }
    if (!imageFile) return; // No es una imagen — dejar que el pegado normal de texto siga su curso.
    e.preventDefault();
    if (syncMode !== 'cloud') {
      setError('Pegar capturas necesita Supabase configurado.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadJournalImage(imageFile);
      const count = entry?.pinnedImages?.length ?? 0;
      const offset = (count % 5) * 24;
      const nextImage: PinnedImage = { id: crypto.randomUUID(), url, x: 16 + offset, y: 16 + offset, width: PIN_DEFAULT_SIZE.width, height: PIN_DEFAULT_SIZE.height, locked: false };
      await saveEntry('economia', date, { pinnedImages: [...(entry?.pinnedImages ?? []), nextImage] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function updatePinnedImage(id: string, patch: Partial<Pick<PinnedImage, 'x' | 'y' | 'width' | 'height' | 'locked'>>) {
    const nextImages = (entry?.pinnedImages ?? []).map((img) => (img.id === id ? { ...img, ...patch } : img));
    saveEntry('economia', date, { pinnedImages: nextImages });
  }

  function deletePinnedImage(id: string) {
    const nextImages = (entry?.pinnedImages ?? []).filter((img) => img.id !== id);
    saveEntry('economia', date, { pinnedImages: nextImages });
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
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {dayLabel(date)} · {new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Resaltar:
        </span>
        {JOURNAL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyHighlight(JOURNAL_COLOR_HEX[c])}
            title={JOURNAL_COLOR_LABELS[c]}
            className="h-6 w-6 rounded-full"
            style={{ background: JOURNAL_COLOR_HEX[c], border: '1px solid var(--border)' }}
          />
        ))}
        {/* Blanco/negro (4-oct-2026) — solo para el texto, no forman parte de
            la escala de sentimiento de 6 colores (JOURNAL_COLORS). */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyHighlight('#ffffff')}
          title="Blanco"
          className="h-6 w-6 rounded-full"
          style={{ background: '#ffffff', border: '1px solid var(--border)' }}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyHighlight('#000000')}
          title="Negro"
          className="h-6 w-6 rounded-full"
          style={{ background: '#000000', border: '1px solid var(--border)' }}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={removeHighlight}
          title="Quitar color"
          className="rounded-md px-2 py-1 text-[11px]"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          ✕ Normal
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Formato:
        </span>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyBold} title="Negrita" className="rounded-md px-2.5 py-1 text-xs font-bold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          N
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyItalic} title="Cursiva" className="rounded-md px-2.5 py-1 text-xs italic" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          K
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyUnderline}
          title="Subrayado"
          className="rounded-md px-2.5 py-1 text-xs underline"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          S
        </button>
        <span className="mx-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          ·
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyCase('upper')}
          title="MAYÚSCULA"
          className="rounded-md px-2.5 py-1 text-[11px] font-medium"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          MAYÚS
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyCase('lower')}
          title="minúscula"
          className="rounded-md px-2.5 py-1 text-[11px] font-medium"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          minús
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyCase('title')}
          title="Tipo Título"
          className="rounded-md px-2.5 py-1 text-[11px] font-medium"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Tipo Título
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Stickers:
        </span>
        {JOURNAL_STICKERS.map((s) => (
          <button
            key={s.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertSticker(s.label, s.color, s.textColor)}
            className="journal-sticker"
            style={{ background: s.color, color: s.textColor, cursor: 'pointer' }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={commitFromDom}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={commitFromDom}
        data-placeholder="Narrativa del mercado de hoy… (ej. CPI USD sorprendió a la baja). Ctrl+V pega capturas, quedan libres abajo."
        className="journal-editable w-full rounded-md px-3 py-2 text-sm"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: '6rem', whiteSpace: 'pre-wrap' }}
      />
      <PinCanvas images={entry?.pinnedImages ?? []} onChange={updatePinnedImage} onDelete={deletePinnedImage} />
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
  const { entries, saveEntry } = useJournal();
  const weeks = useMemo(() => pastWeeks(entries), [entries]);
  const [selected, setSelected] = useState(weeks[0]);

  const weekEntries = useMemo(() => {
    if (!selected) return [];
    const dates = datesOfWeek(selected);
    return dates
      .map((d) => entries.find((e) => e.kind === 'economia' && e.date === d))
      .filter((e): e is JournalEntry => !!e && (e.text.length > 0 || e.imageUrls.length > 0 || e.pinnedImages.length > 0));
  }, [entries, selected]);

  function updatePinned(e: JournalEntry, id: string, patch: Partial<Pick<PinnedImage, 'x' | 'y' | 'width' | 'height' | 'locked'>>) {
    saveEntry('economia', e.date, { pinnedImages: e.pinnedImages.map((img) => (img.id === id ? { ...img, ...patch } : img)) });
  }

  function deletePinned(e: JournalEntry, id: string) {
    saveEntry('economia', e.date, { pinnedImages: e.pinnedImages.filter((img) => img.id !== id) });
  }

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
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {dayLabel(e.date)} · {e.date}
                    </span>
                    {e.text && (
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: toDisplayHtml(e.text) }} />
                    )}
                    {e.pinnedImages.length > 0 && <PinCanvas images={e.pinnedImages} onChange={(id, patch) => updatePinned(e, id, patch)} onDelete={(id) => deletePinned(e, id)} />}
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
          const hasEntry = entries.some((e) => e.kind === 'economia' && e.date === d && (e.text.length > 0 || e.imageUrls.length > 0 || e.pinnedImages.length > 0));
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

      <DayEditor date={selectedDay} />

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
