/**
 * Construcción de nodos sin innerHTML (RNF-033): todo el texto entra con textContent.
 *
 *   h('a', { class: 'btn', href: '#/inicio', onclick: fn }, 'Inicio', icon('house'))
 *
 * Propiedades: class, text, dataset, style (objeto de propiedades CSS),
 * on<evento> (función), booleanos (true = atributo vacío, false/null = sin atributo)
 * y cualquier otro atributo como texto.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') {
      el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
    } else if (key === 'text') {
      el.textContent = String(value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'style') {
      for (const [prop, v] of Object.entries(value)) el.style.setProperty(prop, String(v));
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

/** Añade hijos: nodos, textos (como nodos de texto) o listas; ignora null y false. */
export function append(parent, children) {
  for (const child of [children].flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Sustituye el contenido de un nodo. */
export function replace(parent, ...children) {
  parent.replaceChildren();
  return append(parent, children);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Nodo SVG (para iconos del sprite). */
export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined && value !== false) el.setAttribute(key, String(value));
  }
  for (const child of children.flat()) if (child) el.append(child);
  return el;
}

let uid = 0;
/** Identificador único para enlazar label, aria-labelledby y aria-describedby. */
export function uniqueId(prefix = 'ph') {
  uid += 1;
  return `${prefix}-${uid}`;
}
