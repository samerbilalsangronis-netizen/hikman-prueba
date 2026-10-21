import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useJournal } from '../../data/JournalContext';
import { useMacroData } from '../../data/MacroDataContext';
import { JOURNAL_COLORS, JOURNAL_COLOR_HEX, JOURNAL_COLOR_LABELS } from '../../lib/journalColors';
import { JOURNAL_STICKERS } from '../../lib/journalStickers';
import { sanitizeJournalHtml, stickerHtml, toDisplayHtml, transformSelectionCase, type CaseMode } from '../../lib/richText';
import { dayLabel, datesOfWeek, formatWeekRange, todayLocalDate, weekStartOf } from '../../lib/journalWeek';
import type { JournalColor, JournalEntry, JournalHeadline, JournalImagePlacement } from '../../types';

// Cuaderno de Economía (2-oct-2026, editor de texto enriquecido agregado
// 4-oct-2026, titulares + ventana de contexto 11-oct-2026 — todo a pedido
// del usuario). Cada día es una lista de TITULARES con su color de impacto
// (escala de sentimiento de 6 pasos): en la lectura diaria se ve solo el
// título, y al hacer click se abre la ventana de contexto con el texto
// enriquecido (resaltar/formato/stickers, mismo contentEditable que antes) y
// las imágenes, que se ubican libremente sobre ese lienzo — se arrastran a
// cualquier lugar y se agrandan/achican desde la esquina. No hay una acción
// de "archivar": cualquier día fuera de la semana en curso ya cuenta como
// historial (ver lib/journalWeek.ts) — la Bóveda solo agrupa lo que pasó.
//
// Entradas anteriores a los titulares (texto + galería por día) se siguen
// mostrando como "Nota libre (formato anterior)", con un botón para
// convertirlas en titular.

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

function hasContent(entry: JournalEntry | undefined): boolean {
  return !!entry && (entry.headlines.length > 0 || entry.text.length > 0 || entry.imageUrls.length > 0);
}

/** Alto/ancho natural de una imagen ya subida — para poder calcular su alto
 * en el lienzo a partir del ancho sin medir el DOM (ver JournalImagePlacement). */
function loadImageRatio(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 0.6);
    img.onerror = () => resolve(0.6);
    img.src = url;
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

const MIN_IMAGE_W = 0.08;
const CANVAS_MIN_HEIGHT = 420;

const toolButtonStyle = { border: '1px solid var(--border)', color: 'var(--text-secondary)' };

/** Barras de resaltado/formato/stickers sobre un contentEditable. onMouseDown
 * con preventDefault evita que el botón le robe el foco/la selección al
 * editor antes de aplicar execCommand — si no, la selección ya estaría vacía
 * al hacer click en un color. */
function RichTextToolbar({ editorRef, onCommit }: { editorRef: RefObject<HTMLDivElement | null>; onCommit: () => void }) {
  function run(fn: () => void) {
    editorRef.current?.focus();
    fn();
    onCommit();
  }

  // Sin styleWithCSS, foreColor genera <font color="..."> en vez de
  // <span style="color:...">, que es lo que sabe leer sanitizeJournalHtml.
  // Negrita/cursiva/subrayado son nativos del navegador; sanitizeJournalHtml
  // sabe leer tanto <strong>/<em>/<u> como su versión en estilo inline.
  const highlight = (hex: string) =>
    run(() => {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, hex);
    });

  // Mayúscula/minúscula/tipo título — transforma el texto SELECCIONADO
  // preservando su formato (ver transformSelectionCase).
  function applyCase(mode: CaseMode) {
    editorRef.current?.focus();
    if (transformSelectionCase(mode)) onCommit();
  }

  const noFocusSteal = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Resaltar:
        </span>
        {JOURNAL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onMouseDown={noFocusSteal}
            onClick={() => highlight(JOURNAL_COLOR_HEX[c])}
            title={JOURNAL_COLOR_LABELS[c]}
            className="h-6 w-6 rounded-full"
            style={{ background: JOURNAL_COLOR_HEX[c], border: '1px solid var(--border)' }}
          />
        ))}
        {/* Blanco/negro — solo para el texto, no forman parte de la escala de
            sentimiento de 6 colores (JOURNAL_COLORS). */}
        <button type="button" onMouseDown={noFocusSteal} onClick={() => highlight('#ffffff')} title="Blanco" className="h-6 w-6 rounded-full" style={{ background: '#ffffff', border: '1px solid var(--border)' }} />
        <button type="button" onMouseDown={noFocusSteal} onClick={() => highlight('#000000')} title="Negro" className="h-6 w-6 rounded-full" style={{ background: '#000000', border: '1px solid var(--border)' }} />
        <button type="button" onMouseDown={noFocusSteal} onClick={() => highlight('inherit')} title="Quitar color" className="rounded-md px-2 py-1 text-[11px]" style={toolButtonStyle}>
          ✕ Normal
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Formato:
        </span>
        <button type="button" onMouseDown={noFocusSteal} onClick={() => run(() => document.execCommand('bold'))} title="Negrita" className="rounded-md px-2.5 py-1 text-xs font-bold" style={toolButtonStyle}>
          N
        </button>
        <button type="button" onMouseDown={noFocusSteal} onClick={() => run(() => document.execCommand('italic'))} title="Cursiva" className="rounded-md px-2.5 py-1 text-xs italic" style={toolButtonStyle}>
          K
        </button>
        <button type="button" onMouseDown={noFocusSteal} onClick={() => run(() => document.execCommand('underline'))} title="Subrayado" className="rounded-md px-2.5 py-1 text-xs underline" style={toolButtonStyle}>
          S
        </button>
        <span className="mx-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          ·
        </span>
        <button type="button" onMouseDown={noFocusSteal} onClick={() => applyCase('upper')} title="MAYÚSCULA" className="rounded-md px-2.5 py-1 text-[11px] font-medium" style={toolButtonStyle}>
          MAYÚS
        </button>
        <button type="button" onMouseDown={noFocusSteal} onClick={() => applyCase('lower')} title="minúscula" className="rounded-md px-2.5 py-1 text-[11px] font-medium" style={toolButtonStyle}>
          minús
        </button>
        <button type="button" onMouseDown={noFocusSteal} onClick={() => applyCase('title')} title="Tipo Título" className="rounded-md px-2.5 py-1 text-[11px] font-medium" style={toolButtonStyle}>
          Tipo Título
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Stickers:
        </span>
        {JOURNAL_STICKERS.map((st) => (
          <button
            key={st.label}
            type="button"
            onMouseDown={noFocusSteal}
            onClick={() => run(() => document.execCommand('insertHTML', false, stickerHtml(st.label, st.color, st.textColor)))}
            className="journal-sticker"
            style={{ background: st.color, color: st.textColor, cursor: 'pointer' }}
          >
            {st.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImpactPicker({ value, onChange }: { value: JournalColor; onChange: (c: JournalColor) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {JOURNAL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={JOURNAL_COLOR_LABELS[c]}
          aria-pressed={value === c}
          className="h-6 w-6 rounded-full transition-transform"
          style={{
            background: JOURNAL_COLOR_HEX[c],
            border: '1px solid var(--border)',
            outline: value === c ? '2px solid var(--text-primary)' : 'none',
            outlineOffset: 2,
            transform: value === c ? 'scale(1.1)' : undefined,
          }}
        />
      ))}
    </div>
  );
}

/** Ventana de contexto de un titular: título + impacto editables, texto
 * enriquecido y un lienzo donde las imágenes se ubican libremente. */
function HeadlineContextModal({ date, headlineId, onClose }: { date: string; headlineId: string; onClose: () => void }) {
  const { entries, updateHeadlines, uploadJournalImage, saveError } = useJournal();
  const { syncMode } = useMacroData();
  const headline = entries.find((e) => e.kind === 'economia' && e.date === date)?.headlines.find((h) => h.id === headlineId);

  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // Imagen que se está arrastrando/redimensionando — se muestra desde acá
  // mientras dura el gesto y recién se guarda al soltar (no un upsert a
  // Supabase por cada píxel).
  const [dragDraft, setDragDraft] = useState<JournalImagePlacement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (fn: (h: JournalHeadline) => JournalHeadline) => updateHeadlines(date, (hs) => hs.map((h) => (h.id === headlineId ? fn(h) : h)));

  // El contentEditable se carga una sola vez al abrir — nunca mientras el
  // usuario escribe, porque pisarle el innerHTML le resetearía el cursor.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toDisplayHtml(headline?.context ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headlineId]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasWidth(el.clientWidth));
    ro.observe(el);
    setCanvasWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!headline) return null;

  const images = headline.images.map((img) => (dragDraft?.id === img.id ? dragDraft : img));
  const contentBottom = images.reduce((max, img) => Math.max(max, img.y + img.w * canvasWidth * img.ratio), 0);
  const canvasHeight = Math.max(CANVAS_MIN_HEIGHT, contentBottom + 40);

  function commitContext() {
    const el = editorRef.current;
    if (!el) return;
    const html = sanitizeJournalHtml(el.innerHTML);
    patch((h) => ({ ...h, context: html }));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      commitContext();
    }
  }

  async function addImages(files: File[], at?: { x: number; y: number }) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    if (syncMode !== 'cloud') {
      setError('Subir imágenes necesita Supabase configurado.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const placed: JournalImagePlacement[] = [];
      for (const [i, file] of imageFiles.entries()) {
        const url = await uploadJournalImage(file);
        const ratio = await loadImageRatio(url);
        const w = 0.4;
        const offset = (headline!.images.length + i) * 24;
        placed.push({
          id: crypto.randomUUID(),
          url,
          ratio,
          w,
          x: at ? clamp(at.x - w / 2, 0, 1 - w) : clamp(0.55 - (offset / Math.max(canvasWidth, 1)) * 0.5, 0, 1 - w),
          y: at ? Math.max(0, at.y - 40) : 16 + offset,
        });
      }
      await patch((h) => ({ ...h, images: [...h.images, ...placed] }));
      setSelectedImage(placed[placed.length - 1].id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // Ctrl+V de una captura dentro del texto: se agrega como imagen movible
  // del lienzo (no incrustada en el texto), cerca de donde está el usuario.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length === 0) return; // Texto normal — dejar que el pegado siga su curso.
    e.preventDefault();
    addImages(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    addImages(files, rect ? { x: (e.clientX - rect.left) / rect.width, y: e.clientY - rect.top } : undefined);
  }

  // Arrastrar (mover) o redimensionar desde la esquina — pointer events, así
  // funciona igual con mouse que con el dedo. Al soltar, la imagen pasa al
  // final del array, que la deja por encima de las demás.
  function startGesture(e: React.PointerEvent, img: JournalImagePlacement, mode: 'move' | 'resize') {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(img.id);
    const width = canvasRef.current?.clientWidth || 1;
    const startX = e.clientX;
    const startY = e.clientY;
    let latest = img;

    function onMove(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / width;
      const dy = ev.clientY - startY;
      latest =
        mode === 'move'
          ? { ...img, x: clamp(img.x + dx, 0, 1 - img.w), y: Math.max(0, img.y + dy) }
          : { ...img, w: clamp(img.w + dx, MIN_IMAGE_W, 1 - img.x) };
      setDragDraft(latest);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragDraft(null);
      patch((h) => ({ ...h, images: [...h.images.filter((i) => i.id !== latest.id), latest] }));
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function removeImage(id: string) {
    setSelectedImage(null);
    patch((h) => ({ ...h, images: h.images.filter((i) => i.id !== id) }));
  }

  function deleteHeadline() {
    if (!window.confirm(`¿Borrar el titular "${headline!.title}" con todo su contexto?`)) return;
    onClose();
    updateHeadlines(date, (hs) => hs.filter((h) => h.id !== headlineId));
  }

  return (
    <div className="fixed inset-0 z-[70] flex overflow-y-auto p-2 sm:p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="m-auto flex w-full max-w-5xl flex-col gap-3 rounded-xl p-3 sm:p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderTop: `6px solid ${JOURNAL_COLOR_HEX[headline.color]}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {dayLabel(date)} · {new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · Ventana de contexto
            </span>
            <input
              value={headline.title}
              onChange={(e) => patch((h) => ({ ...h, title: e.target.value }))}
              className="w-full rounded-md px-2 py-1 text-base font-semibold"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Impacto:
              </span>
              <ImpactPicker value={headline.color} onChange={(c) => patch((h) => ({ ...h, color: c }))} />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {JOURNAL_COLOR_LABELS[headline.color]}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button onClick={onClose} className="rounded-md px-2 py-1 text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              ✕ Cerrar
            </button>
            <button onClick={deleteHeadline} className="rounded-md px-2 py-1 text-[11px]" style={{ color: 'var(--delta-bad)', border: '1px solid var(--border)' }}>
              🗑 Borrar titular
            </button>
          </div>
        </div>

        <RichTextToolbar editorRef={editorRef} onCommit={commitContext} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={syncMode !== 'cloud' || uploading}
            className="rounded-md px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
            style={toolButtonStyle}
          >
            🖼 Agregar imagen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addImages(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {uploading ? 'Subiendo…' : 'También: Ctrl+V o arrastrar la imagen al lienzo. Arrastrá para moverla, la esquina ◢ para cambiar el tamaño.'}
          </span>
        </div>

        <div
          ref={canvasRef}
          className="relative w-full rounded-md"
          style={{ minHeight: canvasHeight, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          onPointerDown={() => setSelectedImage(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={commitContext}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={commitContext}
            data-placeholder="Contexto del titular… (qué pasó, por qué importa, niveles, reacción del mercado)."
            className="journal-editable w-full px-3 py-2 text-sm"
            style={{ color: 'var(--text-primary)', minHeight: canvasHeight, whiteSpace: 'pre-wrap', outline: 'none' }}
          />
          {images.map((img) => {
            const selected = selectedImage === img.id;
            return (
              <div
                key={img.id}
                className="absolute select-none"
                style={{
                  left: `${img.x * 100}%`,
                  top: img.y,
                  width: `${img.w * 100}%`,
                  cursor: dragDraft?.id === img.id ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  outline: selected ? '2px solid var(--series-1)' : 'none',
                  outlineOffset: 2,
                  borderRadius: 8,
                }}
                onPointerDown={(e) => startGesture(e, img, 'move')}
                onDoubleClick={() => window.open(img.url, '_blank', 'noreferrer')}
              >
                <img
                  src={img.url}
                  alt=""
                  draggable={false}
                  className="block w-full rounded-lg"
                  style={{ border: '1px solid var(--border)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
                  // Si la proporción guardada no coincide con la real (ej. no se
                  // pudo leer al subirla), se corrige para que el lienzo crezca bien.
                  onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.currentTarget;
                    const ratio = naturalWidth > 0 ? naturalHeight / naturalWidth : img.ratio;
                    if (Math.abs(ratio - img.ratio) > 0.01) patch((h) => ({ ...h, images: h.images.map((i) => (i.id === img.id ? { ...i, ratio } : i)) }));
                  }}
                />
                {selected && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeImage(img.id)}
                    title="Quitar imagen"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--delta-bad)', color: '#fff' }}
                  >
                    ✕
                  </button>
                )}
                <div
                  onPointerDown={(e) => startGesture(e, img, 'resize')}
                  title="Arrastrar para cambiar el tamaño"
                  className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-sm text-[10px]"
                  style={{ background: 'var(--series-1)', color: '#fff', cursor: 'nwse-resize', touchAction: 'none', opacity: selected ? 1 : 0.55 }}
                >
                  ◢
                </div>
              </div>
            );
          })}
        </div>

        {syncMode !== 'cloud' && (
          <p className="text-[11px]" style={{ color: 'var(--status-warning)' }}>
            Subir imágenes necesita Supabase configurado.
          </p>
        )}
        {(error || saveError) && <p className="text-xs" style={{ color: 'var(--delta-bad)' }}>{error ?? saveError}</p>}
      </div>
    </div>
  );
}

function HeadlineRow({ headline, onOpen }: { headline: JournalHeadline; onOpen: () => void }) {
  const hasContext = headline.context.replace(/<br>/g, '').trim().length > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-md py-2 pl-2.5 pr-3 text-left transition-colors hover:brightness-110"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderLeft: `5px solid ${JOURNAL_COLOR_HEX[headline.color]}` }}
      title={`${JOURNAL_COLOR_LABELS[headline.color]} — click para ver el contexto`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: JOURNAL_COLOR_HEX[headline.color] }} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {headline.title || 'Sin título'}
      </span>
      <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {hasContext && '📝'}
        {headline.images.length > 0 && ` 🖼${headline.images.length}`}
        {' ›'}
      </span>
    </button>
  );
}

function DayHeadlines({ date, onOpen }: { date: string; onOpen: (headlineId: string) => void }) {
  const { entries, saveEntry, updateHeadlines, saveError } = useJournal();
  const entry = entries.find((e) => e.kind === 'economia' && e.date === date);
  const headlines = entry?.headlines ?? [];
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<JournalColor>('gris');
  const [converting, setConverting] = useState(false);

  function addHeadline() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const headline: JournalHeadline = { id: crypto.randomUUID(), title: trimmed, color, context: '', images: [], createdAt: new Date().toISOString() };
    updateHeadlines(date, (hs) => [...hs, headline]);
    setTitle('');
    setColor('gris');
  }

  // Entradas viejas (texto + galería del día) → un titular con ese texto
  // como contexto y las fotos acomodadas en dos columnas en el lienzo.
  async function convertLegacy() {
    if (!entry) return;
    setConverting(true);
    try {
      const ratios = await Promise.all(entry.imageUrls.map(loadImageRatio));
      let y = 16;
      const images: JournalImagePlacement[] = entry.imageUrls.map((url, i) => {
        const placed = { id: crypto.randomUUID(), url, ratio: ratios[i], w: 0.42, x: i % 2 === 0 ? 0.05 : 0.53, y };
        if (i % 2 === 1) y += Math.max(ratios[i - 1], ratios[i]) * 0.42 * 800 + 16;
        return placed;
      });
      const headline: JournalHeadline = { id: crypto.randomUUID(), title: 'Nota del día', color: entry.color, context: toDisplayHtml(entry.text), images, createdAt: new Date().toISOString() };
      await saveEntry('economia', date, { text: '', imageUrls: [], headlines: [...headlines, headline] });
      onOpen(headline.id);
    } finally {
      setConverting(false);
    }
  }

  const hasLegacy = !!entry && (entry.text.length > 0 || entry.imageUrls.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {dayLabel(date)} · {new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
      </span>

      <div className="flex flex-col gap-2 rounded-md p-2.5" style={{ border: '1px dashed var(--border)' }}>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHeadline()}
            placeholder="Nuevo titular… (ej. CPI USD sorprendió a la baja)"
            className="min-w-0 flex-1 rounded-md px-3 py-1.5 text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            type="button"
            onClick={addHeadline}
            disabled={!title.trim()}
            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{ background: 'var(--series-1)', color: '#fff' }}
          >
            + Agregar
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Impacto:
          </span>
          <ImpactPicker value={color} onChange={setColor} />
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {JOURNAL_COLOR_LABELS[color]}
          </span>
        </div>
      </div>

      {headlines.length === 0 && !hasLegacy ? (
        <p className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Sin titulares este día.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {headlines.map((h) => (
            <HeadlineRow key={h.id} headline={h} onOpen={() => onOpen(h.id)} />
          ))}
        </div>
      )}

      {hasLegacy && (
        <div className="flex flex-col gap-1.5 rounded-md p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Nota libre (formato anterior)
            </span>
            <button type="button" onClick={convertLegacy} disabled={converting} className="rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50" style={toolButtonStyle}>
              {converting ? 'Convirtiendo…' : '→ Convertir en titular'}
            </button>
          </div>
          {entry!.text && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: toDisplayHtml(entry!.text) }} />}
          <EntryImages urls={entry!.imageUrls} />
        </div>
      )}

      {saveError && <p className="text-xs" style={{ color: 'var(--delta-bad)' }}>{saveError}</p>}
    </div>
  );
}

function pastWeeks(entries: JournalEntry[]): string[] {
  const currentWeek = weekStartOf(todayLocalDate());
  const weeks = new Set(entries.filter((e) => e.kind === 'economia').map((e) => weekStartOf(e.date)));
  weeks.delete(currentWeek);
  return [...weeks].sort((a, b) => b.localeCompare(a));
}

function HistoryModal({ onClose, onOpenHeadline }: { onClose: () => void; onOpenHeadline: (date: string, headlineId: string) => void }) {
  const { entries } = useJournal();
  const weeks = useMemo(() => pastWeeks(entries), [entries]);
  const [selected, setSelected] = useState(weeks[0]);

  const weekEntries = useMemo(() => {
    if (!selected) return [];
    const dates = datesOfWeek(selected);
    return dates.map((d) => entries.find((e) => e.kind === 'economia' && e.date === d)).filter((e): e is JournalEntry => hasContent(e));
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
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {dayLabel(e.date)} · {e.date}
                    </span>
                    {e.headlines.map((h) => (
                      <HeadlineRow key={h.id} headline={h} onOpen={() => onOpenHeadline(e.date, h.id)} />
                    ))}
                    {e.text && (
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: toDisplayHtml(e.text) }} />
                    )}
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
  const [openHeadline, setOpenHeadline] = useState<{ date: string; id: string } | null>(null);
  const { entries } = useJournal();

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            📓 Cuaderno de Economía
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Titulares del día por impacto — click en uno para ver su contexto. Semana {formatWeekRange(currentWeekStart)}.
          </p>
        </div>
        <button onClick={() => setShowHistory(true)} className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Historial (Bóveda)
        </button>
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-full p-0.5" style={{ border: '1px solid var(--border)' }}>
        {days.map((d) => {
          const hasEntry = hasContent(entries.find((e) => e.kind === 'economia' && e.date === d));
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

      <DayHeadlines date={selectedDay} onOpen={(id) => setOpenHeadline({ date: selectedDay, id })} />

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onOpenHeadline={(date, id) => setOpenHeadline({ date, id })} />}
      {openHeadline && <HeadlineContextModal key={openHeadline.id} date={openHeadline.date} headlineId={openHeadline.id} onClose={() => setOpenHeadline(null)} />}
    </div>
  );
}
