import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Headline } from '../types';
import { IMPACT_COLORS } from '../lib/impact';

interface MarqueeTickerProps {
  headlines: Headline[];
}

// Cinta corrediza: arranca con la marca y sigue con los titulares fijados
// (desde Titulares o desde una tarjeta de Sesgo). El contenido se repite las
// veces necesarias (mínimo 2) para poder loopear con scrollLeft sin salto
// visible al reiniciar — ver nota junto a `copies` sobre por qué el número
// de copias es dinámico y no fijo en 2.
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
  // scrollLeft del navegador se redondea a entero al leer/escribir. A esta
  // velocidad (20-60px/s a 60fps = 0.33-1px por frame), sumar directo sobre
  // `el.scrollLeft` releído cada frame casi nunca llega a 0.5px: el redondeo
  // lo devuelve exactamente al mismo entero para siempre, frame tras frame
  // — la cinta no avanza NUNCA, desde el primer frame (el bug real detrás
  // de "no se mueve", independiente de cuántos titulares haya). Por eso la
  // posición "real" (con decimales) se acumula acá, fuera del DOM, y solo
  // se vuelca a scrollLeft (que sí puede perder el decimal) al final.
  const positionRef = useRef(0);

  const speedPxPerSec = Math.max(20, Math.min(60, items.length * 4));

  // Cuántas veces repetir el contenido (mínimo 2, para poder loopear). Con
  // pocos titulares cortos, dos copias pueden no llegar a cubrir 2x el ancho
  // visible — y el navegador clampea scrollLeft a scrollWidth-clientWidth,
  // un tope por debajo del punto donde el código "engancha" el reinicio del
  // loop (runWidth). Resultado: la cinta se queda pegada apenas llega a ese
  // tope, sin poder completar el wraparound. Por eso medimos y agregamos
  // copias hasta que sobre margen de sobra (nativeMax >= runWidth siempre).
  const [copies, setCopies] = useState(2);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function recalcCopies() {
      if (!el) return;
      const runWidth = el.scrollWidth / copies;
      if (runWidth <= 0) return;
      const needed = Math.max(2, Math.ceil(el.clientWidth / runWidth) + 1);
      if (needed !== copies) setCopies(needed);
    }

    recalcCopies();
    const ro = new ResizeObserver(recalcCopies);
    ro.observe(el);
    return () => ro.disconnect();
  }, [copies, items.length]);

  // Si el usuario abre un titular en pestaña nueva (target=_blank) y vuelve
  // sin mover el mouse, nunca se dispara mouseleave — isHovered queda
  // trabado en true y la cinta no vuelve a moverse jamás. Al recuperar foco
  // asumimos que ya no está "encima" y retomamos el auto-scroll.
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === 'visible') setIsHovered(false);
    }
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    positionRef.current = el.scrollLeft;

    let raf = 0;
    let lastTs: number | null = null;

    function step(ts: number) {
      if (!el) return;
      if (lastTs === null) lastTs = ts;
      // Si la pestaña estuvo en segundo plano (o la laptop durmiendo), el
      // navegador puede saltarse muchos frames — sin este tope, ese hueco
      // se traduciría en un salto grande de golpe al volver.
      const dt = Math.min((ts - lastTs) / 1000, 0.1);
      lastTs = ts;

      const runWidth = el.scrollWidth / copies;
      const shouldMove = !isHovered && !dragState.current.dragging && ts >= resumeAtRef.current && runWidth > 0;
      if (shouldMove) {
        positionRef.current = (positionRef.current + speedPxPerSec * dt) % runWidth;
        el.scrollLeft = positionRef.current;
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isHovered, speedPxPerSec, copies]);

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
    const runWidth = el.scrollWidth / copies;
    if (runWidth > 0) {
      // Módulo manual (no negativo) para poder arrastrar hacia atrás del
      // origen sin quedarse pegado en scrollLeft=0.
      next = ((next % runWidth) + runWidth) % runWidth;
    }
    el.scrollLeft = next;
    // Mantiene el acumulador propio sincronizado con el drag manual, para
    // que el auto-scroll retome desde donde soltó el usuario (no desde una
    // posición vieja).
    positionRef.current = next;
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
      <span key={keyPrefix} className="flex shrink-0 items-center">
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
        {Array.from({ length: copies }, (_, i) => renderRun(String(i)))}
      </div>
    </div>
  );
}
