// Ciclo semanal Lunes-a-Domingo compartido por el Cuaderno de Economía, el
// Informe de Mentoría y el progreso de las tarjetas de Sesgo Semanal
// (2-oct-2026) — el usuario lo describió como "lunes a domingo, se archiva
// al llegar el domingo a medianoche", así que la semana arranca el LUNES y
// termina el domingo a la noche (no domingo-a-domingo con el domingo como
// primer día).

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** YYYY-MM-DD en la fecha local del usuario (no UTC — a diferencia de
 * toISOString(), que puede saltar de día cerca de medianoche según el huso). */
export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Date.getDay(): 0=domingo..6=sábado -> índice lunes-primero (0=lunes..6=domingo).
function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Lunes (YYYY-MM-DD) que arranca la semana que contiene `dateStr`. */
export function weekStartOf(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() - mondayFirstIndex(d.getDay()));
  return formatLocalDate(d);
}

/** 0 (lunes) .. 6 (domingo) dentro de su semana. */
export function dayIndexInWeek(dateStr: string): number {
  return mondayFirstIndex(parseLocalDate(dateStr).getDay());
}

export function dayLabel(dateStr: string, short = false): string {
  const idx = dayIndexInWeek(dateStr);
  return short ? DAY_LABELS_SHORT[idx] : DAY_LABELS[idx];
}

/** Las 7 fechas (lunes a domingo) de la semana que arranca en `weekStart`. */
export function datesOfWeek(weekStart: string): string[] {
  const start = parseLocalDate(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return formatLocalDate(d);
  });
}

export function isCurrentWeek(weekStart: string): boolean {
  return weekStart === weekStartOf(todayLocalDate());
}

export function formatWeekRange(weekStart: string): string {
  const dates = datesOfWeek(weekStart);
  const start = parseLocalDate(dates[0]);
  const end = parseLocalDate(dates[6]);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}
