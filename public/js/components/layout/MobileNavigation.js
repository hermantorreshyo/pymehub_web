import { h } from '../../lib/dom.js';
import { bottomItems } from '../../lib/navigation.js';
import { navLink } from './Sidebar.js';

/** Navegación inferior: móvil en gestión y siempre en la experiencia de empleado (RNF-031). */
export function mobileNavigation() {
  return h('nav', { class: 'mobile-navigation', 'aria-label': 'Navegación principal' },
    h('ul', { class: 'mobile-navigation__list' },
      bottomItems().map((item) => h('li', {}, navLink(item, { className: 'mobile-navigation__link' })))));
}
