import { useCallback, useEffect, useState } from 'react';
import { useCurrency } from '../data/CurrencyContext';
import { EQUITIES_BY_CURRENCY, type EquitySymbol } from '../data/equities';

interface Quote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  asOf: string;
}

function formatPrice(value: number, currency: string): string {
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function QuoteCard({ meta, quote, error, big = false }: { meta: EquitySymbol; quote?: Quote; error?: string; big?: boolean }) {
  const up = quote ? quote.change >= 0 : null;
  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-4"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={big ? 'text-base font-semibold' : 'text-sm font-semibold'} style={{ color: 'var(--text-primary)' }}>
            {meta.label}
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {meta.symbol} · {meta.source === 'finnhub' ? 'Finnhub' : 'Yahoo Finance'}
          </p>
        </div>
      </div>
      {quote ? (
        <>
          <div className={big ? 'text-2xl font-semibold tabular-nums' : 'text-lg font-semibold tabular-nums'} style={{ color: 'var(--text-primary)' }}>
            {formatPrice(quote.price, quote.currency)}
          </div>
          <div
            className="flex items-center gap-1 text-sm font-medium tabular-nums"
            style={{ color: up ? 'var(--delta-good)' : 'var(--delta-bad)' }}
          >
            {up ? '▲' : '▼'} {quote.change >= 0 ? '+' : ''}
            {quote.change.toFixed(2)} ({(quote.changePercent * 100).toFixed(2)}%)
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Al {formatTime(quote.asOf)}
          </p>
        </>
      ) : error ? (
        <p className="text-xs" style={{ color: 'var(--delta-bad)' }}>
          {error}
        </p>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Cargando…
        </p>
      )}
    </div>
  );
}

export function RentaVariable() {
  const { currency } = useCurrency();
  const group = EQUITIES_BY_CURRENCY[currency];
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = [group.index, ...group.stocks];
    setLoading(true);
    try {
      const params = new URLSearchParams({
        symbols: all.map((s) => s.symbol).join(','),
        sources: all.map((s) => s.source).join(','),
        labels: all.map((s) => encodeURIComponent(s.label)).join(','),
      });
      const res = await fetch(`/api/equities-quotes?${params.toString()}`);
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) throw new Error('no-api');
      const json = await res.json();
      const qMap: Record<string, Quote> = {};
      for (const q of json.quotes ?? []) qMap[q.symbol] = q;
      const eMap: Record<string, string> = {};
      for (const e of json.errors ?? []) eMap[e.symbol] = e.error;
      setQuotes(qMap);
      setErrors(eMap);
      setFetchedAt(json.fetchedAt ?? new Date().toISOString());
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'no-api'
          ? 'No se pudo contactar /api/equities-quotes. Esta función solo funciona una vez que el sitio está desplegado en Vercel (no funciona en "npm run dev" local).'
          : 'No se pudo contactar /api/equities-quotes.';
      setErrors(Object.fromEntries(all.map((s) => [s.symbol, message])));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Renta Variable y Acciones
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          Índice representativo y acciones influyentes de la divisa activa. Cotización de mercado (no en vivo tick a
          tick): acciones de EE.UU. vía Finnhub, el resto — incluidos todos los índices — vía Yahoo Finance (API
          no oficial, sin key).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={load}
          disabled={loading}
          className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--series-1)' }}
        >
          {loading ? 'Actualizando…' : '⟳ Actualizar cotizaciones'}
        </button>
        {fetchedAt && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Última actualización: {formatTime(fetchedAt)}
          </span>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Índice
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <QuoteCard meta={group.index} quote={quotes[group.index.symbol]} error={errors[group.index.symbol]} big />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Acciones Influyentes
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {group.stocks.map((s) => (
            <QuoteCard key={s.symbol} meta={s} quote={quotes[s.symbol]} error={errors[s.symbol]} />
          ))}
        </div>
      </div>
    </div>
  );
}
