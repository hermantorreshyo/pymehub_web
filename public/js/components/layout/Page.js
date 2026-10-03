import { h, uniqueId } from '../../lib/dom.js';
import { icon } from '../ui/Icon.js';

/**
 * Página estándar: cabecera con h1 (recibe el foco al navegar), acciones y contenido.
 * Devuelve lo que espera el router: { title, node }.
 */
export function page({ title, subtitle = null, actions = null, back = null, tabs = null, children = [] }) {
  const titleId = uniqueId('titulo');
  const node = h('section', { class: 'page', 'aria-labelledby': titleId },
    h('header', { class: 'page-header' },
      h('div', { class: 'page-header__text' },
        back ? h('a', { class: 'back-link', href: back.href }, icon('arrow-left'), back.label) : null,
        h('h1', { id: titleId, tabindex: '-1', text: title }),
        subtitle ? h('p', { class: 'muted', text: subtitle }) : null),
      actions ? h('div', { class: 'page-header__actions' }, actions) : null),
    tabs,
    children);
  return { title, node };
}

/** Pestañas de una sección (navegación entre subsecciones con <a>). */
export function tabs(label, items, activeId) {
  return h('nav', { class: 'tabs', 'aria-label': label },
    items.map((t) => h('a', {
      class: 'tabs__link',
      href: t.href,
      'aria-current': t.id === activeId ? 'page' : null,
    }, t.iconName ? icon(t.iconName) : null, t.label)));
}
