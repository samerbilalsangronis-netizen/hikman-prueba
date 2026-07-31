import { useMemo, useState } from 'react';
import { useMacroData } from '../data/MacroDataContext';
import { HeadlineCard } from '../components/HeadlineCard';
import { IMPACT_LABELS } from '../lib/impact';
import type { ImpactLevel } from '../types';

const RELEVANCE_TAGS = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'CNY', 'Bonos', 'Renta variable'];

function ManualHeadlineForm() {
  const { addManualHeadline } = useMacroData();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [url, setUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [impact, setImpact] = useState<ImpactLevel>('alto');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit() {
    if (!title.trim() || !source.trim() || tags.length === 0) return;
    setSaving(true);
    await addManualHeadline({
      title: title.trim(),
      source: source.trim(),
      url: url.trim() || undefined,
      publishedAt: new Date(publishedAt).toISOString(),
      impact,
      tags,
    });
    setSaving(false);
    setTitle('');
    setSource('');
    setUrl('');
    setTags([]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-md px-4 py-2 text-sm font-semibold text-white"
        style={{ background: 'var(--series-2)' }}
      >
        + Agregar titular manual
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Cargar titular manualmente
        </h3>
        <button onClick={() => setOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Cancelar
        </button>
      </div>
      <input
        type="text"
        placeholder="Titular"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-md px-3 py-2 text-sm"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Fuente (ej. Reuters, Bloomberg)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="min-w-[180px] flex-1 rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <input
          type="url"
          placeholder="URL (opcional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-[180px] flex-1 rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <input
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <select
          value={impact}
          onChange={(e) => setImpact(e.target.value as ImpactLevel)}
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          {(Object.keys(IMPACT_LABELS) as ImpactLevel[]).map((level) => (
            <option key={level} value={level}>
              {IMPACT_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          Qué afecta (obligatorio al menos uno — es lo que decide si el titular es relevante):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RELEVANCE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background: tags.includes(tag) ? 'var(--series-1)' : 'transparent',
                color: tags.includes(tag) ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={saving || !title.trim() || !source.trim() || tags.length === 0}
        className="self-start rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        style={{ background: 'var(--series-1)' }}
      >
        {saving ? 'Guardando…' : 'Guardar titular'}
      </button>
    </div>
  );
}

export function Titulares() {
  const { headlines, toggleHeadlinePin, deleteHeadline, setHeadlineBiasCurrency, refresh } = useMacroData();
  const [filter, setFilter] = useState<ImpactLevel | 'todos'>('todos');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ found: number; errors: string[] } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/headlines-sync', { method: 'POST' });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) throw new Error('no-api');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await refresh();
      setSyncResult({
        found: json.found ?? 0,
        errors: (json.errors ?? []).map((e: { fuente: string; error: string }) => `${e.fuente}: ${e.error}`),
      });
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'no-api'
          ? 'No se pudo contactar /api/headlines-sync. Esta función solo funciona una vez que el sitio está desplegado en Vercel con las variables de entorno configuradas (no funciona en "npm run dev" local).'
          : (err as Error).message;
      setSyncResult({ found: 0, errors: [message] });
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const list = filter === 'todos' ? headlines : headlines.filter((h) => h.impact === filter);
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
  }, [headlines, filter]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Titulares de Alto Impacto
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          Solo titulares que afectan a las divisas del G10 + CNY, rendimientos de bonos o renta variable mayor —
          todo lo demás se filtra antes de llegar acá. Fijá un titular para que aparezca en la cinta corrediza del
          Panel de Control.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--series-1)' }}
          >
            {syncing ? 'Sincronizando…' : '⟳ Sincronizar (Finnhub)'}
          </button>
          <ManualHeadlineForm />
        </div>
        {syncResult && (
          <div className="text-xs" style={{ color: syncResult.errors.length > 0 ? 'var(--delta-bad)' : 'var(--delta-good)' }}>
            {syncResult.found > 0 && <div>{syncResult.found} titulares encontrados y sincronizados.</div>}
            {syncResult.errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['todos', 'alto', 'medio', 'bajo'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: filter === level ? 'var(--series-1)' : 'transparent',
              color: filter === level ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {level === 'todos' ? 'Todos' : IMPACT_LABELS[level]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sin titulares todavía. Sincronizá o agregá uno manualmente.
          </p>
        ) : (
          filtered.map((h) => (
            <HeadlineCard
              key={h.id}
              headline={h}
              onTogglePin={toggleHeadlinePin}
              onDelete={deleteHeadline}
              onSetBiasCurrency={setHeadlineBiasCurrency}
            />
          ))
        )}
      </div>
    </div>
  );
}
