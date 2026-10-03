import { h, uniqueId } from '../../lib/dom.js';
import { formatNumber } from '../../lib/format.js';

/** Barra de progreso accesible: etiqueta, porcentaje en texto y role="progressbar". */
export function progress({ label, value = 0 }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const labelId = uniqueId('progress');
  return h('div', { class: 'progress' },
    h('div', { class: 'progress__label' },
      h('span', { id: labelId, text: label }),
      h('span', { text: `${formatNumber(pct)} %` })),
    h('div', {
      class: 'progress__track',
      role: 'progressbar',
      'aria-labelledby': labelId,
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': pct,
    }, h('div', { class: 'progress__bar', style: { '--value': pct } })));
}
