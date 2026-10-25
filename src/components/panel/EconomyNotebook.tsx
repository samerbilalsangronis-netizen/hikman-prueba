import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useJournal } from '../../data/JournalContext';
import { useMacroData } from '../../data/MacroDataContext';
import { JOURNAL_COLORS, JOURNAL_COLOR_HEX, JOURNAL_COLOR_INK, JOURNAL_COLOR_LABELS } from '../../lib/journalColors';
import { JOURNAL_STICKERS } from '../../lib/journalStickers';
import { sanitizeJournalHtml, stickerHtml, toDisplayHtml, transformSelectionCase, type CaseMode } from '../../lib/richText';
import { dayLabel, datesOfWeek, formatWeekRange, isCurrentWeek, shiftWeek, todayLocalDate, weekStartOf } from '../../lib/journalWeek';
import type { JournalColor, JournalEntry, JournalHeadline, JournalImagePlacement } from '../../types';
import { MovableImageLayer, imageFilesFrom, imagesBottom, loadImageRatio, placeNewImages, useElementWidth } from './MovableImageLayer';
import { WeekBiasSidebar } from './WeekBiasSidebar';

// Cuaderno de Economía (2-oct-2026; editor enriquecido 4-oct; titulares +
// ventana de contexto 11-oct; hoja semanal 25-oct — todo a pedido del
// usuario). Está modelado sobre el cuaderno de Nufal: UNA hoja por semana
// ("Semana 19/10") con todos los titulares corridos, escritos en el color
// de su impacto y separados por un divisor chico por día (cronología de la
// semana), más una columna a la derecha con el sesgo de las divisas "pre
// semana" y "semana actual" (WeekBiasSidebar). Cada titular sigue siendo una
// entrada: al hacer click se abre su ventana de contexto (texto
// enriquecido + imágenes movibles). Sobre la hoja también se pueden ubicar
// imágenes libremente (JournalWeekBoard, guardada en la fila del lunes).
// No hay una acción de "archivar": cualquier semana que no sea la en curso
// ya es historial (ver lib/journalWeek.ts) — se navega con ◀ ▶ o la Bóveda.
//
// Entradas anteriores a los titulares (texto + galería por día) se siguen
// mostrando como "Nota libre (formato anterior)", con un botón para
// convertirlas en titular.

const CONTEXT_CANVAS_MIN_HEIGHT = 420;
const SHEET_MIN_HEIGHT = 160;

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
  return !!entry && (entry.headlines.length > 0 || entry.text.length > 0 || entry.imageUrls.length > 0 || (entry.weekBoard?.images.length ?? 0) > 0);
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

/** "19/10" — así titula Nufal cada hoja. */
function weekTitle(weekStart: string): string {
  const [, m, d] = weekStart.split('-');
  return `${Number(d)}/${m}`;
}

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
  const canvasWidth = useElementWidth(canvasRef);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!headline) return null;

  const canvasHeight = Math.max(CONTEXT_CANVAS_MIN_HEIGHT, imagesBottom(headline.images, canvasWidth) + 40);

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
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    if (syncMode !== 'cloud') {
      setError('Subir imágenes necesita Supabase configurado.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const placed = await placeNewImages(files, uploadJournalImage, headline!.images.length, at);
      await patch((h) => ({ ...h, images: [...h.images, ...placed] }));
      setSelectedImage(placed[placed.length - 1]?.id ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // Ctrl+V de una captura dentro del texto: se agrega como imagen movible
  // del lienzo (no incrustada en el texto).
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const files = imageFilesFrom(e.clipboardData?.items);
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
              {dayLabel(date)} · {shortDate(date)} · Ventana de contexto
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
          <MovableImageLayer
            images={headline.images}
            canvasRef={canvasRef}
            selectedId={selectedImage}
            onSelect={setSelectedImage}
            onCommit={(img) => patch((h) => ({ ...h, images: [...h.images.filter((i) => i.id !== img.id), img] }))}
            onRemove={(id) => {
              setSelectedImage(null);
              patch((h) => ({ ...h, images: h.images.filter((i) => i.id !== id) }));
            }}
          />
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

/** Leyenda de la escala de impacto (− rojo … verde +), como la que dibuja Nufal arriba de cada hoja. */
function ImpactLegend() {
  return (
    <div className="flex items-center gap-1.5" title="Escala de impacto: de muy bajista (−) a muy alcista (+)">
      <span className="text-sm font-bold" style={{ color: JOURNAL_COLOR_HEX.rojo }}>
        −
      </span>
      {JOURNAL_COLORS.map((c) => (
        <span key={c} className="h-3 w-3 rounded-full" title={JOURNAL_COLOR_LABELS[c]} style={{ background: JOURNAL_COLOR_HEX[c] }} />
      ))}
      <span className="text-sm font-bold" style={{ color: JOURNAL_COLOR_HEX.verde_fuerte }}>
        +
      </span>
    </div>
  );
}

/** Un titular en la hoja: escrito en el color de su impacto, sin caja — click abre su contexto. */
function HeadlineLine({ headline, onOpen }: { headline: JournalHeadline; onOpen: () => void }) {
  const hasContext = headline.context.replace(/<br>/g, '').trim().length > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-baseline gap-2 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-[var(--surface-2)]"
      title={`${JOURNAL_COLOR_LABELS[headline.color]} — click para ver el contexto`}
    >
      <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: JOURNAL_COLOR_HEX[headline.color] }} />
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug group-hover:underline" style={{ color: JOURNAL_COLOR_INK[headline.color] }}>
        {headline.title || 'Sin título'}
      </span>
      <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {hasContext && '📝'}
        {headline.images.length > 0 && ` 🖼${headline.images.length}`}
      </span>
    </button>
  );
}

function LegacyNote({ entry, onConverted }: { entry: JournalEntry; onConverted: (headlineId: string) => void }) {
  const { saveEntry } = useJournal();
  const [converting, setConverting] = useState(false);

  // Entradas viejas (texto + galería del día) → un titular con ese texto
  // como contexto y las fotos acomodadas en dos columnas en el lienzo.
  async function convert() {
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
      await saveEntry('economia', entry.date, { text: '', imageUrls: [], headlines: [...entry.headlines, headline] });
      onConverted(headline.id);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md p-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Nota libre (formato anterior)
        </span>
        <button type="button" onClick={convert} disabled={converting} className="rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50" style={toolButtonStyle}>
          {converting ? 'Convirtiendo…' : '→ Convertir en titular'}
        </button>
      </div>
      {entry.text && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: toDisplayHtml(entry.text) }} />}
      <EntryImages urls={entry.imageUrls} />
    </div>
  );
}

/** Formulario para anotar un titular: texto, impacto y día de la semana. */
function AddHeadlineForm({ weekStart, onAddImages }: { weekStart: string; onAddImages: (files: File[]) => void }) {
  const { updateHeadlines } = useJournal();
  const today = todayLocalDate();
  const days = datesOfWeek(weekStart);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<JournalColor>('gris');
  const [day, setDay] = useState(days.includes(today) ? today : days[0]);

  // Al cambiar de semana, el día elegido vuelve a "hoy" (o al lunes en
  // semanas pasadas/futuras).
  useEffect(() => {
    setDay(days.includes(today) ? today : days[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  function add() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const headline: JournalHeadline = { id: crypto.randomUUID(), title: trimmed, color, context: '', images: [], createdAt: new Date().toISOString() };
    updateHeadlines(day, (hs) => [...hs, headline]);
    setTitle('');
    setColor('gris');
  }

  return (
    <div className="flex flex-col gap-2 rounded-md p-2.5" style={{ border: '1px dashed var(--border)' }}>
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          // Ctrl+V de una captura acá la ubica sobre la hoja de la semana.
          onPaste={(e) => {
            const files = imageFilesFrom(e.clipboardData?.items);
            if (files.length === 0) return;
            e.preventDefault();
            onAddImages(files);
          }}
          placeholder="Nuevo titular… (ej. CAD: Datos de CPI)"
          className="min-w-0 flex-1 rounded-md px-3 py-1.5 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!title.trim()}
          className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'var(--series-1)', color: '#fff' }}
        >
          + Agregar
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Impacto:
          </span>
          <ImpactPicker value={color} onChange={setColor} />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Día:
          </span>
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: day === d ? 'var(--series-1)' : 'transparent', color: day === d ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {dayLabel(d, true)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** La hoja de una semana: titulares por día + imágenes libres encima. */
function WeekSheet({ weekStart, onOpen }: { weekStart: string; onOpen: (date: string, headlineId: string) => void }) {
  const { entries, updateWeekBoard, uploadJournalImage, saveError } = useJournal();
  const { syncMode } = useMacroData();
  const today = todayLocalDate();
  const days = useMemo(() => datesOfWeek(weekStart), [weekStart]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetWidth = useElementWidth(sheetRef);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byDate = new Map(entries.filter((e) => e.kind === 'economia').map((e) => [e.date, e]));
  const boardImages = byDate.get(weekStart)?.weekBoard?.images ?? [];
  const visibleDays = days.filter((d) => {
    const e = byDate.get(d);
    return d === today || (!!e && (e.headlines.length > 0 || e.text.length > 0 || e.imageUrls.length > 0));
  });
  const sheetHeight = Math.max(SHEET_MIN_HEIGHT, imagesBottom(boardImages, sheetWidth) + 40);

  async function addImages(files: File[], at?: { x: number; y: number }) {
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    if (syncMode !== 'cloud') {
      setError('Subir imágenes necesita Supabase configurado.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const placed = await placeNewImages(files, uploadJournalImage, boardImages.length, at);
      await updateWeekBoard(weekStart, (b) => ({ ...b, images: [...b.images, ...placed] }));
      setSelectedImage(placed[placed.length - 1]?.id ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    e.preventDefault();
    const rect = sheetRef.current?.getBoundingClientRect();
    addImages(files, rect ? { x: (e.clientX - rect.left) / rect.width, y: e.clientY - rect.top } : undefined);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AddHeadlineForm weekStart={weekStart} onAddImages={addImages} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={syncMode !== 'cloud' || uploading}
          className="rounded-md px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
          style={toolButtonStyle}
        >
          🖼 Imagen en la hoja
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
          {uploading ? 'Subiendo…' : 'También: arrastrala a la hoja o Ctrl+V en "Nuevo titular". Se mueve y se agranda libremente.'}
        </span>
      </div>

      <div
        ref={sheetRef}
        className="relative"
        style={{ minHeight: sheetHeight }}
        onPointerDown={() => setSelectedImage(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {visibleDays.length === 0 ? (
          <p className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Sin titulares esta semana.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleDays.map((d) => {
              const entry = byDate.get(d);
              const headlines = entry?.headlines ?? [];
              const hasLegacy = !!entry && (entry.text.length > 0 || entry.imageUrls.length > 0);
              return (
                <div key={d} className="flex flex-col gap-0.5">
                  {/* Separador del día — la cronología de la semana. */}
                  <div className="flex items-center gap-2 pb-0.5 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: d === today ? 'var(--series-1)' : 'var(--text-muted)' }}>
                      {dayLabel(d, true)} {shortDate(d)}
                      {d === today && ' · hoy'}
                    </span>
                    <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                  </div>
                  {headlines.length === 0 && !hasLegacy && (
                    <span className="px-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Sin titulares todavía.
                    </span>
                  )}
                  {headlines.map((h) => (
                    <HeadlineLine key={h.id} headline={h} onOpen={() => onOpen(d, h.id)} />
                  ))}
                  {hasLegacy && <LegacyNote entry={entry} onConverted={(id) => onOpen(d, id)} />}
                </div>
              );
            })}
          </div>
        )}
        <MovableImageLayer
          images={boardImages}
          canvasRef={sheetRef}
          selectedId={selectedImage}
          onSelect={setSelectedImage}
          onCommit={(img) => updateWeekBoard(weekStart, (b) => ({ ...b, images: [...b.images.filter((i) => i.id !== img.id), img] }))}
          onRemove={(id) => {
            setSelectedImage(null);
            updateWeekBoard(weekStart, (b) => ({ ...b, images: b.images.filter((i) => i.id !== id) }));
          }}
        />
      </div>

      {syncMode !== 'cloud' && (
        <p className="text-[11px]" style={{ color: 'var(--status-warning)' }}>
          Subir imágenes necesita Supabase configurado.
        </p>
      )}
      {(error || saveError) && <p className="text-xs" style={{ color: 'var(--delta-bad)' }}>{error ?? saveError}</p>}
    </div>
  );
}

/** Semanas pasadas con algo anotado, más reciente primero. */
function pastWeeks(entries: JournalEntry[]): string[] {
  const currentWeek = weekStartOf(todayLocalDate());
  const weeks = new Set(entries.filter((e) => e.kind === 'economia' && hasContent(e)).map((e) => weekStartOf(e.date)));
  weeks.delete(currentWeek);
  return [...weeks].sort((a, b) => b.localeCompare(a));
}

/** Bóveda: índice de las semanas pasadas — elegir una abre esa hoja. */
function VaultModal({ onClose, onPick }: { onClose: () => void; onPick: (weekStart: string) => void }) {
  const { entries } = useJournal();
  const weeks = useMemo(() => pastWeeks(entries), [entries]);

  return (
    <div className="fixed inset-0 z-[60] flex overflow-y-auto p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} role="dialog" aria-modal="true">
      <div className="m-auto w-full max-w-md rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
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
          <div className="flex flex-col gap-1.5">
            {weeks.map((w) => {
              const count = datesOfWeek(w).reduce((n, d) => n + (entries.find((e) => e.kind === 'economia' && e.date === d)?.headlines.length ?? 0), 0);
              return (
                <button
                  key={w}
                  onClick={() => onPick(w)}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-2)]"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <span className="font-semibold">Semana {weekTitle(w)}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatWeekRange(w)} · {count} {count === 1 ? 'titular' : 'titulares'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function EconomyNotebook() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocalDate()));
  const [showVault, setShowVault] = useState(false);
  const [openHeadline, setOpenHeadline] = useState<{ date: string; id: string } | null>(null);
  const current = isCurrentWeek(weekStart);

  const navButton = 'rounded-md px-2 py-1 text-xs font-semibold';

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            📓 Cuaderno de Economía
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Una hoja por semana — click en un titular para ver su contexto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setWeekStart((w) => shiftWeek(w, -1))} className={navButton} style={toolButtonStyle} title="Semana anterior">
            ◀
          </button>
          {!current && (
            <button onClick={() => setWeekStart(weekStartOf(todayLocalDate()))} className={navButton} style={toolButtonStyle}>
              Semana actual
            </button>
          )}
          <button onClick={() => setWeekStart((w) => shiftWeek(w, 1))} disabled={current} className={`${navButton} disabled:opacity-40`} style={toolButtonStyle} title="Semana siguiente">
            ▶
          </button>
          <button onClick={() => setShowVault(true)} className={navButton} style={toolButtonStyle}>
            Historial (Bóveda)
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Semana {weekTitle(weekStart)}
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatWeekRange(weekStart)}
            {!current && ' · archivada'}
          </span>
        </div>
        <ImpactLegend />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <WeekSheet weekStart={weekStart} onOpen={(date, id) => setOpenHeadline({ date, id })} />
        <WeekBiasSidebar weekStart={weekStart} />
      </div>

      {showVault && (
        <VaultModal
          onClose={() => setShowVault(false)}
          onPick={(w) => {
            setWeekStart(w);
            setShowVault(false);
          }}
        />
      )}
      {openHeadline && <HeadlineContextModal key={openHeadline.id} date={openHeadline.date} headlineId={openHeadline.id} onClose={() => setOpenHeadline(null)} />}
    </div>
  );
}
