// Calendario oficial de reuniones del FOMC (federalreserve.gov/monetarypolicy/fomccalendars.htm).
// La fecha es el segundo día de la reunión de 2 días, cuando se anuncia la
// decisión. "sep" = reunión con Resumen de Proyecciones Económicas (dot plot).
export interface FomcMeeting {
  date: string;
  sep: boolean;
}

export const FOMC_MEETINGS_2026: FomcMeeting[] = [
  { date: '2026-01-28', sep: false },
  { date: '2026-03-18', sep: true },
  { date: '2026-04-29', sep: false },
  { date: '2026-06-17', sep: true },
  { date: '2026-07-29', sep: false },
  { date: '2026-09-16', sep: true },
  { date: '2026-10-28', sep: false },
  { date: '2026-12-09', sep: true },
];

export function upcomingFomcMeetings(now: Date = new Date()): FomcMeeting[] {
  const today = now.toISOString().slice(0, 10);
  return FOMC_MEETINGS_2026.filter((m) => m.date >= today);
}
