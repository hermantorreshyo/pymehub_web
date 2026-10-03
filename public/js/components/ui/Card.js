import { h, uniqueId } from '../../lib/dom.js';
import { icon } from './Icon.js';

/**
 * Tarjeta: <section> etiquetada por su título (RNF-045).
 * body puede ser un nodo, una lista de nodos o texto.
 */
export function card({ title = null, iconName = null, headingLevel = 2, actions = null, body = null, className = '' } = {}) {
  const titleId = title ? uniqueId('card') : null;
  const heading = title
    ? h(`h${headingLevel}`, { class: 'card__title', id: titleId }, iconName ? icon(iconName) : null, title)
    : null;
  return h('section', { class: ['card', className], 'aria-labelledby': titleId },
    heading || actions ? h('header', { class: 'card__header' }, heading, actions) : null,
    body !== null ? h('div', { class: 'card__body' }, body) : null);
}
