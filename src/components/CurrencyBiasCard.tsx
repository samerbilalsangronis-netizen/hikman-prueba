import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMacroData } from '../data/MacroDataContext';
import { useCurrency } from '../data/CurrencyContext';
import { BIAS_COLORS, BIAS_LABELS, BIAS_LEVELS } from '../lib/bias';
import { formatDate } from '../lib/format';
import type { BiasLevel, BiasSnapshot, CurrencyBias } from '../types';

function toDateInput(iso?: string) {
  return iso ? iso.slice(0, 10) : '';
}

function Dot({ level }: { level: BiasLevel }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: BIAS_COLORS[level] }} title={BIAS_LABELS[level]} />;
}

// Resumen semanal: editor WYSIWYG (contentEditable) — negrita real mientras
// se escribe, como Word, no marcado tipo **negrita**. Se guarda como HTML
// reducido a solo <strong>/<br>/texto (sanitizeSummaryHtml recorre el DOM
// y descarta cualquier otra etiqueta, así que pegar contenido con estilos
// de otro lado no mete basura). toDisplayHtml además migra resúmenes
// viejos guardados con el markdown **negrita** de la versión anterior.
function sanitizeSummaryHtml(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;
  function esc(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function walk(node: ChildNode): string {
    if (node.nodeType === Node.TEXT_NODE) return esc(node.textContent ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const inner = Array.from(el.childNodes).map(walk).join('');
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') return '<br>';
    if (tag === 'b' || tag === 'strong') return `<strong>${inner}</strong>`;
    if (tag === 'div' || tag === 'p') return `${inner}<br>`;
    return inner;
  }
  return Array.from(container.childNodes).map(walk).join('');
}

function markdownToHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

// Un resumen ya migrado al editor nuevo trae <strong>/<br> propios; uno
// viejo (guardado antes de este cambio) es texto plano con **negrita**.
function toDisplayHtml(raw: string): string {
  return /<\/?(strong|br)\b/i.test(raw) ? sanitizeSummaryHtml(raw) : markdownToHtml(raw);
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

  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const levelPickerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const lastSyncedSummaryRef = useRef<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingBase, setEditingBase] = useState(false);
  const [centralBank, setCentralBank] = useState(bias.centralBank);
  const [policyRate, setPolicyRate] = useState(bias.policyRate);
  const [nextMeeting, setNextMeeting] = useState(toDateInput(bias.nextMeeting));

  const [reasonLabel, setReasonLabel] = useState('');
  const [reasonColor, setReasonColor] = useState<BiasLevel>('neutral');

  useEffect(() => {
    if (!levelPickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (levelPickerRef.current && !levelPickerRef.current.contains(e.target as Node)) {
        setLevelPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [levelPickerOpen]);

  // Sincroniza el contentEditable con bias.current.summary solo cuando el
  // cambio viene de "afuera" (carga inicial, rollover, otro dispositivo) —
  // nunca mientras el usuario está escribiendo ahí mismo, porque pisarle el
  // innerHTML le resetearía el cursor a cada tecla.
  useEffect(() => {
    const el = summaryRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (lastSyncedSummaryRef.current === bias.current.summary) return;
    el.innerHTML = toDisplayHtml(bias.current.summary);
    lastSyncedSummaryRef.current = bias.current.summary;
  }, [bias.current.summary, bias.currency]);

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
      `¿Actualizar sesgo de ${bias.currency}? La semana en curso se archiva en el historial y arranca una semana nueva en blanco. El badge grande se mantiene hasta que lo cambies vos.`,
    );
    if (!ok) return;
    rolloverBias(bias.currency);
  }

  function commitSummaryFromDom() {
    const el = summaryRef.current;
    if (!el) return;
    const html = sanitizeSummaryHtml(el.innerHTML);
    lastSyncedSummaryRef.current = html;
    updateBiasSummary(bias.currency, html);
  }

  function handleSummaryInput() {
    commitSummaryFromDom();
  }

  function handleSummaryKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      commitSummaryFromDom();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleBoldSummary();
    }
  }

  // onMouseDown con preventDefault evita que el botón le robe el foco/la
  // selección al contentEditable antes de aplicar execCommand('bold') —
  // sin esto, document.getSelection() ya estaría vacía al hacer click.
  function handleBoldSummary() {
    summaryRef.current?.focus();
    document.execCommand('bold');
    commitSummaryFromDom();
  }

  function handleSaveBase() {
    updateBiasBase(bias.currency, { centralBank, policyRate, nextMeeting: nextMeeting || undefined });
    setEditingBase(false);
  }

  function renderSnapshot(snapshot: BiasSnapshot, key: string, endedAt: string) {
    return (
      <div key={key} className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold" style={{ color: snapshot.level ? BIAS_COLORS[snapshot.level] : 'var(--text-muted)' }}>
            {snapshot.level ? BIAS_LABELS[snapshot.level] : 'Sin definir'}
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)' }}>
          Resumen Semanal: {formatDate(snapshot.startedAt.slice(0, 10))} hasta {formatDate(endedAt.slice(0, 10))}
        </span>
        {snapshot.summary && (
          <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: toDisplayHtml(snapshot.summary) }} />
        )}
        {snapshot.reasons.length > 0 && (
          <div className="flex flex-col gap-1">
            {snapshot.reasons.map((r) => (
              <span key={r.id} className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Dot level={r.color} />
                {r.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
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
        <div ref={levelPickerRef} className="relative inline-block">
          <button
            onClick={() => setLevelPickerOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
            style={{
              background: bias.current.level ? BIAS_COLORS[bias.current.level] : 'transparent',
              color: bias.current.level ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${bias.current.level ? BIAS_COLORS[bias.current.level] : 'var(--border)'}`,
            }}
          >
            {bias.current.level ? BIAS_LABELS[bias.current.level] : 'Sin definir'}
            <span style={{ fontSize: '0.7em' }}>▾</span>
          </button>
          {levelPickerOpen && (
            <div
              className="absolute left-0 top-full z-10 mt-1 flex min-w-[10rem] flex-col gap-0.5 rounded-lg p-1.5 shadow-lg"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              {BIAS_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    updateBiasLevel(bias.currency, level);
                    setLevelPickerOpen(false);
                  }}
                  className="rounded-md px-2.5 py-1.5 text-left text-xs font-bold uppercase tracking-wide"
                  style={{
                    background: bias.current.level === level ? BIAS_COLORS[level] : 'transparent',
                    color: bias.current.level === level ? '#fff' : BIAS_COLORS[level],
                  }}
                >
                  {BIAS_LABELS[level]}
                </button>
              ))}
            </div>
          )}
        </div>
        {bias.history[0]?.level && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Anterior: <span style={{ color: BIAS_COLORS[bias.history[0].level as BiasLevel] }}>{BIAS_LABELS[bias.history[0].level as BiasLevel]}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleBoldSummary}
            title="Negrita (Ctrl/Cmd+B)"
            className="rounded-md px-2 py-1 text-xs font-bold"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            N
          </button>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Seleccioná texto y tocá "N" (o Ctrl/Cmd+B) para ponerlo en negrita
          </span>
        </div>
        <div
          ref={summaryRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleSummaryInput}
          onKeyDown={handleSummaryKeyDown}
          data-placeholder="Resumen / motivo del sesgo…"
          className="bias-summary-editable w-full rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: '5.5rem', whiteSpace: 'pre-wrap' }}
        />
      </div>

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
                  <Dot level={reason.color} />
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
            onChange={(e) => setReasonColor(e.target.value as BiasLevel)}
            className="rounded-md px-2 py-1 text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {BIAS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {BIAS_LABELS[level]}
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
        {showHistory ? 'Ocultar historial' : `Historial (${bias.history.length})`}
      </button>
      {showHistory && (
        <div className="flex flex-col gap-2 rounded-md p-3 text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {bias.history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Todavía no hay semanas archivadas.</p>
          ) : (
            bias.history.map((snapshot, i) =>
              renderSnapshot(snapshot, snapshot.id ?? String(i), i === 0 ? bias.current.startedAt : bias.history[i - 1].startedAt),
            )
          )}
        </div>
      )}
    </div>
  );
}
