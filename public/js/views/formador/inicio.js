import { skills } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatNumber } from '../../lib/format.js';
import { session } from '../../lib/store.js';
import { categoryBadge, minutes } from '../../lib/training.js';
import { page } from '../../components/layout/Page.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { badge } from '../../components/ui/Badge.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { alertBox } from '../../components/ui/Field.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';
import { toast } from '../../components/ui/Toast.js';
import { listingBadge, money } from './comun.js';

/** Panel del formador de Pyme Hub Skills (fase 9d): cobro con Stripe Connect y sus cursos. */

// Vuelta del alta en Stripe Connect (?connect=ok | reintentar)
const RETORNO = (() => {
  const v = new URLSearchParams(location.search).get('connect');
  if (v) history.replaceState(null, '', `${location.pathname}${location.hash || '#/inicio'}`);
  return v;
})();

export default function formadorInicioView() {
  const nombre = session.me?.usuario?.nombre ?? '';
  return page({
    title: `Hola, ${nombre}`,
    subtitle: `${session.me?.interlocutor?.nombre ?? ''} · Formador de Pyme Hub Skills`,
    actions: linkButton({ text: 'Nuevo curso', href: '#/cursos/nuevo', variant: 'primary', iconName: 'plus' }),
    children: [
      RETORNO === 'ok' ? alertBox({ tone: 'success', text: 'Has vuelto de Stripe. Si completaste el alta, en unos segundos verás que ya puedes cobrar.' }) : null,
      RETORNO === 'reintentar' ? alertBox({ tone: 'warning', text: 'El enlace de alta caducó. Vuelve a pulsar «Activar el cobro».' }) : null,
      connectCard(),
      coursesView(),
    ],
  });
}

function connectCard() {
  return card({
    title: 'Cobro de tus ventas',
    iconName: 'credit-card',
    body: dataView({
      loadingLabel: 'Comprobando tu cuenta de cobro…',
      load: (signal) => skills.connectStatus(signal),
      render: (c) => {
        if (!c.disponible) {
          return alertBox({ tone: 'info', text: 'El pago online de Skills todavía no está activo en la plataforma. Puedes preparar tus cursos; podrán venderse en cuanto se active.' });
        }
        if (c.lista) {
          return h('div', { class: 'stack-sm' },
            badge('Cuenta de cobro activa · modo prueba', { tone: 'success', iconName: 'circle-check' }),
            h('p', { class: 'small muted', text: 'Stripe te transfiere tu parte de cada venta automáticamente.' }));
        }
        const btn = button({ text: c.cuenta ? 'Completar el alta en Stripe' : 'Activar el cobro', iconName: 'external-link' });
        btn.addEventListener('click', async () => {
          setLoading(btn, true, 'Abriendo Stripe…');
          try {
            const { url } = await skills.connect();
            location.assign(url);
          } catch (error) {
            setLoading(btn, false);
            toast(error.message, { tone: 'error' });
          }
        });
        return h('div', { class: 'stack-sm' },
          h('p', { class: 'small', text: 'Para vender necesitas una cuenta de cobro en Stripe: identidad y cuenta bancaria. En modo prueba, Stripe acepta datos de ejemplo.' }),
          btn);
      },
    }),
  });
}

function coursesView() {
  return dataView({
    loadingLabel: 'Cargando tus cursos…',
    lines: 5,
    load: (signal) => skills.myCourses(signal),
    render: (res) => {
      const cursos = res.data ?? [];
      const venta = cursos.filter((c) => c.estado === 'APROBADO').length;
      const ventas = cursos.reduce((s, c) => s + c.ventas, 0);
      const ingresos = cursos.reduce((s, c) => s + c.ingresos, 0);
      return h('div', { class: 'stack' },
        h('ul', { class: 'kpi-grid', role: 'list', 'aria-label': 'Tus indicadores' },
          kpiCard({ title: 'Cursos a la venta', value: formatNumber(venta), note: `${formatNumber(cursos.length)} en total`, iconName: 'graduation-cap' }),
          kpiCard({ title: 'Ventas', value: formatNumber(ventas), iconName: 'receipt', tone: 'info', href: '#/ventas' }),
          kpiCard({ title: 'Tus ingresos', value: money(ingresos), note: `Tras la comisión del ${formatNumber(res.meta?.comision_pct ?? 20)} % de Pyme Hub`, iconName: 'credit-card' })),
        card({
          title: 'Mis cursos',
          iconName: 'graduation-cap',
          body: cursos.length === 0
            ? emptyState({ title: 'Todavía no tienes cursos.', text: 'Crea tu primer micro-curso: contenido, cuestionario, precio y revisión de Pyme Hub.', iconName: 'graduation-cap',
              action: linkButton({ text: 'Nuevo curso', href: '#/cursos/nuevo', variant: 'primary', iconName: 'plus' }) })
            : table({
              caption: 'Mis cursos de Pyme Hub Skills',
              rows: cursos,
              columns: [
                { label: 'Curso', primary: true, render: (c) => h('a', { href: `#/cursos/${c.id}`, text: c.titulo }) },
                { label: 'Categoría', render: (c) => categoryBadge(c.categoria) },
                { label: 'Duración', render: (c) => minutes(c.duracion_min) },
                { label: 'Precio empresa', render: (c) => (c.precio_empresa === null ? '—' : `${money(c.precio_empresa)} + IVA`) },
                { label: 'Precio particular', render: (c) => (c.precio_persona === null ? '—' : `${money(c.precio_persona)} IVA incl.`) },
                { label: 'Estado', render: (c) => (c.modulo_estado === 'BORRADOR' ? badge('Borrador', { iconName: 'file-text' }) : listingBadge(c.estado)) },
                { label: 'Ventas', render: (c) => `${formatNumber(c.ventas)} · ${money(c.ingresos)}` },
                { label: 'Actualizado', render: (c) => formatDate(c.actualizado_en) },
              ],
            }),
        }));
    },
  });
}
