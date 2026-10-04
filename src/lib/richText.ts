// Editor de texto enriquecido del Cuaderno de Economía (4-oct-2026, a
// pedido del usuario: "debe poder cambiar el color de las letras al
// resaltarlas") — mismo patrón contentEditable que el resumen semanal de
// CurrencyBiasCard.tsx, pero acá además de negrita se puede resaltar texto
// seleccionado con cualquiera de los 7 colores de lib/journalColors.ts, y
// pegar "stickers" de referencia (Hawkish/Dovish/etc.).
//
// Sanitización: nunca se copia un atributo style/class tal cual desde el DOM
// (podría traer basura si se pegó contenido de otro lado) — se reconstruye
// desde cero cada span, validando que el color sea un color real antes de
// usarlo. Así el HTML guardado siempre es un subconjunto chico y conocido:
// texto, <br>, <strong>, <span style="color:rgb(...)"> y
// <span class="journal-sticker" data-color="..."> con el texto del sticker
// adentro.

const RGB_COLOR_RE = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isValidColor(color: string): boolean {
  return RGB_COLOR_RE.test(color) || HEX_COLOR_RE.test(color);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function stickerHtml(label: string, color: string, textColor: string): string {
  return `<span class="journal-sticker" data-color="${color}" data-text="${textColor}" style="background:${color};color:${textColor}">${escapeHtml(label)}</span> `;
}

export function sanitizeJournalHtml(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  function walk(node: ChildNode): string {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const inner = Array.from(el.childNodes).map(walk).join('');
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') return '<br>';
    if (tag === 'b' || tag === 'strong') return `<strong>${inner}</strong>`;
    if (tag === 'div' || tag === 'p') return `${inner}<br>`;
    if (tag === 'span' && el.classList.contains('journal-sticker')) {
      const color = el.getAttribute('data-color') ?? '';
      const textColor = el.getAttribute('data-text') ?? '';
      return isValidColor(color) && isValidColor(textColor) ? stickerHtml(el.textContent ?? '', color, textColor) : inner;
    }
    if (tag === 'span') {
      const color = el.style.color;
      return color && isValidColor(color) ? `<span style="color:${color}">${inner}</span>` : inner;
    }
    // document.execCommand('foreColor') genera <font color="..."> en vez de
    // <span style="color:..."> salvo que styleWithCSS esté activado (ver
    // EconomyNotebook.tsx) — se normaliza igual acá por las dudas, por si
    // algún navegador no lo respeta o se pegó HTML viejo de otro lado.
    if (tag === 'font') {
      const color = el.getAttribute('color') ?? '';
      return isValidColor(color) ? `<span style="color:${color}">${inner}</span>` : inner;
    }
    return inner;
  }

  return Array.from(container.childNodes).map(walk).join('');
}

/** Migra texto plano viejo (antes de este cambio, el cuaderno guardaba texto
 * sin formato) a HTML válido para el editor — igual criterio que
 * CurrencyBiasCard.tsx para sus resúmenes viejos. */
export function toDisplayHtml(raw: string): string {
  if (/<\/?(strong|br|span)\b/i.test(raw)) return sanitizeJournalHtml(raw);
  return escapeHtml(raw).replace(/\n/g, '<br>');
}
