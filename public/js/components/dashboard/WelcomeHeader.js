import { h, uniqueId } from '../../lib/dom.js';
import { todayLong } from '../../lib/format.js';

/**
 * Saludo de la portada ("Hola, Ana"). El h1 recibe el foco al cambiar de ruta.
 * Devuelve { node, titleId } para etiquetar la sección que lo contiene.
 */
export function welcomeHeader({ name, text }) {
  const titleId = uniqueId('bienvenida');
  const node = h('header', { class: 'welcome' },
    h('h1', { id: titleId, tabindex: '-1', text: name ? `Hola, ${name}` : 'Hola' }),
    h('p', { class: 'muted', text }),
    h('p', { class: 'welcome__date', text: todayLong() }));
  return { node, titleId };
}
