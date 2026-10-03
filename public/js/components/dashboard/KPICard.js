import { h } from '../../lib/dom.js';
import { ApiError } from '../../services/api.js';
import { button } from '../ui/Button.js';
import { icon } from '../ui/Icon.js';

/**
 * Indicador reutilizable (Manual §8 y §17): los datos llegan por props.
 *   kpiCard({ title: 'Colaboradores', value: 48, note: '+2 este mes', icon: 'users', tone: 'success' })
 * tone: success | info | warning | danger | muted
 * noteTone: up | alert | null
 */
export function kpiCard({ title, value, note = null, noteTone = null, noteIcon = null, iconName = 'chart-line', tone = 'success', href = null }) {
  const inner = h('div', { class: ['kpi', `kpi--${tone}`] },
    h('span', { class: 'kpi__icon' }, icon(iconName, { size: 'lg' })),
    h('div', { class: 'kpi__text' },
      h('span', { class: 'kpi__value', text: value }),
      h('span', { class: 'kpi__title', text: title }),
      note ? h('span', { class: ['kpi__note', noteTone && `kpi__note--${noteTone}`] },
        noteIcon ? icon(noteIcon, { size: 'sm' }) : null, note) : null,
      href ? h('a', { class: 'small', href, text: 'Ver detalle', 'aria-label': `Ver detalle: ${title}` }) : null));
  return h('li', { class: 'kpi-card' }, inner);
}

/** KPI mientras carga. */
export function kpiLoading(title, iconName) {
  return h('li', { class: 'kpi-card', 'aria-busy': 'true' },
    h('div', { class: 'kpi kpi--muted' },
      h('span', { class: 'kpi__icon' }, icon(iconName, { size: 'lg' })),
      h('div', { class: 'kpi__text' },
        h('span', { class: 'skeleton' }, h('span', { class: 'skeleton__line', 'aria-hidden': 'true' })),
        h('span', { class: 'kpi__title', text: title }),
        h('span', { class: 'visually-hidden', text: 'Cargando…' }))));
}

/** KPI con error y botón "Reintentar" (RNF-041). */
export function kpiError(title, iconName, error, onRetry) {
  const msg = error instanceof ApiError && error.code === 'PH-NET-001' ? 'Sin conexión' : 'No disponible';
  return h('li', { class: 'kpi-card' },
    h('div', { class: 'kpi kpi--danger', role: 'alert' },
      h('span', { class: 'kpi__icon' }, icon('circle-alert', { size: 'lg' })),
      h('div', { class: 'kpi__text' },
        h('span', { class: 'kpi__title', text: title }),
        h('span', { class: 'kpi__note kpi__note--alert', text: msg }),
        button({ text: 'Reintentar', variant: 'tertiary', iconName: 'refresh-cw', onClick: onRetry }))));
}
