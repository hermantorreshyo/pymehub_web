import { h } from '../../lib/dom.js';

/**
 * Marca en la navegación: símbolo + "Pyme Hub" en texto (P-13).
 * Sobre el navy no se puede usar el PNG del logotipo (texto carbón sin contraste, RNF-050b):
 * se compone con la tipografía de marca hasta disponer de la versión negativa en SVG.
 */
export function brand({ href = '#/inicio' } = {}) {
  return h('a', { class: 'brand', href, 'aria-label': 'Pyme Hub, ir al inicio' },
    h('img', { class: 'brand__symbol', src: 'assets/brand/simbolo.png', alt: '', width: 36, height: 36 }),
    h('span', { class: 'brand__text', 'aria-hidden': 'true' }, 'Pyme ', h('span', { class: 'brand__hub', text: 'Hub' })));
}
