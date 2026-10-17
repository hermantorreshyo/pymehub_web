import { admin } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber, label } from '../../lib/format.js';
import { page } from '../../components/layout/Page.js';
import { badge } from '../../components/ui/Badge.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { confirmDialog } from '../../components/ui/ConfirmDialog.js';
import { toast } from '../../components/ui/Toast.js';
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

/**
 * Exportar todos los datos (RF-110) y dar de baja o reactivar (RF-111, LEG-017).
 * La baja deja la empresa en solo lectura y fija la fecha del borrado definitivo.
 */
function actions(t, reload) {
  const exp = button({ text: 'Exportar', variant: 'secondary', iconName: 'download' });
  exp.addEventListener('click', async () => {
    setLoading(exp, true, 'Preparando…');
    try {
      await admin.exportTenant(t.id);
      toast('Exportación descargada.');
    } catch (error) {
      toast(error.message, { tone: 'error' });
    } finally {
      setLoading(exp, false);
    }
  });
  const baja = t.estado === 'BAJA'
    ? button({ text: 'Reactivar', variant: 'tertiary', iconName: 'rotate-ccw', onClick: () => confirmDialog({
      title: `Reactivar ${t.nombre_comercial || t.nombre}`,
      text: 'La empresa vuelve a estar activa y se cancela el borrado definitivo programado.',
      confirmText: 'Reactivar', tone: 'primary',
      onConfirm: async () => { await admin.updateTenant(t.id, { estado: 'ACTIVO' }); toast('Empresa reactivada.'); reload(); },
    }) })
    : button({ text: 'Dar de baja', variant: 'tertiary', iconName: 'log-out', onClick: () => confirmDialog({
      title: `Dar de baja ${t.nombre_comercial || t.nombre}`,
      text: 'La empresa pasa a solo lectura: su gerencia y RR. HH. pueden consultar y exportar sus datos, pero no cambiarlos.',
      items: ['A los 30 días se borran definitivamente todos sus datos y personas (LEG-017).', 'Antes de confirmar, descarga la exportación completa con «Exportar».'],
      confirmText: 'Dar de baja', word: 'BAJA',
      onConfirm: async () => { await admin.updateTenant(t.id, { estado: 'BAJA' }); toast('Empresa dada de baja.'); reload(); },
    }) });
  return h('div', { class: 'row-actions' }, exp, baja);
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
        {
          label: 'Estado',
          render: (t) => h('span', { class: 'cell-stack' }, estadoBadge(t.estado),
            t.fecha_borrado ? h('span', { class: 'small muted', text: `Borrado definitivo el ${formatDate(t.fecha_borrado)}` }) : null),
        },
        { label: 'Plan', render: (t) => (t.suscripcion ? `${label('plan', t.suscripcion.plan)} · ${label('cicloCobro', t.suscripcion.ciclo_cobro)}` : 'Sin suscripción') },
        { label: 'Empleados', render: (t) => (t.suscripcion ? `${formatNumber(t.empleados_activos)} / ${formatNumber(t.suscripcion.limite_empleados)}` : formatNumber(t.empleados_activos)) },
        {
          label: 'Contrato de encargado',
          render: (t) => (t.fecha_contrato_encargado
            ? badge(formatDate(t.fecha_contrato_encargado), { tone: 'success', iconName: 'circle-check' })
            : badge('Pendiente', { tone: 'warning', iconName: 'triangle-alert' })),
        },
        { label: 'Acciones', render: (t) => actions(t, () => view.reload()) },
      ],
    }),
  });

  return page({
    title: 'Empresas',
    subtitle: 'Empresas cliente, su plan y su estado en la plataforma.',
    children: [card({ body: view })],
  });
}
