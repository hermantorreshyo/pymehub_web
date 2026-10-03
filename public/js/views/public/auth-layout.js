import { h, uniqueId } from '../../lib/dom.js';

/** Pantalla de marca para el acceso: fondo arena y logotipo completo (RNF-050b). */
export function authLayout({ title, intro, children }) {
  const titleId = uniqueId('acceso');
  return h('div', { class: 'auth-layout' },
    h('main', { class: 'auth-card', id: 'contenido', tabindex: '-1', 'aria-labelledby': titleId },
      h('img', { class: 'auth-card__logo', src: 'assets/brand/logo.png', alt: 'Pyme Hub · Talento que impulsa tu negocio', width: 200, height: 53 }),
      h('div', { class: 'auth-card__intro' },
        h('h1', { id: titleId, tabindex: '-1', text: title }),
        intro ? h('p', { class: 'muted', text: intro }) : null),
      children,
      h('p', { class: 'auth-footer', text: 'Pyme Hub · Mejores personas, mejores negocios.' })));
}
