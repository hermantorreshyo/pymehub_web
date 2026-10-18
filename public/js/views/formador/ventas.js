import { skills } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { page } from '../../components/layout/Page.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { badge } from '../../components/ui/Badge.js';
import { card } from '../../components/ui/Card.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';
import { money } from './comun.js';

/** Ventas del formador (fase 9d): sin datos personales de quien compra. */
export default function ventasView() {
  const view = dataView({
    loadingLabel: 'Cargando tus ventas…',
    lines: 5,
    load: (signal) => skills.sales(signal),
    render: (res) => {
      const t = res.meta?.totales ?? {};
      return h('div', { class: 'stack' },
        h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Resumen de ventas' },
          kpiCard({ title: 'Ventas', value: formatNumber(t.ventas ?? 0), iconName: 'receipt' }),
          kpiCard({ title: 'Facturado (IVA incl.)', value: money(t.total ?? 0), iconName: 'credit-card', tone: 'info' }),
          kpiCard({ title: 'Comisión de Pyme Hub', value: money(t.comision ?? 0), iconName: 'store', tone: 'muted' }),
          kpiCard({ title: 'Tus ingresos', value: money(t.importe_formador ?? 0), note: 'Stripe te lo transfiere automáticamente', iconName: 'credit-card' })),
        card({
          title: 'Detalle de ventas',
          iconName: 'receipt',
          body: (res.data ?? []).length === 0
            ? emptyState({ title: 'Todavía no hay ventas.', text: 'Cuando una empresa o una persona compre uno de tus cursos, aparecerá aquí.', iconName: 'receipt' })
            : table({
              caption: 'Ventas de tus cursos',
              rows: res.data,
              columns: [
                { label: 'Fecha', primary: true, render: (v) => formatDate(v.pagado_en ?? v.creado_en) },
                { label: 'Curso', render: (v) => v.titulo },
                { label: 'Cliente', render: (v) => (v.tipo === 'EMPRESA' ? `${v.cliente} (licencia)` : 'Particular') },
                { label: 'Base', render: (v) => money(v.base) },
                { label: 'Comisión', render: (v) => `${money(v.comision)} (${formatNumber(v.comision_pct)} %)` },
                { label: 'Para ti', render: (v) => h('strong', { text: money(v.importe_formador) }) },
                { label: 'Estado', render: (v) => badge(v.estado === 'PAGADA' ? `Pagada${v.ficticia ? ' · demo' : ''}` : v.estado, { tone: v.estado === 'PAGADA' ? 'success' : 'neutral', iconName: v.estado === 'PAGADA' ? 'circle-check' : 'info' }) },
              ],
            }),
        }));
    },
  });
  return page({ title: 'Ventas', subtitle: 'Lo que han vendido tus cursos y lo que recibes tras la comisión.', children: [view] });
}
