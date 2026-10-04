import type { CalendarEvent } from '../types';

// Agenda Semanal (4-oct-2026) — helpers de formato/agrupado, separados del
// componente para poder testear/reusar sin JSX.

export const REMIND_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 180, label: '3 horas antes' },
  { value: 1440, label: '1 día antes' },
];

export function remindLabel(minutes: number): string {
  return REMIND_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes} min antes`;
}

export interface CalendarDayGroup {
  /** YYYY-MM-DD en la zona horaria local, usado como key de agrupado. */
  dateKey: string;
  /** Ej. "Lunes 6 oct". */
  label: string;
  events: CalendarEvent[];
}

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

export function dateKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Agrupa eventos por día local, ordenados por fecha/hora ascendente. */
export function groupEventsByDay(events: CalendarEvent[]): CalendarDayGroup[] {
  const sorted = [...events].sort((a, b) => a.eventAt.localeCompare(b.eventAt));
  const groups: CalendarDayGroup[] = [];
  for (const event of sorted) {
    const dateKey = dateKeyOf(event.eventAt);
    let group = groups.find((g) => g.dateKey === dateKey);
    if (!group) {
      const label = DAY_LABEL_FORMAT.format(new Date(event.eventAt));
      group = { dateKey, label: label.charAt(0).toUpperCase() + label.slice(1), events: [] };
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
