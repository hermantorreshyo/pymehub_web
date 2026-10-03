import { h } from '../../lib/dom.js';
import { ApiError, messageFor } from '../../services/api.js';
import { button } from './Button.js';
import { icon } from './Icon.js';

/**
 * Estados obligatorios de todo componente con datos (RNF-041):
 * cargando, vacío, error con "Reintentar" y éxito.
 */

export function loadingState({ label = 'Cargando…', lines = 3 } = {}) {
  return h('div', { class: 'skeleton', role: 'status' },
    h('span', { class: 'visually-hidden', text: label }),
    Array.from({ length: lines }, () => h('div', { class: 'skeleton__line', 'aria-hidden': 'true' })));
}

export function emptyState({ title, text = null, iconName = 'inbox', action = null, variant = null } = {}) {
  return h('div', { class: ['state', variant && `state--${variant}`] },
    h('span', { class: 'state__icon' }, icon(iconName, { size: 'lg' })),
    h('p', { class: 'state__title', text: title }),
    text ? h('p', { class: 'state__text', text }) : null,
    action);
}

export function errorState({ error, onRetry = null, title = 'No ha sido posible cargar la información.' } = {}) {
  const message = error instanceof ApiError ? error.message : messageFor('PH-SYS-001');
  const ref = error instanceof ApiError ? error.correlationId : null;
  return h('div', { class: 'state state--error', role: 'alert' },
    h('span', { class: 'state__icon' }, icon(error?.code === 'PH-NET-001' ? 'wifi-off' : 'circle-alert', { size: 'lg' })),
    h('p', { class: 'state__title', text: title }),
    h('p', { class: 'state__text', text: message }),
    ref ? h('p', { class: 'state__ref', text: `Referencia para soporte: ${ref}` }) : null,
    onRetry ? button({ text: 'Reintentar', variant: 'secondary', iconName: 'refresh-cw', onClick: onRetry }) : null);
}

/** Sección que llega en una próxima versión: estado vacío propio, sin datos inventados. */
export function soonState({ title, text, iconName = 'clock' }) {
  return emptyState({ title, text, iconName, variant: 'soon' });
}

/**
 * Contenedor que carga datos y muestra el estado que toque.
 *   const view = dataView({
 *     load: (signal) => api.teams.list(signal),
 *     render: (teams) => node,
 *     isEmpty: (teams) => teams.length === 0,
 *     empty: () => emptyState({...}),
 *   });
 *   view.reload();
 */
export function dataView({ load, render, isEmpty = () => false, empty = null, loadingLabel, lines = 3, className = '' }) {
  const root = h('div', { class: ['data-view', className], 'aria-live': 'polite' });
  let controller = null;

  async function reload() {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    root.setAttribute('aria-busy', 'true');
    root.replaceChildren(loadingState({ label: loadingLabel, lines }));
    try {
      const result = await load(signal);
      if (signal.aborted) return;
      if (isEmpty(result)) {
        root.replaceChildren(empty ? empty(result) : emptyState({ title: 'Todavía no hay nada por aquí.' }));
      } else {
        root.replaceChildren(render(result, { reload }));
      }
    } catch (error) {
      if (signal.aborted || error?.name === 'AbortError') return;
      root.replaceChildren(errorState({ error, onRetry: reload }));
    } finally {
      if (!signal.aborted) root.removeAttribute('aria-busy');
    }
  }

  root.reload = reload;
  reload();
  return root;
}
