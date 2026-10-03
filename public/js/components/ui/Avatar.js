import { h } from '../../lib/dom.js';
import { fullName, initials } from '../../lib/format.js';

/** Avatar con iniciales (sin fotografías remotas, RNF-048). Decorativo: el nombre va al lado. */
export function avatar(person, { size = null } = {}) {
  return h('span', { class: ['avatar', size && `avatar--${size}`], 'aria-hidden': 'true', text: initials(person) });
}

/** Avatar + nombre + línea secundaria; `href` convierte el nombre en enlace. */
export function personLine(person, { meta = null, href = null, size = 'sm' } = {}) {
  const name = fullName(person);
  return h('span', { class: 'person' },
    avatar(person, { size }),
    h('span', { class: 'person__text' },
      href ? h('a', { class: 'person__name', href, text: name }) : h('span', { class: 'person__name', text: name }),
      meta ? h('span', { class: 'person__meta', text: meta }) : null));
}
