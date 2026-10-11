import { h } from '../../lib/dom.js';

/**
 * Fondo de marca de la landing: retícula de "plano" en movimiento y manchas verde y azul.
 * Capa decorativa (aria-hidden) que se coloca como primer hijo de una sección con
 * `position: relative; isolation: isolate`.
 *   brandBackground()                 → sobre fondo arena
 *   brandBackground({ dark: true })   → sobre el degradado navy
 */
export function brandBackground({ dark = false } = {}) {
  return h('div', { class: ['brand-bg', dark && 'brand-bg--dark'], 'aria-hidden': 'true' },
    h('div', { class: 'brand-bg__grid' }),
    h('div', { class: 'brand-bg__blob brand-bg__blob--1' }),
    h('div', { class: 'brand-bg__blob brand-bg__blob--2' }),
    h('div', { class: 'brand-bg__blob brand-bg__blob--3' }));
}
