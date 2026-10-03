import { admin } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber, label } from '../../lib/format.js';
import { page } from '../../components/layout/Page.js';
import { badge } from '../../components/ui/Badge.js';
import { card } from '../../components/ui/Card.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';

const ESTADO = {
  ACTIVO: { tone: 'success', icon: 'circle-check' },
  PILOTO: { tone: 'info', icon: 'clock' },
  SUSPENDIDO: { tone: 'warning', icon: 'triangle-alert' },
  BAJA: { tone: 'neutral', icon: 'log-out' },
};

function estadoBadge(estado) {
  const e = ESTADO[estado] ?? { tone: 'neutral', icon: 'info' };
  return badge(label('estadoEmpresa', estado), { tone: e.tone, iconName: e.icon });
}

/** Empresas cliente (GET /v1/admin/tenants). */
export default function empresasView() {
  const view = dataView({
    loadingLabel: 'Cargando las empresas…',
    lines: 5,
    load: (signal) => admin.tenants(signal),
    isEmpty: (res) => (res?.data ?? []).length === 0,
    empty: () => emptyState({ title: 'Todavía no hay empresas cliente.', iconName: 'building' }),
    render: (res) => table({
      caption: 'Empresas cliente',
      rows: res.data,
      columns: [
        {
          label: 'Empresa',
          primary: true,
          render: (t) => h('span', { class: 'person__text' },
            h('span', { class: 'person__name', text: t.nombre_comercial || t.nombre }),
            h('span', { class: 'person__meta', text: `${t.nombre} · ${t.nif}` })),
        },
        { label: 'Estado', render: (t) => estadoBadge(t.estado) },
        { label: 'Plan', render: (t) => (t.suscripcion ? `${label('plan', t.suscripcion.plan)} · ${label('cicloCobro', t.suscripcion.ciclo_cobro)}` : 'Sin suscripción') },
        { label: 'Empleados', render: (t) => (t.suscripcion ? `${formatNumber(t.empleados_activos)} / ${formatNumber(t.suscripcion.limite_empleados)}` : formatNumber(t.empleados_activos)) },
        {
          label: 'Contrato de encargado',
          render: (t) => (t.fecha_contrato_encargado
            ? badge(formatDate(t.fecha_contrato_encargado), { tone: 'success', iconName: 'circle-check' })
            : badge('Pendiente', { tone: 'warning', iconName: 'triangle-alert' })),
        },
      ],
    }),
  });

  return page({
    title: 'Empresas',
    subtitle: 'Empresas cliente, su plan y su estado en la plataforma.',
    children: [card({ body: view })],
  });
}
