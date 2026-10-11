import { h, uniqueId } from '../../lib/dom.js';
import { icon } from '../../components/ui/Icon.js';
import { animatedLogo } from '../../components/brand/AnimatedLogo.js';
import { brandBackground } from '../../components/brand/BrandBackground.js';

/**
 * Pantalla de acceso en dos mitades (mockup 01, adaptado a §13.6):
 * - Izquierda: panel de marca navy con el logotipo animado de la landing, el lema y
 *   los tres módulos del MVP. Sin fotografías de stock (RNF-048): composición de marca.
 * - Derecha: tarjeta con el formulario sobre el fondo arena con retícula.
 * En móvil el panel de marca se reduce a una cabecera para dejar el formulario a mano.
 */
export function authLayout({ title, intro, children }) {
  const titleId = uniqueId('acceso');

  const brand = h('section', { class: 'auth-brand', 'aria-label': 'Pyme Hub' },
    brandBackground({ dark: true }),
    h('a', { class: 'auth-brand__back', href: '#/' }, icon('arrow-left'), h('span', { text: 'Volver al sitio' })),
    h('div', { class: 'auth-brand__logo' }, animatedLogo({ variant: 'claro', tagline: false })),
    h('p', { class: 'auth-brand__claim' },
      'Talento que impulsa ', h('span', { text: 'tu negocio' })),
    h('p', { class: 'auth-brand__text', text: 'Bienestar, formación y crecimiento para equipos más fuertes.' }),
    h('ul', { class: 'auth-brand__modules mini-modules', role: 'list' },
      miniModule('heart', 'Bienestar', 'Check-in en 15 segundos'),
      miniModule('graduation-cap', 'Formación', 'Micro-módulos y asesor IA'),
      miniModule('sparkles', 'IA de RR. HH.', 'Riesgo explicado con fuentes')));

  const panel = h('div', { class: 'auth-panel' },
    brandBackground(),
    h('main', { class: 'auth-card', id: 'contenido', tabindex: '-1', 'aria-labelledby': titleId },
      h('img', { class: 'auth-card__mark', src: 'assets/brand/logo.png', alt: '', width: 190, height: 50 }),
      h('div', { class: 'auth-card__intro' },
        h('h1', { id: titleId, tabindex: '-1', text: title }),
        intro ? h('p', { class: 'muted', text: intro }) : null),
      children,
      h('p', { class: 'auth-footer', text: 'Pyme Hub · Mejores personas, mejores negocios.' })));

  return h('div', { class: 'auth-split' }, brand, panel);
}

function miniModule(iconName, title, text) {
  return h('li', { class: 'mini-module' },
    icon(iconName),
    h('strong', { text: title }),
    h('span', { text }));
}
