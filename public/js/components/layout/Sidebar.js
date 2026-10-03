import { h } from '../../lib/dom.js';
import { label } from '../../lib/format.js';
import { navItems } from '../../lib/navigation.js';
import { logout } from '../../lib/auth-actions.js';
import { session } from '../../lib/store.js';
import { personLine } from '../ui/Avatar.js';
import { button } from '../ui/Button.js';
import { icon } from '../ui/Icon.js';
import { brand } from './Brand.js';

/** Enlace de navegación; aria-current marca la sección activa. */
export function navLink(item, { className = 'nav-link' } = {}) {
  return h('a', { class: className, href: `#${item.path}`, dataset: { nav: item.id }, title: item.label },
    icon(item.icon),
    h('span', { class: `${className}__text`, text: item.label }),
    item.badge ? h('span', { class: 'badge', text: item.badge }) : null);
}

/** Navegación lateral (240 px en escritorio, compacta en tableta, oculta en móvil). */
export function sidebar() {
  const me = session.me;
  const company = me.interlocutor?.tipo === 'EMPRESA'
    ? h('div', { class: 'sidebar__company' },
      h('strong', { text: me.interlocutor.nombre }),
      me.plan ? h('span', { text: label('plan', me.plan) }) : null)
    : null;

  return h('aside', { class: 'sidebar' },
    brand(),
    h('nav', { 'aria-label': 'Navegación principal' },
      h('ul', { class: 'nav-list' }, navItems().map((item) => h('li', {}, navLink(item))))),
    h('div', { class: 'sidebar__footer' },
      company,
      h('div', { class: 'sidebar__user' },
        personLine(me.usuario, { meta: label('perfil', me.usuario.perfil) }),
        button({ text: 'Cerrar sesión', variant: 'tertiary', iconName: 'log-out', iconOnly: true, onClick: logout }))));
}
