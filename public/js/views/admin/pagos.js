import { admin } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { page } from '../../components/layout/Page.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { badge } from '../../components/ui/Badge.js';
import { card } from '../../components/ui/Card.js';
import { alertBox } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';

/** Pagos de todas las empresas (fase 9c): Stripe en modo prueba y pagos manuales, con base, IVA y total. */
const ESTADO = {
  PAGADO: { text: 'Pagado', tone: 'success', icon: 'circle-check' },
  FALLIDO: { text: 'Fallido', tone: 'danger', icon: 'circle-alert' },
  PENDIENTE: { text: 'Pendiente', tone: 'warning', icon: 'clock' },
  ANULADO: { text: 'Anulado', tone: 'neutral', icon: 'x' },
};
const money = (v) => formatNumber(v, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function pagosView() {
  const view = dataView({
    loadingLabel: 'Cargando los pagos…',
    lines: 5,
    load: (signal) => admin.payments(null, signal),
    render: (res) => h('div', { class: 'stack' },
      res.meta?.stripe?.habilitado
        ? alertBox({ tone: 'info', title: 'Stripe en modo prueba', text: 'Los cobros con tarjeta de prueba no mueven dinero real. Los reembolsos y disputas se gestionan en el panel de Stripe.' })
        : alertBox({ tone: 'warning', title: 'Stripe no está activo', text: 'Las empresas no pueden pagar online. Activa el modo prueba en config.php (stripe.*); mientras tanto, registra los pagos manuales desde Empresas → Vigencia.' }),
      h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Indicadores de pagos' },
        kpiCard({ title: 'Pagos registrados', value: formatNumber(res.meta?.total ?? 0), iconName: 'receipt' }),
        kpiCard({ title: 'Cobrado', value: money(res.meta?.cobrado ?? 0), note: 'IVA incluido · pagos en estado Pagado', iconName: 'credit-card', tone: 'info' })),
      (res.data ?? []).length === 0
        ? emptyState({ title: 'Todavía no hay pagos.', text: 'Aparecerán aquí al cobrarse una suscripción o al registrar un pago manual.', iconName: 'receipt' })
        : table({
          caption: 'Pagos de las empresas',
          rows: res.data,
          columns: [
            { label: 'Fecha', primary: true, render: (p) => formatDate(p.creado_en) },
            { label: 'Empresa', render: (p) => p.empresa },
            { label: 'Origen', render: (p) => (p.origen === 'STRIPE' ? 'Stripe (prueba)' : 'Manual') },
            { label: 'Periodo', render: (p) => (p.periodo_inicio ? `${formatDate(p.periodo_inicio)} – ${formatDate(p.periodo_fin)}` : '—') },
            { label: 'Base', render: (p) => money(p.base) },
            { label: 'IVA', render: (p) => money(p.iva) },
            { label: 'Total', render: (p) => h('strong', { text: money(p.total) }) },
            { label: 'Estado', render: (p) => badge(ESTADO[p.estado]?.text ?? p.estado, { tone: ESTADO[p.estado]?.tone ?? 'neutral', iconName: ESTADO[p.estado]?.icon }) },
            { label: 'Factura', render: (p) => (p.url_factura
              ? h('a', { href: p.url_factura, target: '_blank', rel: 'noopener noreferrer' }, icon('external-link', { size: 'sm' }), ` ${p.numero ?? 'Ver'}`)
              : h('span', { class: 'muted', text: p.nota ?? p.numero ?? '—' })) },
          ],
        })),
  });
  return page({
    title: 'Pagos',
    subtitle: 'Cobros de las suscripciones con su base, IVA y total.',
    children: [card({ body: view })],
  });
}

