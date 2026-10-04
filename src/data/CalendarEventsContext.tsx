import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabaseClient';
import type { CalendarEvent, Currency, ImpactLevel } from '../types';

// Agenda Semanal (4-oct-2026) — mismo patrón que JournalContext.tsx:
// Supabase como fuente de verdad, con localStorage de respaldo cuando
// Supabase no está configurado. Provider propio porque es otro dominio de
// datos independiente (no se suma a MacroDataContext).

const EVENTS_KEY = 'calendar:events:v1';

function loadLocal(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

export interface CalendarEventInput {
  title: string;
  currency?: Currency;
  eventAt: string;
  impact: ImpactLevel;
  alarmEnabled: boolean;
  remindMinutesBefore: number;
}

interface CalendarEventsValue {
  events: CalendarEvent[];
  loading: boolean;
  addEvent: (input: CalendarEventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, patch: Partial<CalendarEventInput>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const CalendarEventsContext = createContext<CalendarEventsValue | null>(null);

export function CalendarEventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadLocal());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabaseEnabled || !supabase) {
        setLoading(false);
        return;
      }
      try {
        const res = await supabase.from('calendar_events').select('*').order('event_at', { ascending: true });
        if (cancelled) return;
        if (res.error) throw res.error;
        const loaded: CalendarEvent[] = (res.data ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          currency: e.currency ?? undefined,
          eventAt: e.event_at,
          impact: e.impact,
          alarmEnabled: e.alarm_enabled,
          remindMinutesBefore: e.remind_minutes_before,
          notifiedAt: e.notified_at ?? undefined,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }));
        setEvents(loaded);
      } catch (err) {
        console.error('No se pudo cargar la Agenda Semanal desde Supabase', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addEvent = useCallback(async (input: CalendarEventInput) => {
    const now = new Date().toISOString();
    const next: CalendarEvent = {
      id: crypto.randomUUID(),
      title: input.title,
      currency: input.currency,
      eventAt: input.eventAt,
      impact: input.impact,
      alarmEnabled: input.alarmEnabled,
      remindMinutesBefore: input.remindMinutesBefore,
      notifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    setEvents((prev) => {
      const updated = [...prev, next].sort((a, b) => a.eventAt.localeCompare(b.eventAt));
      if (!supabaseEnabled) localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (supabaseEnabled && supabase) {
      try {
        await supabase.from('calendar_events').insert({
          id: next.id,
          title: next.title,
          currency: next.currency ?? null,
          event_at: next.eventAt,
          impact: next.impact,
          alarm_enabled: next.alarmEnabled,
          remind_minutes_before: next.remindMinutesBefore,
        });
      } catch (err) {
        console.error('No se pudo guardar el evento en Supabase', err);
      }
    }
    return next;
  }, []);

  const updateEvent = useCallback(async (id: string, patch: Partial<CalendarEventInput>) => {
    const now = new Date().toISOString();
    setEvents((prev) => {
      const updated = prev
        .map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now, notifiedAt: patch.eventAt ? null : e.notifiedAt } : e))
        .sort((a, b) => a.eventAt.localeCompare(b.eventAt));
      if (!supabaseEnabled) localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      const dbPatch: Record<string, unknown> = { updated_at: now };
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.currency !== undefined) dbPatch.currency = patch.currency ?? null;
      if (patch.eventAt !== undefined) {
        dbPatch.event_at = patch.eventAt;
        // Si se cambió la fecha/hora, el recordatorio (si ya se había
        // mandado para la ventana vieja) tiene que poder volver a dispararse.
        dbPatch.notified_at = null;
      }
      if (patch.impact !== undefined) dbPatch.impact = patch.impact;
      if (patch.alarmEnabled !== undefined) dbPatch.alarm_enabled = patch.alarmEnabled;
      if (patch.remindMinutesBefore !== undefined) dbPatch.remind_minutes_before = patch.remindMinutesBefore;
      await supabase.from('calendar_events').update(dbPatch).eq('id', id);
    } catch (err) {
      console.error('No se pudo actualizar el evento en Supabase', err);
    }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    setEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (!supabaseEnabled) localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
    if (!supabaseEnabled || !supabase) return;
    try {
      await supabase.from('calendar_events').delete().eq('id', id);
    } catch (err) {
      console.error('No se pudo borrar el evento en Supabase', err);
    }
  }, []);

  const value = useMemo<CalendarEventsValue>(
    () => ({ events, loading, addEvent, updateEvent, deleteEvent }),
    [events, loading, addEvent, updateEvent, deleteEvent],
  );

  return <CalendarEventsContext.Provider value={value}>{children}</CalendarEventsContext.Provider>;
}

export function useCalendarEvents(): CalendarEventsValue {
  const ctx = useContext(CalendarEventsContext);
  if (!ctx) throw new Error('useCalendarEvents debe usarse dentro de CalendarEventsProvider');
  return ctx;
}
