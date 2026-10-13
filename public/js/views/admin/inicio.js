import { admin } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatCurrency, formatDateTime, formatNumber, label, todayIso } from '../../lib/format.js';
import { chartBlock } from '../../lib/charts.js';
import { button } from '../../components/ui/Button.js';
import { session } from '../../lib/store.js';
import { welcomeHeader } from '../../components/dashboard/WelcomeHeader.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { card } from '../../components/ui/Card.js';
import { badge } from '../../components/ui/Badge.js';
import { icon } from '../../components/ui/Icon.js';
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

const MODOS = { live: 'En vivo', cache_first: 'Caché primero', offline: 'Sin conexión' };

/** Uso del asesor de IA en los últimos 30 días, sin contenido de ninguna consulta (IA-012). */
function aiUsageCard() {
  return card({
    title: 'Asesor de formación con IA · 30 días',
    iconName: 'sparkles',
    body: dataView({
      load: (signal) => admin.aiUsage(signal),
      lines: 3,
      render: ({ data: u }) => {
        const total = u.consultas || 1;
        const pct = (n) => `${Math.round((n / total) * 100)} %`;
        return h('div', { class: 'stack' },
          h('p', { class: 'ai-provider' },
            badge(u.proveedor.configurado ? `${u.proveedor.nombre} · ${u.proveedor.modelo}` : 'Sin clave de IA', { tone: u.proveedor.configurado ? 'info' : 'warning', iconName: u.proveedor.configurado ? 'sparkles' : 'lock' }),
            badge(`Modo: ${MODOS[u.proveedor.modo] ?? u.proveedor.modo}`, { iconName: 'gauge' }),
            badge(`${formatNumber(u.cache.pregeneradas)} respuestas pregeneradas`, { iconName: 'archive' })),
          h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Uso del asesor' },
            kpiCard({ title: 'Consultas', value: formatNumber(u.consultas), note: `${u.empresas.length} empresas`, iconName: 'sparkles', tone: 'info' }),
            kpiCard({ title: 'Con IA en vivo', value: formatNumber(u.por_origen.live), note: u.consultas ? pct(u.por_origen.live) : null, iconName: 'zap' }),
            kpiCard({ title: 'Desde caché', value: formatNumber(u.por_origen.cache), note: u.consultas ? pct(u.por_origen.cache) : null, iconName: 'archive', tone: 'info' }),
            kpiCard({ title: 'Por reglas (sin IA)', value: formatNumber(u.por_origen.reglas), note: u.consultas ? pct(u.por_origen.reglas) : null, iconName: 'list-checks', tone: 'muted' })),
          h('p', { class: 'small muted hint-inline' }, icon('circle-check', { size: 'sm' }),
            ` Valoradas útiles: ${formatNumber(u.valoracion.utiles)} · no útiles: ${formatNumber(u.valoracion.no_utiles)}`,
            u.latencia_media_ms !== null ? ` · latencia media en vivo: ${formatNumber(u.latencia_media_ms)} ms` : '',
            u.avisos.length ? ` · avisos: ${u.avisos.map((a) => `${a.code} (${a.total})`).join(', ')}` : ''));
      },
    }),
  });
}

const RANGOS = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: 'todo', label: 'Desde el inicio' },
];
const PERFILES_DEMO = { GERENTE: 'Gerente', RRHH: 'RR. HH.', EMPLEADO: 'Conductor' };

function rangeQuery(id) {
  const hoy = todayIso();
  if (id === 'hoy') return { from: hoy, to: hoy };
  if (id === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const pad = (n) => String(n).padStart(2, '0');
    return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, to: hoy };
  }
  return { to: hoy };
}

/**
 * «QR del folleto» (DMO-036): visitas que llegan por el QR y entradas en la demo comercial.
 * Solo recuentos: sin IP, sin dispositivo identificable y sin cookies (DMO-031, DMO-032).
 */
function qrCard() {
  let rango = 'hoy';
  const holder = h('div');
  const segmented = h('div', { class: 'qr-range', role: 'group', 'aria-label': 'Periodo' });
  const load = () => {
    segmented.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rango === rango)));
    holder.replaceChildren(dataView({
      loadingLabel: 'Cargando las visitas del QR…',
      lines: 3,
      load: (signal) => admin.campaignMetrics({ campaign: 'folleto_comercial', ...rangeQuery(rango) }, signal),
      render: ({ data: m, meta }) => {
        const pct = (n) => (m.visitas ? `${Math.round((n / m.visitas) * 100)} %` : '—');
        const ratio = m.visitas ? `${Math.round((m.logins_demo.total / m.visitas) * 100)} % de las visitas` : 'Sin visitas en el periodo';
        return h('div', { class: 'stack' },
          meta.demo?.habilitada === false
            ? h('p', { class: 'small hint-inline' }, icon('triangle-alert', { size: 'sm' }), ' La demostración está desactivada (demo.habilitada en config.php).')
            : null,
          h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Indicadores del QR del folleto' },
            kpiCard({ title: 'Visitas por el QR', value: formatNumber(m.visitas), note: m.ultima_visita ? `Última: ${formatDateTime(m.ultima_visita)}` : 'Todavía ninguna', iconName: 'eye', tone: 'info' }),
            kpiCard({ title: 'Desde el móvil', value: pct(m.por_dispositivo.MOVIL), note: `${formatNumber(m.por_dispositivo.MOVIL)} móvil · ${formatNumber(m.por_dispositivo.ESCRITORIO)} escritorio`, iconName: 'smartphone', tone: 'info' }),
            kpiCard({ title: 'Entradas en la demo', value: formatNumber(m.logins_demo.total), note: ratio, iconName: 'log-in' }),
            kpiCard({ title: 'Por perfil', value: Object.values(m.logins_demo.por_perfil).join(' · '), note: Object.keys(m.logins_demo.por_perfil).map((k) => PERFILES_DEMO[k] ?? k).join(' · '), iconName: 'users', tone: 'muted' })),
          m.visitas
            ? h('div', { class: 'two-columns' },
              chartBlock({
                label: 'Visitas por día (hora de España)',
                type: 'bar',
                labels: m.por_dia.map((d) => d.fecha.slice(5).split('-').reverse().join('/')),
                series: [{ name: 'Visitas', data: m.por_dia.map((d) => d.visitas), color: 1 }],
                yMin: 0, stepY: 1, height: 200,
              }),
              chartBlock({
                label: 'Visitas por hora del día (hora de España)',
                type: 'bar',
                labels: m.por_hora.map((x) => `${x.hora} h`),
                series: [{ name: 'Visitas', data: m.por_hora.map((x) => x.visitas), color: 2 }],
                yMin: 0, stepY: 1, height: 200,
              }))
            : emptyState({ title: 'Sin visitas en este periodo.', text: 'Cada vez que alguien escanea el QR del folleto se suma una visita.', iconName: 'eye' }),
          h('p', { class: 'small muted', text: `Se cuentan visitas, no personas: sin cookies, IP ni datos personales.${m.primera_visita ? ` Primera visita: ${formatDateTime(m.primera_visita)}.` : ''}` }));
      },
    }));
  };
  RANGOS.forEach((r) => segmented.append(h('button', {
    type: 'button', class: 'btn btn--secondary', dataset: { rango: r.id }, text: r.label,
    onclick: () => { rango = r.id; load(); },
  })));
  load();
  return card({
    title: 'QR del folleto',
    iconName: 'smartphone',
    actions: button({ text: 'Actualizar', variant: 'secondary', iconName: 'refresh-cw', onClick: load }),
    body: [segmented, holder],
  });
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
      dataView({ loadingLabel: 'Cargando las métricas…', lines: 4, load: (signal) => admin.metrics(signal), render }),
      qrCard(),
      aiUsageCard()),
  };
}
