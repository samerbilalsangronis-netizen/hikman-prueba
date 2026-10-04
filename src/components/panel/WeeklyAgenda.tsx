import { useMemo, useState } from 'react';
import { CURRENCIES } from '../../data/CurrencyContext';
import { useCalendarEvents } from '../../data/CalendarEventsContext';
import { IMPACT_COLORS, IMPACT_LABELS } from '../../lib/impact';
import { REMIND_OPTIONS, remindLabel, groupEventsByDay, dateKeyOf, formatEventTime } from '../../lib/calendarEvents';
import { datesOfWeek, dayLabel, formatWeekRange, shiftWeek, todayLocalDate, weekStartOf } from '../../lib/journalWeek';
import type { CalendarEvent, Currency, ImpactLevel } from '../../types';

// Agenda Semanal (4-oct-2026) — pedido explícito del usuario para organizar
// los eventos económicos importantes de la semana y recibir un recordatorio
// por correo. El envío del correo lo hace un cron de GitHub Actions +
// api/trading-alert-email.ts?action=calendar-reminder (ver
// .github/workflows/sync-calendar-reminders.yml) — este componente solo
// carga/edita los eventos, no manda nada.

interface FormState {
  title: string;
  currency: Currency | '';
  date: string;
  time: string;
  impact: ImpactLevel;
  alarmEnabled: boolean;
  remindMinutesBefore: number;
}

function emptyForm(defaultDate: string): FormState {
  return { title: '', currency: '', date: defaultDate, time: '09:00', impact: 'medio', alarmEnabled: false, remindMinutesBefore: 60 };
}

function formFromEvent(event: CalendarEvent): FormState {
  const d = new Date(event.eventAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { title: event.title, currency: event.currency ?? '', date, time, impact: event.impact, alarmEnabled: event.alarmEnabled, remindMinutesBefore: event.remindMinutesBefore };
}

export function WeeklyAgenda() {
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocalDate()));
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const weekDates = useMemo(() => datesOfWeek(weekStart), [weekStart]);
  const today = todayLocalDate();

  const weekEvents = useMemo(() => {
    const keys = new Set(weekDates);
    return events.filter((e) => keys.has(dateKeyOf(e.eventAt)));
  }, [events, weekDates]);

  const groups = useMemo(() => groupEventsByDay(weekEvents), [weekEvents]);
  const groupByDate = useMemo(() => new Map(groups.map((g) => [g.dateKey, g])), [groups]);

  function openNew(date?: string) {
    setEditing(null);
    setForm(emptyForm(date ?? today));
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setForm(formFromEvent(event));
  }

  function closeModal() {
    setEditing(null);
    setForm(null);
  }

  async function handleSubmit() {
    if (!form || !form.title.trim()) return;
    const eventAt = new Date(`${form.date}T${form.time}`).toISOString();
    const patch = {
      title: form.title.trim(),
      currency: form.currency || undefined,
      eventAt,
      impact: form.impact,
      alarmEnabled: form.alarmEnabled,
      remindMinutesBefore: form.remindMinutesBefore,
    };
    if (editing) {
      await updateEvent(editing.id, patch);
    } else {
      await addEvent(patch);
    }
    closeModal();
  }

  async function handleDelete() {
    if (!editing) return;
    if (!window.confirm(`¿Borrar "${editing.title}"?`)) return;
    await deleteEvent(editing.id);
    closeModal();
  }

  async function toggleAlarm(event: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation();
    await updateEvent(event.id, { alarmEnabled: !event.alarmEnabled });
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          📅 Agenda Semanal
        </h2>
        <button
          onClick={() => openNew()}
          className="rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'var(--series-1)', color: '#fff' }}
        >
          + Agregar evento
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={() => setWeekStart((w) => shiftWeek(w, -1))} className="rounded-full px-2 py-1 text-xs" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          ← Anterior
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {formatWeekRange(weekStart)}
          </span>
          {weekStart !== weekStartOf(today) && (
            <button onClick={() => setWeekStart(weekStartOf(today))} className="rounded-full px-2 py-1 text-xs" style={{ color: 'var(--series-1)', border: '1px solid var(--border)' }}>
              Hoy
            </button>
          )}
        </div>
        <button onClick={() => setWeekStart((w) => shiftWeek(w, 1))} className="rounded-full px-2 py-1 text-xs" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          Siguiente →
        </button>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {weekDates.map((date) => {
          const isToday = date === today;
          const count = groupByDate.get(date)?.events.length ?? 0;
          return (
            <button
              key={date}
              onClick={() => openNew(date)}
              title={`Agregar evento el ${date}`}
              className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5"
              style={{ background: isToday ? 'color-mix(in srgb, var(--series-1) 15%, transparent)' : 'var(--surface-2)' }}
            >
              <span className="text-[10px] font-semibold uppercase" style={{ color: isToday ? 'var(--series-1)' : 'var(--text-muted)' }}>
                {dayLabel(date, true)}
              </span>
              <span className="text-sm font-bold" style={{ color: isToday ? 'var(--series-1)' : 'var(--text-secondary)' }}>
                {Number(date.slice(8, 10))}
              </span>
              {count > 0 && <span className="h-1 w-1 rounded-full" style={{ background: 'var(--series-1)' }} />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {weekDates.map((date) => {
          const group = groupByDate.get(date);
          return (
            <div key={date}>
              <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {dayLabel(date)} {Number(date.slice(8, 10))}
              </p>
              {group ? (
                <div className="flex flex-col gap-1.5">
                  {group.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => openEdit(event)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: IMPACT_COLORS[event.impact] }} title={IMPACT_LABELS[event.impact]} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {event.title}
                          </span>
                          {event.currency && (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ background: 'color-mix(in srgb, var(--series-1) 15%, transparent)', color: 'var(--series-1)' }}
                            >
                              {event.currency}
                            </span>
                          )}
                        </span>
                        {event.alarmEnabled && (
                          <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            🔔 Aviso {remindLabel(event.remindMinutesBefore)}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {formatEventTime(event.eventAt)}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => toggleAlarm(event, e)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleAlarm(event, e as unknown as React.MouseEvent)}
                        aria-label={event.alarmEnabled ? 'Apagar alarma' : 'Prender alarma'}
                        className="shrink-0 cursor-pointer p-1 text-base leading-none"
                        style={{ color: event.alarmEnabled ? 'var(--series-1)' : 'var(--text-muted)' }}
                      >
                        {event.alarmEnabled ? '🔔' : '🔕'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Sin eventos
                </p>
              )}
            </div>
          );
        })}
      </div>

      {form && (
        <div
          className="fixed inset-0 z-50 flex overflow-y-auto p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Editar evento' : 'Nuevo evento'}
        >
          <div className="m-auto w-full max-w-md rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Editar evento' : 'Nuevo evento'}
            </h3>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Título
                <input
                  autoFocus
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Decisión de tasas Fed"
                  className="rounded-md px-2.5 py-1.5 text-sm"
                  style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>

              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Divisa (opcional)
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as Currency | '' })}
                    className="rounded-md px-2.5 py-1.5 text-sm"
                    style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Sin divisa</option>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Fecha
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="rounded-md px-2.5 py-1.5 text-sm"
                    style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Hora
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="rounded-md px-2.5 py-1.5 text-sm"
                    style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </label>
              </div>

              <div>
                <p className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Impacto
                </p>
                <div className="flex gap-1.5">
                  {(['alto', 'medio', 'bajo'] as ImpactLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm({ ...form, impact: level })}
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={
                        form.impact === level
                          ? { background: IMPACT_COLORS[level], color: '#fff' }
                          : { border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                      }
                    >
                      {IMPACT_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={form.alarmEnabled} onChange={(e) => setForm({ ...form, alarmEnabled: e.target.checked })} />
                  🔔 Avisar por correo
                </label>
                {form.alarmEnabled && (
                  <select
                    value={form.remindMinutesBefore}
                    onChange={(e) => setForm({ ...form, remindMinutesBefore: Number(e.target.value) })}
                    className="rounded-md px-2 py-1 text-xs"
                    style={{ background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {REMIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              {editing ? (
                <button onClick={handleDelete} className="text-xs" style={{ color: 'var(--status-critical)' }}>
                  Borrar evento
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button onClick={closeModal} className="rounded-full px-3 py-1.5 text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.title.trim()}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'var(--series-1)', color: '#fff' }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
