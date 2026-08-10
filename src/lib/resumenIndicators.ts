import { CURRENCIES } from '../data/CurrencyContext';
import { indicatorsBySection } from '../data/indicators';
import type { Section } from '../types';

const SECTIONS: Section[] = ['crecimiento', 'empleo', 'inflacion', 'confianza', 'tasas'];

// Los "datos más importantes" de cada divisa son, literalmente, los que ya
// se muestran en Resumen (Dashboard.tsx): los primeros 3 indicadores sin
// subcomponentes de cada sección, por divisa — misma selección exacta, para
// que Pizarra Semanal y Fortaleza no muestren más ruido que el que el
// usuario ya ve en Resumen. Se calcula una sola vez a nivel de módulo (no
// depende de datos cargados, solo de metadata estática).
function buildResumenIndicatorIds(): Set<string> {
  const ids = new Set<string>();
  for (const currency of CURRENCIES) {
    for (const section of SECTIONS) {
      const list = indicatorsBySection(section, currency)
        .filter((meta) => !meta.parentId)
        .slice(0, 3);
      for (const meta of list) ids.add(meta.id);
    }
  }
  return ids;
}

export const RESUMEN_INDICATOR_IDS = buildResumenIndicatorIds();
