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
// texto, <br>, <strong>, <em>, <u>, <span style="color:rgb(...)"> y
// <span class="journal-sticker" data-color="..."> con el texto del sticker
// adentro. Negrita/cursiva/subrayado + mayúscula/minúscula/tipo título
// (4-oct-2026, a pedido del usuario) van en EconomyNotebook.tsx.

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
    if (tag === 'i' || tag === 'em') return `<em>${inner}</em>`;
    if (tag === 'u') return `<u>${inner}</u>`;
    if (tag === 'div' || tag === 'p') return `${inner}<br>`;
    if (tag === 'span' && el.classList.contains('journal-sticker')) {
      const color = el.getAttribute('data-color') ?? '';
      const textColor = el.getAttribute('data-text') ?? '';
      return isValidColor(color) && isValidColor(textColor) ? stickerHtml(el.textContent ?? '', color, textColor) : inner;
    }
    if (tag === 'span') {
      // execCommand con styleWithCSS activado (ver EconomyNotebook.tsx, lo
      // activan resaltar/sticker/negrita/cursiva/subrayado por igual) puede
      // generar negrita/cursiva/subrayado como estilos inline en vez de
      // <strong>/<em>/<u> — se detectan acá y se envuelven igual que si
      // hubieran venido como esas etiquetas nativas, para no perder el
      // formato al guardar.
      const color = el.style.color;
      const bold = /^(bold|bolder|[6-9]\d\d)$/i.test(el.style.fontWeight);
      const italic = el.style.fontStyle === 'italic';
      const underline = /underline/.test(el.style.textDecorationLine || el.style.textDecoration);
      let result = color && isValidColor(color) ? `<span style="color:${color}">${inner}</span>` : inner;
      if (underline) result = `<u>${result}</u>`;
      if (italic) result = `<em>${result}</em>`;
      if (bold) result = `<strong>${result}</strong>`;
      return result;
    }
    if (tag === 'img') {
      // Capturas pegadas con Ctrl+V (4-oct-2026) — solo se acepta src
      // http(s) (nunca data:/javascript:), nunca el atributo src tal cual
      // sin validar, por las dudas de que se haya pegado HTML de otro lado.
      const src = el.getAttribute('src') ?? '';
      return /^https:\/\//.test(src) ? `<img src="${src.replace(/"/g, '&quot;')}" class="journal-inline-image" alt="Captura pegada">` : '';
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

export type CaseMode = 'upper' | 'lower' | 'title';

function applyCase(text: string, mode: CaseMode): string {
  if (mode === 'upper') return text.toUpperCase();
  if (mode === 'lower') return text.toLowerCase();
  return text.toLowerCase().replace(/(^|[\s.,;:!?¡¿"'(-])\p{L}/gu, (c) => c.toUpperCase());
}

/** Transforma may/minúscula/tipo título del texto SELECCIONADO en un
 * contentEditable, preservando el formato (color/negrita/etc.) de cada
 * tramo — clona el contenido de la selección y camina sus nodos de texto en
 * vez de reemplazar por texto plano (lo que perdería el formato). Devuelve
 * false si no hay nada seleccionado. Simplificación conocida: si una
 * palabra queda partida justo en el límite entre dos tramos con formato
 * distinto, "Tipo Título" puede capitalizar de más ahí — caso raro, no
 * amerita la complejidad de unificar el texto entre nodos para esto. */
export function transformSelectionCase(mode: CaseMode): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) textNodes.push(node as Text);
  if (textNodes.length === 0) return false;
  for (const textNode of textNodes) {
    textNode.nodeValue = applyCase(textNode.nodeValue ?? '', mode);
  }
  range.deleteContents();
  range.insertNode(fragment);
  selection.removeAllRanges();
  return true;
}

/** Migra texto plano viejo (antes de este cambio, el cuaderno guardaba texto
 * sin formato) a HTML válido para el editor — igual criterio que
 * CurrencyBiasCard.tsx para sus resúmenes viejos. */
export function toDisplayHtml(raw: string): string {
  if (/<\/?(strong|br|span|em|u|img)\b/i.test(raw)) return sanitizeJournalHtml(raw);
  return escapeHtml(raw).replace(/\n/g, '<br>');
}
