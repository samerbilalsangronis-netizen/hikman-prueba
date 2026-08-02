import { useEffect, useRef, useState } from 'react';
import type { Headline } from '../types';
import { IMPACT_COLORS } from '../lib/impact';

interface MarqueeTickerProps {
  headlines: Headline[];
}

// Cinta corrediza: arranca con la marca y sigue con los titulares fijados
// (desde Titulares o desde una tarjeta de Sesgo). El contenido se duplica una
// vez para poder loopear con scrollLeft sin salto visible al reiniciar.
//
// Interactiva con el mouse (pedido explícito del usuario — antes era una
// animación CSS pura, imposible de leer o clickear mientras se movía):
// - Se pausa sola con el mouse encima (hover).
// - Se puede arrastrar con click + mover para adelantar/atrasar a mano
//   (drag horizontal), como cualquier carrusel — al soltar retoma el
//   auto-scroll después de un respiro.
// El auto-scroll ya no es una animación CSS de transform, es un loop de
// requestAnimationFrame que mueve scrollLeft — así drag/hover/wheel del
// navegador conviven naturalmente con el auto-scroll en vez de pelearse.
export function MarqueeTicker({ headlines }: MarqueeTickerProps) {
  const items = headlines
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((h) => ({ text: h.titleEs || h.title, color: IMPACT_COLORS[h.impact], url: h.url }));

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const dragState = useRef<{ dragging: boolean; startX: number; startScrollLeft: number; moved: boolean }>({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  // Después de soltar un drag, esperamos un respiro antes de retomar el
  // auto-scroll — si no, "pelea" contra el dedo/mouse que recién soltaste.
  const resumeAtRef = useRef(0);

  const speedPxPerSec = Math.max(20, Math.min(60, items.length * 4));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (!el) return;
      if (lastTs === null) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const halfWidth = el.scrollWidth / 2;
      if (!isHovered && !dragState.current.dragging && ts >= resumeAtRef.current && halfWidth > 0) {
        el.scrollLeft += speedPxPerSec * dt;
        if (el.scrollLeft >= halfWidth) el.scrollLeft -= halfWidth;
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isHovered, speedPxPerSec]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    dragState.current = { dragging: true, startX: e.clientX, startScrollLeft: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el || !dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 3) dragState.current.moved = true;
    let next = dragState.current.startScrollLeft - dx;
    const halfWidth = el.scrollWidth / 2;
    if (halfWidth > 0) {
      // Módulo manual (no negativo) para poder arrastrar hacia atrás del
      // origen sin quedarse pegado en scrollLeft=0.
      next = ((next % halfWidth) + halfWidth) % halfWidth;
    }
    el.scrollLeft = next;
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragState.current.dragging = false;
    resumeAtRef.current = performance.now() + 1500;
  }

  // Si fue un drag real (se movió), cancelamos el click del link de abajo
  // para no abrir la noticia por accidente al soltar después de arrastrar.
  function onClickCapture(e: React.MouseEvent) {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function renderRun(keyPrefix: string) {
    return (
      <span className="flex shrink-0 items-center">
        <span className="mx-4 shrink-0 text-sm font-extrabold tracking-wide" style={{ color: 'var(--series-3)' }}>
          HIKMAN CAPITAL
        </span>
        {items.map((item, i) => (
          <span key={`${keyPrefix}-${i}`} className="flex shrink-0 items-center">
            <span className="mx-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              •
            </span>
            <span className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="whitespace-nowrap text-sm hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.text}
              </a>
            ) : (
              <span className="whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                {item.text}
              </span>
            )}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className="marquee-scroll-container overflow-x-hidden py-2 select-none"
      style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', cursor: 'grab', touchAction: 'pan-y' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      <div className="flex w-max">
        {renderRun('a')}
        {renderRun('b')}
      </div>
    </div>
  );
}
