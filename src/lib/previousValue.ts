import type { RecentUpdate } from '../data/MacroDataContext';

// Valor anterior por (indicador, fecha) usando TODO el historial cargado —
// no solo una ventana visible — para poder mostrar "Anterior" en cualquier
// tarjeta/nodo, incluso si el punto previo quedó fuera del recorte que se
// esté mirando en ese momento.
export function buildPreviousValueMap(recentUpdates: RecentUpdate[]): Map<string, number> {
  const byIndicator = new Map<string, { date: string; value: number }[]>();
  for (const u of recentUpdates) {
    if (!byIndicator.has(u.indicatorId)) byIndicator.set(u.indicatorId, []);
    byIndicator.get(u.indicatorId)!.push({ date: u.date, value: u.value });
  }
  const result = new Map<string, number>();
  for (const [id, list] of byIndicator) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < list.length; i++) {
      result.set(`${id}:${list[i].date}`, list[i - 1].value);
    }
  }
  return result;
}
