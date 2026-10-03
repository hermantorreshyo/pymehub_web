import { admin } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatCurrency, formatNumber, label } from '../../lib/format.js';
import { session } from '../../lib/store.js';
import { welcomeHeader } from '../../components/dashboard/WelcomeHeader.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { card } from '../../components/ui/Card.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';

/** Resumen de la plataforma (GET /v1/admin/metrics). El administrador no ve datos de empleados (§6.1). */
function render(m) {
  const porEstado = Object.fromEntries((m.empresas_por_estado ?? []).map((r) => [r.estado, Number(r.total)]));
  const planes = m.por_plan ?? [];
  const empleados = planes.reduce((s, p) => s + p.empleados, 0);
  const mrr = planes.reduce((s, p) => s + p.mrr_teorico, 0);

  return h('div', { class: 'stack' },
    h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Indicadores de la plataforma' },
      kpiCard({ title: 'Empresas activas', value: formatNumber(porEstado.ACTIVO ?? 0), iconName: 'building' }),
      kpiCard({ title: 'Empresas en piloto', value: formatNumber(porEstado.PILOTO ?? 0), iconName: 'building', tone: 'info' }),
      kpiCard({ title: 'Empleados activos', value: formatNumber(empleados), note: 'En empresas activas y en piloto', iconName: 'users' }),
      kpiCard({ title: 'MRR teórico', value: formatCurrency(mrr), note: 'Empleados de alta × precio del plan', iconName: 'chart-line', tone: 'info' })),
    card({
      title: 'Suscripciones por plan',
      iconName: 'chart-line',
      body: planes.length
        ? table({
          caption: 'Suscripciones vigentes por plan y ciclo de cobro',
          rows: planes,
          columns: [
            { label: 'Plan', primary: true, render: (p) => label('plan', p.plan) },
            { label: 'Ciclo de cobro', render: (p) => label('cicloCobro', p.ciclo_cobro) },
            { label: 'Empresas', render: (p) => formatNumber(p.empresas) },
            { label: 'Empleados', render: (p) => formatNumber(p.empleados) },
            { label: 'MRR teórico', render: (p) => formatCurrency(p.mrr_teorico) },
          ],
        })
        : emptyState({ title: 'Aún no hay suscripciones vigentes.', iconName: 'building' }),
    }));
}

export default function adminHome() {
  const { node: welcome, titleId } = welcomeHeader({
    name: session.me.usuario.nombre,
    text: 'Así va Pyme Hub: empresas cliente, planes y facturación teórica.',
  });
  return {
    title: 'Resumen',
    node: h('section', { class: 'page', 'aria-labelledby': titleId },
      welcome,
      dataView({ loadingLabel: 'Cargando las métricas…', lines: 4, load: (signal) => admin.metrics(signal), render })),
  };
}
