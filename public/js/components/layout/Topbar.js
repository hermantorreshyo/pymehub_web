import { h, uniqueId } from '../../lib/dom.js';
import { label } from '../../lib/format.js';
import { navigate } from '../../lib/router.js';
import { session } from '../../lib/store.js';
import { avatar } from '../ui/Avatar.js';
import { icon } from '../ui/Icon.js';
import { brand } from './Brand.js';

/** Buscador de personas de la plantilla (solo gestión). */
function search() {
  const id = uniqueId('buscar');
  const input = h('input', {
    class: 'input',
    id,
    type: 'search',
    name: 'q',
    placeholder: 'Buscar en la plantilla…',
    autocomplete: 'off',
    maxlength: 80,
  });
  return h('form', {
    class: 'topbar__search',
    role: 'search',
    onsubmit: (e) => {
      e.preventDefault();
      navigate('/plantilla', { q: input.value.trim() });
    },
  },
  h('label', { class: 'visually-hidden', for: id, text: 'Buscar personas por nombre, código o email' }),
  h('div', { class: 'search-box' }, input, icon('search')));
}

/** Barra superior: completa en escritorio, reducida en tableta y simplificada en móvil. */
export function topbar() {
  const me = session.me;
  const gestion = session.grupo === 'gestion';
  const subtitle = me.interlocutor?.tipo === 'EMPRESA' ? me.interlocutor.nombre : label('perfil', me.usuario.perfil);

  return h('header', { class: 'topbar' },
    brand(),
    gestion ? search() : null,
    h('div', { class: 'topbar__actions' },
      gestion
        ? h('a', { class: 'btn btn--tertiary btn--icon topbar__search-mobile', href: '#/plantilla', 'aria-label': 'Buscar en la plantilla' }, icon('search'))
        : null,
      h('a', { class: 'topbar__user', href: '#/mas', 'aria-label': `Tu cuenta: ${me.usuario.nombre}` },
        h('span', { class: 'person__text' },
          h('span', { class: 'person__name', text: [me.usuario.nombre, me.usuario.apellidos].filter(Boolean).join(' ') }),
          h('span', { class: 'person__meta', text: subtitle })),
        avatar(me.usuario))));
}
