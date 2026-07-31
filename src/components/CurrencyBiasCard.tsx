import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { BIAS_COLORS, BIAS_LABELS, REASON_COLORS, REASON_COLOR_LABELS } from '../lib/bias';
import { formatDate } from '../lib/format';
import type { BiasLevel, CurrencyBias, ReasonColor } from '../types';

const BIAS_LEVELS: BiasLevel[] = ['hawkish', 'neutral_alcista', 'neutral', 'neutral_bajista', 'dovish'];
const REASON_COLOR_OPTIONS: ReasonColor[] = ['good', 'neutral', 'bad'];

function toDateInput(iso?: string) {
  return iso ? iso.slice(0, 10) : '';
}

interface CurrencyBiasCardProps {
  bias: CurrencyBias;
}

export function CurrencyBiasCard({ bias }: CurrencyBiasCardProps) {
  const {
    updateBiasLevel,
    updateBiasSummary,
    updateBiasBase,
    addBiasReason,
    removeBiasReason,
    setHeadlineBiasCurrency,
    rolloverBias,
  } = useMacroData();
  const { setCurrency } = useCurrency();
  const navigate = useNavigate();

  const [showHistory, setShowHistory] = useState(false);
  const [editingBase, setEditingBase] = useState(false);
  const [centralBank, setCentralBank] = useState(bias.centralBank);
  const [policyRate, setPolicyRate] = useState(bias.policyRate);
  const [nextMeeting, setNextMeeting] = useState(toDateInput(bias.nextMeeting));

  const [reasonLabel, setReasonLabel] = useState('');
  const [reasonColor, setReasonColor] = useState<ReasonColor>('neutral');

  function handleViewCurrency() {
    setCurrency(bias.currency);
    navigate('/');
  }

  function handleAddReason() {
    if (!reasonLabel.trim()) return;
    addBiasReason(bias.currency, { label: reasonLabel.trim(), color: reasonColor });
    setReasonLabel('');
    setReasonColor('neutral');
  }

  function handleRemoveReason(reasonId: string, headlineId?: string) {
    if (headlineId) setHeadlineBiasCurrency(headlineId, undefined);
    else removeBiasReason(bias.currency, reasonId);
  }

  function handleRollover() {
    const ok = window.confirm(
      `¿Actualizar sesgo de ${bias.currency}? La semana en curso pasa a "Anterior" y arranca una semana nueva en blanco. El badge grande se mantiene hasta que lo cambies vos.`,
    );
    if (!ok) return;
    rolloverBias(bias.currency);
  }

  function handleSaveBase() {
    updateBiasBase(bias.currency, { centralBank, policyRate, nextMeeting: nextMeeting || undefined });
    setEditingBase(false);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {bias.currency}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {bias.centralBank}
          </p>
        </div>
        <button onClick={handleViewCurrency} className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Ver divisa →
        </button>
      </div>

      <div>
        <div className="flex flex-wrap gap-1.5">
          {BIAS_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => updateBiasLevel(bias.currency, level)}
              className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
              style={{
                background: bias.current.level === level ? BIAS_COLORS[level] : 'transparent',
                color: bias.current.level === level ? '#fff' : BIAS_COLORS[level],
                border: `1px solid ${BIAS_COLORS[level]}`,
              }}
            >
              {BIAS_LABELS[level]}
            </button>
          ))}
        </div>
        {bias.previous?.level && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Anterior: <span style={{ color: BIAS_COLORS[bias.previous.level] }}>{BIAS_LABELS[bias.previous.level]}</span>
          </p>
        )}
      </div>

      <textarea
        value={bias.current.summary}
        onChange={(e) => updateBiasSummary(bias.currency, e.target.value)}
        placeholder="Resumen / motivo del sesgo…"
        rows={2}
        className="w-full resize-none rounded-md px-3 py-2 text-sm"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />

      <div>
        <p className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          Motivos de la semana en curso
        </p>
        <div className="flex flex-col gap-1">
          {bias.current.reasons.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Sin motivos cargados todavía.
            </p>
          ) : (
            bias.current.reasons.map((reason) => (
              <div key={reason.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1" style={{ border: '1px solid var(--border)' }}>
                <span className="flex min-w-0 items-center gap-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: REASON_COLORS[reason.color] }} title={REASON_COLOR_LABELS[reason.color]} />
                  <span className="truncate">{reason.label}</span>
                  {reason.headlineId && (
                    <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      📌 titular
                    </span>
                  )}
                </span>
                <button onClick={() => handleRemoveReason(reason.id, reason.headlineId)} className="shrink-0 text-xs" style={{ color: 'var(--delta-bad)' }}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input
            type="text"
            value={reasonLabel}
            onChange={(e) => setReasonLabel(e.target.value)}
            placeholder="Nombre del dato…"
            className="min-w-[140px] flex-1 rounded-md px-2 py-1 text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <select
            value={reasonColor}
            onChange={(e) => setReasonColor(e.target.value as ReasonColor)}
            className="rounded-md px-2 py-1 text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {REASON_COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {REASON_COLOR_LABELS[c]}
              </option>
            ))}
          </select>
          <button onClick={handleAddReason} className="rounded-md px-2.5 py-1 text-xs font-semibold text-white" style={{ background: 'var(--series-1)' }}>
            + Agregar
          </button>
        </div>
      </div>

      <button onClick={handleRollover} className="self-start rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ background: 'var(--series-2)' }}>
        ⟳ Actualizar sesgo (fin de semana)
      </button>

      {editingBase ? (
        <div className="flex flex-col gap-1.5 rounded-md p-2" style={{ border: '1px solid var(--border)' }}>
          <input
            type="text"
            value={centralBank}
            onChange={(e) => setCentralBank(e.target.value)}
            placeholder="Banco central"
            className="rounded-md px-2 py-1 text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="text"
            value={policyRate}
            onChange={(e) => setPolicyRate(e.target.value)}
            placeholder="Tasa (ej. 4.25%–4.50%)"
            className="rounded-md px-2 py-1 text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="date"
            value={nextMeeting}
            onChange={(e) => setNextMeeting(e.target.value)}
            className="rounded-md px-2 py-1 text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-1.5">
            <button onClick={handleSaveBase} className="rounded-md px-2.5 py-1 text-xs font-semibold text-white" style={{ background: 'var(--series-1)' }}>
              Guardar
            </button>
            <button onClick={() => setEditingBase(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>
            Tasa: <strong>{bias.policyRate || '—'}</strong>
            {bias.nextMeeting && <> · Próx. reunión: {formatDate(bias.nextMeeting)}</>}
          </span>
          <button onClick={() => setEditingBase(true)} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>
            Editar
          </button>
        </div>
      )}

      <button onClick={() => setShowHistory((v) => !v)} className="self-start text-xs underline" style={{ color: 'var(--text-muted)' }}>
        {showHistory ? 'Ocultar historial' : 'Historial'}
      </button>
      {showHistory && (
        <div className="rounded-md p-3 text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {bias.previous ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: bias.previous.level ? BIAS_COLORS[bias.previous.level] : 'var(--text-muted)' }}>
                  {bias.previous.level ? BIAS_LABELS[bias.previous.level] : 'Sin definir'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{formatDate(bias.previous.startedAt.slice(0, 10))}</span>
              </div>
              {bias.previous.summary && <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{bias.previous.summary}</p>}
              <div className="mt-1.5 flex flex-col gap-1">
                {bias.previous.reasons.map((r) => (
                  <span key={r.id} className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: REASON_COLORS[r.color] }} />
                    {r.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Todavía no hay una semana anterior archivada.</p>
          )}
        </div>
      )}
    </div>
  );
}
