import { h } from '../../lib/dom.js';
import { formatNumber } from '../../lib/format.js';
import { button } from './Button.js';

/**
 * Tabla adaptable: completa desde tableta y en tarjetas en móvil (Manual §21).
 * columns: [{ key, label, render: (row) => nodo|texto, primary }]
 */
export function table({ caption, columns, rows, captionHidden = true }) {
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'table' },
      h('caption', { class: captionHidden ? 'visually-hidden' : '', text: caption }),
      h('thead', {}, h('tr', {}, columns.map((c) => h('th', { scope: 'col', text: c.label })))),
      h('tbody', {}, rows.map((row) => h('tr', {},
        columns.map((c) => h('td', { class: c.primary ? 'table__primary' : null, 'data-label': c.label },
          c.render ? c.render(row) : (row[c.key] ?? '—'))))))));
}

/** Paginación con texto de posición y botones anterior/siguiente. */
export function pagination({ meta, onPage }) {
  const { total = 0, page = 1, per_page: perPage = 25 } = meta ?? {};
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const prev = button({ text: 'Anterior', variant: 'secondary', iconName: 'chevron-left', disabled: page <= 1, onClick: () => onPage(page - 1) });
  const next = button({ text: 'Siguiente', variant: 'secondary', iconName: 'chevron-right', disabled: page >= pages, onClick: () => onPage(page + 1) });
  return h('nav', { class: 'pagination', 'aria-label': 'Paginación' },
    h('p', { text: `${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(total)}` }),
    pages > 1 ? h('div', { class: 'pagination__buttons' }, prev, next) : null);
}
