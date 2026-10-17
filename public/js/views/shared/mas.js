import { h } from '../../lib/dom.js';
import { label } from '../../lib/format.js';
import { logout } from '../../lib/auth-actions.js';
import { bottomItems, navItems } from '../../lib/navigation.js';
import { session } from '../../lib/store.js';
import { isStandalone } from '../../lib/install.js';
import { page } from '../../components/layout/Page.js';
import { avatar } from '../../components/ui/Avatar.js';
import { badge } from '../../components/ui/Badge.js';
import { card } from '../../components/ui/Card.js';
import { icon } from '../../components/ui/Icon.js';

/** Pantalla "Más": secciones que no caben en la navegación inferior y la cuenta. */
export default function moreView() {
  const me = session.me;
  const inBar = new Set(bottomItems().map((i) => i.id));
  const extra = navItems().filter((i) => !inBar.has(i.id));

  const account = card({
    title: 'Tu cuenta',
    iconName: 'user',
    body: [
      h('div', { class: 'person' },
        avatar(me.usuario),
        h('span', { class: 'person__text' },
          h('span', { class: 'person__name', text: [me.usuario.nombre, me.usuario.apellidos].filter(Boolean).join(' ') }),
          h('span', { class: 'person__meta', text: me.usuario.email }))),
      h('dl', { class: 'data-list' },
        h('div', {}, h('dt', { text: 'Perfil' }), h('dd', { text: label('perfil', me.usuario.perfil) })),
        me.interlocutor?.tipo === 'EMPRESA'
          ? h('div', {}, h('dt', { text: 'Empresa' }), h('dd', { text: me.interlocutor.nombre }))
          : null,
        me.plan ? h('div', {}, h('dt', { text: 'Plan' }), h('dd', {}, badge(label('plan', me.plan), { tone: 'info' }))) : null),
      h('ul', { class: 'list more-list' },
        isStandalone() ? null : h('li', { class: 'list__item' },
          h('a', { href: '#/instalar' }, icon('download'), h('span', { text: 'Instalar la app en este dispositivo' }), icon('chevron-right'))),
        h('li', { class: 'list__item' },
          h('button', { type: 'button', onclick: logout }, icon('log-out'), h('span', { text: 'Cerrar sesión' })))),
    ],
  });

  const sections = extra.length
    ? card({
      title: 'Secciones',
      iconName: 'ellipsis',
      body: h('ul', { class: 'list more-list' }, extra.map((item) => h('li', { class: 'list__item' },
        h('a', { href: `#${item.path}` },
          icon(item.icon),
          h('span', { text: item.label }),
          item.badge ? badge(item.badge) : null,
          icon('chevron-right'))))),
    })
    : null;

  return page({ title: 'Más', children: [h('div', { class: 'two-columns' }, sections, account)] });
}
