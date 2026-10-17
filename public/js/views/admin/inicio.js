import { admin, ApiError } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatCurrency, formatDateTime, formatNumber, label, todayIso } from '../../lib/format.js';
import { chartBlock } from '../../lib/charts.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { alertBox, checkboxField, clearFieldErrors, showFieldErrors, textField } from '../../components/ui/Field.js';
import { toast } from '../../components/ui/Toast.js';
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

const CAMPANIAS = [
  { id: 'folleto_comercial', label: 'Folleto (demo)' },
  { id: 'instalar_app', label: 'Instalar la app' },
];

/**
 * «Códigos QR» (DMO-036): visitas que llegan por el QR del folleto (/demo) y por el de
 * instalación (/app), entradas en la demo e instalaciones completadas.
 * Solo recuentos: sin IP, sin dispositivo identificable y sin cookies (DMO-031, DMO-032).
 */
function qrCard() {
  let rango = 'hoy';
  let campania = 'folleto_comercial';
  const holder = h('div');
  const campaigns = h('div', { class: 'qr-range', role: 'group', 'aria-label': 'Código QR' });
  const segmented = h('div', { class: 'qr-range', role: 'group', 'aria-label': 'Periodo' });
  const load = () => {
    segmented.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rango === rango)));
    campaigns.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.campania === campania)));
    holder.replaceChildren(dataView({
      loadingLabel: 'Cargando las visitas del QR…',
      lines: 3,
      load: (signal) => admin.campaignMetrics({ campaign: campania, ...rangeQuery(rango) }, signal),
      render: ({ data: m, meta }) => {
        const pct = (n) => (m.visitas ? `${Math.round((n / m.visitas) * 100)} %` : '—');
        const app = campania === 'instalar_app';
        const ratio = (n) => (m.visitas ? `${Math.round((n / m.visitas) * 100)} % de las visitas` : 'Sin visitas en el periodo');
        const kpis = [
          kpiCard({ title: 'Visitas por el QR', value: formatNumber(m.visitas), note: m.ultima_visita ? `Última: ${formatDateTime(m.ultima_visita)}` : 'Todavía ninguna', iconName: 'eye', tone: 'info' }),
          kpiCard({ title: 'Desde el móvil', value: pct(m.por_dispositivo.MOVIL), note: `${formatNumber(m.por_dispositivo.MOVIL)} móvil · ${formatNumber(m.por_dispositivo.ESCRITORIO)} escritorio`, iconName: 'smartphone', tone: 'info' }),
        ];
        if (app) {
          const inst = m.instalaciones ?? { total: 0, por_dispositivo: { MOVIL: 0, ESCRITORIO: 0, OTRO: 0 } };
          kpis.push(
            kpiCard({ title: 'Instalaciones', value: formatNumber(inst.total), note: ratio(inst.total), iconName: 'download' }),
            kpiCard({ title: 'Instaladas en el móvil', value: formatNumber(inst.por_dispositivo.MOVIL), note: `${formatNumber(inst.por_dispositivo.ESCRITORIO)} en ordenador · en iPhone no se puede contar`, iconName: 'smartphone', tone: 'muted' }));
        } else {
          kpis.push(
            kpiCard({ title: 'Entradas en la demo', value: formatNumber(m.logins_demo.total), note: ratio(m.logins_demo.total), iconName: 'log-in' }),
            kpiCard({ title: 'Por perfil', value: Object.values(m.logins_demo.por_perfil).join(' · '), note: Object.keys(m.logins_demo.por_perfil).map((k) => PERFILES_DEMO[k] ?? k).join(' · '), iconName: 'users', tone: 'muted' }));
        }
        return h('div', { class: 'stack' },
          !app && meta.demo?.habilitada === false
            ? h('p', { class: 'small hint-inline' }, icon('triangle-alert', { size: 'sm' }), ' La demostración está desactivada (demo.habilitada en config.php).')
            : null,
          h('p', { class: 'small muted', text: app ? 'Destino del QR: pymehub.hermantorres.com/app' : 'Destino del QR: pymehub.hermantorres.com/demo' }),
          h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Indicadores del código QR' }, kpis),
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
            : emptyState({ title: 'Sin visitas en este periodo.', text: 'Cada vez que alguien escanea el QR se suma una visita.', iconName: 'eye' }),
          h('p', { class: 'small muted', text: `Se cuentan visitas, no personas: sin cookies, IP ni datos personales.${m.primera_visita ? ` Primera visita: ${formatDateTime(m.primera_visita)}.` : ''}` }));
      },
    }));
  };
  CAMPANIAS.forEach((c) => campaigns.append(h('button', {
    type: 'button', class: 'btn btn--secondary', dataset: { campania: c.id }, text: c.label,
    onclick: () => { campania = c.id; load(); },
  })));
  RANGOS.forEach((r) => segmented.append(h('button', {
    type: 'button', class: 'btn btn--secondary', dataset: { rango: r.id }, text: r.label,
    onclick: () => { rango = r.id; load(); },
  })));
  load();
  return card({
    title: 'Códigos QR',
    iconName: 'smartphone',
    actions: button({ text: 'Actualizar', variant: 'secondary', iconName: 'refresh-cw', onClick: load }),
    body: [campaigns, segmented, holder],
  });
}

/** ISO UTC → valor de <input type="datetime-local"> en hora de España. */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Modo mantenimiento desde el panel y aviso programado (RNF-063). */
function maintenanceCard() {
  return card({
    title: 'Mantenimiento',
    iconName: 'settings',
    body: dataView({
      loadingLabel: 'Cargando el mantenimiento…',
      load: (signal) => admin.maintenance(signal),
      render: (m, { reload }) => {
        const notice = h('div', { 'aria-live': 'polite' });
        const submit = button({ text: 'Guardar', type: 'submit', iconName: 'check' });
        const form = h('form', { class: 'form', novalidate: true },
          m.activo
            ? alertBox({ tone: 'warning', title: 'Mantenimiento activo', text: 'La aplicación responde «en mantenimiento» a todas las empresas. La plataforma y el acceso siguen funcionando.' })
            : null,
          checkboxField({ name: 'activo', label: 'Activar el mantenimiento ahora' }),
          textField({ name: 'mensaje', label: 'Mensaje para las personas usuarias', value: m.mensaje ?? '', hint: 'Por ejemplo: «Volvemos a las 22:30». Opcional.', attrs: { maxlength: 200 } }),
          h('div', { class: 'stack' },
            textField({ name: 'programado_inicio', label: 'Mantenimiento programado: inicio', type: 'datetime-local', value: toLocalInput(m.programado?.inicio), hint: 'Hora de España. Se avisa desde 48 h antes.' }),
            textField({ name: 'programado_fin', label: 'Fin', type: 'datetime-local', value: toLocalInput(m.programado?.fin) })),
          notice,
          h('div', { class: 'form__actions' }, submit));
        form.elements.activo.checked = m.activo;
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          clearFieldErrors(form);
          notice.replaceChildren();
          setLoading(submit, true, 'Guardando…');
          try {
            await admin.saveMaintenance({
              activo: form.elements.activo.checked,
              mensaje: form.elements.mensaje.value.trim() || null,
              programado_inicio: form.elements.programado_inicio.value || null,
              programado_fin: form.elements.programado_fin.value || null,
            });
            toast(form.elements.activo.checked ? 'Mantenimiento activado.' : 'Mantenimiento guardado.');
            reload();
          } catch (error) {
            setLoading(submit, false);
            const rest = error instanceof ApiError ? showFieldErrors(form, error.fieldErrors) : {};
            if (!(error instanceof ApiError) || !Object.keys(error.fieldErrors).length || Object.keys(rest).length) notice.append(alertBox({ tone: 'danger', text: error.message }));
          }
        });
        return form;
      },
    }),
  });
}

/** Errores 5xx de las últimas 24 h, agrupados (RNF-062). */
function errorsCard() {
  return card({
    title: 'Errores del servidor · 24 h',
    iconName: 'triangle-alert',
    body: dataView({
      loadingLabel: 'Revisando los registros…',
      load: (signal) => admin.errors(24, signal),
      isEmpty: (e) => e.total === 0,
      empty: () => emptyState({ title: 'Sin errores en las últimas 24 horas.', text: 'Los errores internos (5xx) aparecen aquí agrupados por código y ruta.', iconName: 'circle-check' }),
      render: (e) => h('div', { class: 'stack' },
        h('p', { class: 'small muted', text: `${formatNumber(e.total)} errores. Con el identificador se localiza el detalle en storage/logs del servidor.` }),
        table({
          caption: 'Errores 5xx agrupados por código y ruta',
          rows: e.grupos,
          columns: [
            { label: 'Código', primary: true, render: (g) => badge(g.code, { tone: 'danger', iconName: 'circle-alert' }) },
            { label: 'Ruta', render: (g) => h('code', { text: g.ruta }) },
            { label: 'Veces', render: (g) => formatNumber(g.veces) },
            { label: 'Última', render: (g) => formatDateTime(g.ultima) },
            { label: 'Identificador', render: (g) => h('code', { text: g.correlation_id ?? '—' }) },
          ],
        })),
    }),
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
      aiUsageCard(),
      h('div', { class: 'two-columns' }, maintenanceCard(), errorsCard())),
  };
}
