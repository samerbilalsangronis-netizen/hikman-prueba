import type { Headline } from '../types';
import { IMPACT_COLORS } from '../lib/impact';

interface MarqueeTickerProps {
  headlines: Headline[];
}

// Cinta corrediza: arranca con la marca y sigue con los titulares fijados
// (desde Titulares o desde una tarjeta de Sesgo). El contenido se duplica una
// vez para poder animar con translateX(-50%) sin salto visible al reiniciar.
export function MarqueeTicker({ headlines }: MarqueeTickerProps) {
  const items = headlines
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((h) => ({ text: h.titleEs || h.title, color: IMPACT_COLORS[h.impact], url: h.url }));

  const duration = Math.max(24, items.length * 7);

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
              <a href={item.url} target="_blank" rel="noreferrer" className="whitespace-nowrap text-sm hover:underline" style={{ color: 'var(--text-primary)' }}>
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
      className="overflow-hidden py-2"
      style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="marquee-track flex w-max" style={{ animationDuration: `${duration}s` }}>
        {renderRun('a')}
        {renderRun('b')}
      </div>
    </div>
  );
}
