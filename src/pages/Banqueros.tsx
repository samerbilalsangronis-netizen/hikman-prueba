import { useState } from 'react';
import { useCurrency } from '../data/CurrencyContext';
import { bankersForCurrency } from '../data/centralBankers';
import { useMacroData } from '../data/MacroDataContext';
import { formatDate } from '../lib/format';
import type { BankerNote, BankerVoteStatus, CentralBanker, Stance } from '../types';

const VOTE_GROUPS: { key: BankerVoteStatus; label: string }[] = [
  { key: 'voting', label: 'Votan siempre' },
  { key: 'rotating', label: 'Voto rotativo este año' },
  { key: 'nonvoting', label: 'No votan este año' },
];

const STANCE_LABEL: Record<Stance, string> = {
  hawkish: 'Hawkish',
  dovish: 'Dovish',
  neutral: 'Neutral',
};

function stanceColor(stance?: Stance): string {
  if (stance === 'hawkish') return 'var(--delta-bad)';
  if (stance === 'dovish') return 'var(--delta-good)';
  if (stance === 'neutral') return 'var(--text-muted)';
  return 'var(--text-muted)';
}

function voteBadge(vote: BankerVoteStatus): { label: string; color: string } {
  if (vote === 'voting') return { label: 'Vota', color: 'var(--status-good)' };
  if (vote === 'rotating') return { label: 'Voto rotativo', color: 'var(--status-warning)' };
  return { label: 'No vota', color: 'var(--text-muted)' };
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function BankerCard({ banker, note }: { banker: CentralBanker; note?: BankerNote }) {
  const { updateBankerNote } = useMacroData();
  const [editing, setEditing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(note?.photoUrl ?? '');
  const [statementDate, setStatementDate] = useState(note?.statementDate ?? '');
  const [stance, setStance] = useState<Stance>(note?.stance ?? 'neutral');
  const [summary, setSummary] = useState(note?.summary ?? '');
  const [sourceUrl, setSourceUrl] = useState(note?.sourceUrl ?? '');
  const [saving, setSaving] = useState(false);

  const badge = voteBadge(banker.vote);

  async function handleSave() {
    setSaving(true);
    await updateBankerNote(banker.id, {
      photoUrl: photoUrl || undefined,
      statementDate: statementDate || undefined,
      stance,
      summary: summary || undefined,
      sourceUrl: sourceUrl || undefined,
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3">
        {note?.photoUrl ? (
          <img src={note.photoUrl} alt={banker.name} className="h-14 w-14 shrink-0 rounded-full object-cover" style={{ border: '1px solid var(--border)' }} />
        ) : (
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            {initials(banker.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {banker.name}
            </h3>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ color: badge.color, border: '1px solid var(--border)' }}
            >
              {badge.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {banker.title}
          </p>
          <a href={banker.bioUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[11px] hover:underline" style={{ color: 'var(--series-1)' }}>
            Ver perfil oficial
          </a>
        </div>
      </div>

      {!editing ? (
        <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
          {note?.summary || note?.stance || note?.statementDate ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: stanceColor(note?.stance), border: '1px solid var(--border)' }}
                >
                  {note?.stance ? STANCE_LABEL[note.stance] : 'Sin clasificar'}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {note?.statementDate ? formatDate(note.statementDate) : 'sin fecha'}
                </span>
              </div>
              {note?.summary && (
                <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {note.summary}
                </p>
              )}
              {note?.sourceUrl && (
                <a href={note.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] hover:underline" style={{ color: 'var(--series-1)' }}>
                  Fuente del comunicado
                </a>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>Sin comunicado cargado todavía.</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            URL de la foto
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-md px-2 py-1 text-sm"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Fecha del comunicado
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="rounded-md px-2 py-1 text-sm"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Tono
              <select
                value={stance}
                onChange={(e) => setStance(e.target.value as Stance)}
                className="rounded-md px-2 py-1 text-sm"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="hawkish">Hawkish</option>
                <option value="dovish">Dovish</option>
                <option value="neutral">Neutral</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Resumen del comunicado
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Ej. Señaló apertura a un recorte si la inflación sigue bajando..."
              className="rounded-md px-2 py-1 text-sm"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            URL de la fuente (opcional)
            <input
              type="text"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-md px-2 py-1 text-sm"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1.5 text-xs"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--series-1)' }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="self-start rounded-md px-3 py-1.5 text-xs font-medium"
          style={{ color: 'var(--series-1)', border: '1px solid var(--border)' }}
        >
          Editar foto / comunicado
        </button>
      )}
    </div>
  );
}

export function Banqueros() {
  const { currency } = useCurrency();
  const { bankerNotes } = useMacroData();
  const bankers = bankersForCurrency(currency);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Banqueros Centrales — {currency === 'EUR' ? 'BCE' : 'Fed'}
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          {currency === 'EUR'
            ? 'Comité Ejecutivo del BCE (votan siempre) y gobernadores nacionales del Grupo 1 (rotan el voto). Faltan los gobernadores del Grupo 2 — se agregan más adelante.'
            : 'Los 7 miembros de la Junta de Gobernadores y el presidente de la Fed de Nueva York votan siempre; los otros 4 votos rotan cada año entre los 11 bancos regionales restantes.'}
        </p>
      </div>

      {VOTE_GROUPS.map(({ key, label }) => {
        const rows = bankers.filter((b) => b.vote === key);
        if (rows.length === 0) return null;
        return (
          <div key={key}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {label}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((banker) => (
                <BankerCard key={banker.id} banker={banker} note={bankerNotes[banker.id]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
