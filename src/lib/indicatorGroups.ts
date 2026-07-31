import type { IndicatorMeta } from '../types';

export interface IndicatorGroup {
  parent: IndicatorMeta;
  children: IndicatorMeta[];
}

// Agrupa una lista de indicadores en padres (sin parentId) + sus hijos
// (parentId apuntando a ese padre), preservando el orden de aparición de
// los padres en `items`. Usado por Crecimiento.tsx (para decidir qué
// tarjeta abre el modal de subcomponentes) y Actualizar.tsx (para que la
// fila de cada subcomponente aparezca inmediatamente debajo de su padre,
// en vez de todos los padres primero y los hijos amontonados al final).
export function groupByParent(items: IndicatorMeta[]): IndicatorGroup[] {
  const childrenByParent = new Map<string, IndicatorMeta[]>();
  for (const item of items) {
    if (item.parentId) childrenByParent.set(item.parentId, [...(childrenByParent.get(item.parentId) ?? []), item]);
  }
  return items.filter((item) => !item.parentId).map((parent) => ({ parent, children: childrenByParent.get(parent.id) ?? [] }));
}
