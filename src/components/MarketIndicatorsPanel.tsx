import { useEffect, useState } from 'react';
import { MARKET_CATEGORIES } from '../data/marketIndicators';

interface Quote {
  value: number;
  delta: number;
  unit: 'pct' | 'price' | 'fx';
}

type QuoteResult = Quote | { error: string };

function isQuote(q: QuoteResult): q is Quote {
  return 'value' in q;
}

function formatValue(q: Quote): string {
  if (q.unit === 'pct') return `${q.value.toFixed(2)}%`;
  if (q.unit === 'fx') return q.value.toFixed(4);
  return q.value >= 100 ? q.value.toFixed(1) : q.value.toFixed(2);
}

function formatDelta(q: Quote): string {
  const sign = q.delta > 0 ? '+' : '';
  if (q.unit === 'pct') return `${sign}${q.delta.toFixed(2)}pp`;
  return `${sign}${q.delta.toFixed(2)}%`;
}

function QuoteTile({ label, tooltip, result }: { label: string; tooltip: string; result: QuoteResult | undefined }) {
  const loading = result === undefined;
  const ok = result && isQuote(result);
  const deltaColor = ok ? (result.delta > 0 ? 'var(--delta-good)' : result.delta < 0 ? 'var(--delta-bad)' : 'var(--text-muted)') : 'var(--text-muted)';

  return (
    <div
      title={tooltip}
      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      {loading ? (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          …
        </span>
      ) : ok ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {formatValue(result)}
          </span>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: deltaColor }}>
            {formatDelta(result)}
          </span>
        </span>
      ) : (
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }} title={(result as { error: string }).error}>
          sin datos
        </span>
      )}
    </div>
  );
}

export function MarketIndicatorsPanel() {
  const [quotes, setQuotes] = useState<Record<string, QuoteResult> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/market-quotes')
      .then((res) => {
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) throw new Error('no-api');
        return res.json();
      })
      .then((json: { quotes: Record<string, QuoteResult>; errors: string[] }) => {
        if (cancelled) return;
        setQuotes(json.quotes);
        setErrors(json.errors ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Indicadores de Mercado
      </h2>

      {loadFailed && (
        <p className="text-xs" style={{ color: 'var(--status-warning)' }}>
          No se pudo contactar /api/market-quotes. Esta función solo funciona una vez que el sitio está desplegado en
          Vercel (no funciona en "npm run dev" local).
        </p>
      )}
      {errors.length > 0 && (
        <div className="flex flex-col gap-0.5 text-[11px]" style={{ color: 'var(--status-warning)' }}>
          {errors.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
      )}

      {MARKET_CATEGORIES.map((category) => (
        <div key={category.id} className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {category.title}
          </h3>
          <div className="flex flex-col gap-1">
            {category.symbols.map((sym) => (
              <QuoteTile key={sym.id} label={sym.label} tooltip={sym.tooltip} result={quotes?.[sym.id]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
