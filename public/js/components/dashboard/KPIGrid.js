import { h } from '../../lib/dom.js';
import { kpiError, kpiLoading } from './KPICard.js';

/**
 * Rejilla de 4 / 2 / 1 columnas (§13.3). Cada indicador se carga por separado,
 * así un fallo no deja en blanco a los demás.
 *   kpiGrid({ label, items: [{ title, iconName, load: () => Promise<nodo de kpiCard()> }] })
 */
export function kpiGrid({ label, items }) {
  const list = h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': label });

  items.forEach((item) => {
    let current = kpiLoading(item.title, item.iconName);
    list.append(current);
    const swap = (node) => {
      current.replaceWith(node);
      current = node;
    };
    const load = async () => {
      swap(kpiLoading(item.title, item.iconName));
      try {
        swap(await item.load());
      } catch (error) {
        swap(kpiError(item.title, item.iconName, error, load));
      }
    };
    load();
  });
  return list;
}
