import { useState } from 'react';
import { useMacroData } from '../data/MacroDataContext';
import { formatDate } from '../lib/format';
import type { Currency, Stance, Statement } from '../types';

const STANCE_LABEL: Record<Stance, string> = {
  hawkish: 'Hawkish',
  dovish: 'Dovish',
  neutral: 'Neutral',
};

function stanceColor(stance?: Stance): string {
  if (stance === 'hawkish') return 'var(--delta-bad)';
  if (stance === 'dovish') return 'var(--delta-good)';
  return 'var(--text-muted)';
}

const CENTRAL_BANK_LABEL: Record<Currency, string> = {
  USD: 'Fed',
  EUR: 'BCE',
  GBP: 'BoE',
  CAD: 'BoC',
  AUD: 'RBA',
  NZD: 'RBNZ',
  JPY: 'BOJ',
  CHF: 'SNB',
  CNY: 'PBoC',
};

function StatementDisplay({ statement, showStance }: { statement?: Statement; showStance?: boolean }) {
  const hasContent = statement?.summary || statement?.stance || statement?.date;
  if (!hasContent) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Sin cargar todavía.
      </p>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        {showStance && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: stanceColor(statement?.stance), border: '1px solid var(--border)' }}
          >
            {statement?.stance ? STANCE_LABEL[statement.stance] : 'Sin clasificar'}
          </span>
        )}
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {statement?.date ? formatDate(statement.date) : 'sin fecha'}
        </span>
      </div>
      {statement?.summary && (
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {statement.summary}
        </p>
      )}
      {statement?.sourceUrl && (
        <a href={statement.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] hover:underline" style={{ color: 'var(--series-1)' }}>
          Fuente
        </a>
      )}
    </>
  );
}

function StatementEditor({
  initial,
  showStance,
  placeholder,
  onCancel,
  onSave,
}: {
  initial?: Statement;
  showStance?: boolean;
  placeholder: string;
  onCancel: () => void;
  onSave: (statement: Statement) => Promise<void>;
}) {
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [stance, setStance] = useState<Stance>(initial?.stance ?? 'neutral');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      date: date || undefined,
      stance: showStance ? stance : undefined,
      summary: summary.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md px-2 py-1 text-sm"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </label>
        {showStance && (
          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Sesgo
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
        )}
      </div>
      <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Resumen
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder={placeholder}
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
        <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
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
  );
}

function StatementSection({
  title,
  statement,
  showStance,
  placeholder,
  onSave,
}: {
  title: string;
  statement?: Statement;
  showStance?: boolean;
  placeholder: string;
  onSave: (statement: Statement) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-[11px] underline" style={{ color: 'var(--text-muted)' }}>
            Editar
          </button>
        )}
      </div>
      {editing ? (
        <StatementEditor
          initial={statement}
          showStance={showStance}
          placeholder={placeholder}
          onCancel={() => setEditing(false)}
          onSave={async (s) => {
            await onSave(s);
            setEditing(false);
          }}
        />
      ) : (
        <StatementDisplay statement={statement} showStance={showStance} />
      )}
    </div>
  );
}

function TextSection({
  title,
  text,
  placeholder,
  onSave,
}: {
  title: string;
  text?: string;
  placeholder: string;
  onSave: (text: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(value.trim());
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
        {!editing && (
          <button
            onClick={() => {
              setValue(text ?? '');
              setEditing(true);
            }}
            className="text-[11px] underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Editar
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="rounded-md px-2 py-1 text-sm"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="rounded-md px-3 py-1.5 text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
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
      ) : text ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {text}
        </p>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Sin cargar — no todos los bancos centrales publican esto.
        </p>
      )}
    </div>
  );
}

export function CentralBankPanel({ currency }: { currency: Currency }) {
  const {
    centralBankNotes,
    updateCentralBankRateDecision,
    updateCentralBankPressConference,
    updateCentralBankInflationExpectations,
    updateCentralBankGrowthExpectations,
  } = useMacroData();
  const note = centralBankNotes[currency];

  return (
    <div className="flex flex-col gap-3 rounded-xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        🏛️ Banco Central — {CENTRAL_BANK_LABEL[currency]}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatementSection
          title="Última Decisión de Tipos"
          statement={note?.rateDecision}
          showStance
          placeholder="Ej. Mantuvo la tasa sin cambios, señaló apertura a recortes si la inflación sigue bajando…"
          onSave={(s) => updateCentralBankRateDecision(currency, s)}
        />
        <StatementSection
          title="Última Rueda de Prensa"
          statement={note?.pressConference}
          placeholder="Ej. En la conferencia, remarcó que la política seguirá dependiendo de los datos…"
          onSave={(s) => updateCentralBankPressConference(currency, s)}
        />
        <TextSection
          title="Expectativas de Inflación"
          text={note?.inflationExpectations}
          placeholder="Ej. Proyecta inflación en 2.3% para el cierre de 2026…"
          onSave={(t) => updateCentralBankInflationExpectations(currency, t)}
        />
        <TextSection
          title="Expectativas de Crecimiento"
          text={note?.growthExpectations}
          placeholder="Ej. Proyecta crecimiento del PIB en 1.8% para 2026…"
          onSave={(t) => updateCentralBankGrowthExpectations(currency, t)}
        />
      </div>
    </div>
  );
}
