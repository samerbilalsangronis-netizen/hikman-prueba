import { useEffect, useState, type RefObject } from 'react';
import type { JournalImagePlacement } from '../../types';

// Imágenes ubicadas libremente sobre un lienzo (11-oct-2026, separado en su
// propio archivo el 25-oct-2026 para compartirlo entre la ventana de
// contexto de cada titular y la hoja semanal del Cuaderno de Economía).
// Se arrastran a cualquier lugar y se agrandan/achican desde la esquina ◢,
// con pointer events (funciona igual con mouse que con el dedo). Ver
// JournalImagePlacement para el sistema de coordenadas.

const MIN_IMAGE_W = 0.08;

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Alto/ancho natural de una imagen ya subida — para poder calcular su alto
 * en el lienzo a partir del ancho sin medir el DOM. */
export function loadImageRatio(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 0.6);
    img.onerror = () => resolve(0.6);
    img.src = url;
  });
}

/** Ancho en px del elemento, actualizado al redimensionar la ventana. */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Punto más bajo (en px) que ocupan las imágenes — el lienzo crece hasta ahí. */
export function imagesBottom(images: JournalImagePlacement[], canvasWidth: number): number {
  return images.reduce((max, img) => Math.max(max, img.y + img.w * canvasWidth * img.ratio), 0);
}

/** Sube los archivos de imagen y devuelve su ubicación inicial en el lienzo:
 * donde se soltaron (`at`) o, si no, escalonadas arriba a la derecha. */
export async function placeNewImages(
  files: File[],
  upload: (file: File) => Promise<string>,
  existingCount: number,
  at?: { x: number; y: number },
): Promise<JournalImagePlacement[]> {
  const placed: JournalImagePlacement[] = [];
  for (const [i, file] of files.filter((f) => f.type.startsWith('image/')).entries()) {
    const url = await upload(file);
    const ratio = await loadImageRatio(url);
    const w = 0.4;
    const offset = (existingCount + i) * 24;
    placed.push({
      id: crypto.randomUUID(),
      url,
      ratio,
      w,
      x: at ? clamp(at.x - w / 2, 0, 1 - w) : clamp(0.55 - (i + existingCount) * 0.03, 0, 1 - w),
      y: at ? Math.max(0, at.y - 40) : 16 + offset,
    });
  }
  return placed;
}

export function imageFilesFrom(items: DataTransferItemList | undefined | null): File[] {
  return Array.from(items ?? [])
    .filter((item) => item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((f): f is File => !!f);
}

interface Props {
  images: JournalImagePlacement[];
  canvasRef: RefObject<HTMLElement | null>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Al soltar tras mover/redimensionar. El padre la pasa al final del array (queda arriba de las demás). */
  onCommit: (img: JournalImagePlacement) => void;
  onRemove: (id: string) => void;
}

export function MovableImageLayer({ images, canvasRef, selectedId, onSelect, onCommit, onRemove }: Props) {
  // Imagen que se está arrastrando/redimensionando — se muestra desde acá
  // mientras dura el gesto y recién se guarda al soltar (no un upsert a
  // Supabase por cada píxel).
  const [draft, setDraft] = useState<JournalImagePlacement | null>(null);

  function startGesture(e: React.PointerEvent, img: JournalImagePlacement, mode: 'move' | 'resize') {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(img.id);
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
      setDraft(latest);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDraft(null);
      onCommit(latest);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return (
    <>
      {images.map((committed) => {
        const img = draft?.id === committed.id ? draft : committed;
        const selected = selectedId === img.id;
        return (
          <div
            key={img.id}
            className="absolute z-10 select-none"
            style={{
              left: `${img.x * 100}%`,
              top: img.y,
              width: `${img.w * 100}%`,
              cursor: draft?.id === img.id ? 'grabbing' : 'grab',
              touchAction: 'none',
              outline: selected ? '2px solid var(--series-1)' : 'none',
              outlineOffset: 2,
              borderRadius: 8,
            }}
            onPointerDown={(e) => startGesture(e, committed, 'move')}
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
                const ratio = naturalWidth > 0 ? naturalHeight / naturalWidth : committed.ratio;
                if (Math.abs(ratio - committed.ratio) > 0.01) onCommit({ ...committed, ratio });
              }}
            />
            {selected && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRemove(img.id)}
                title="Quitar imagen"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: 'var(--delta-bad)', color: '#fff' }}
              >
                ✕
              </button>
            )}
            <div
              onPointerDown={(e) => startGesture(e, committed, 'resize')}
              title="Arrastrar para cambiar el tamaño"
              className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-sm text-[10px]"
              style={{ background: 'var(--series-1)', color: '#fff', cursor: 'nwse-resize', touchAction: 'none', opacity: selected ? 1 : 0.55 }}
            >
              ◢
            </div>
          </div>
        );
      })}
    </>
  );
}
