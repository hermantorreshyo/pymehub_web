import { alerts, employees, teams, wellbeing } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatNumber, plural } from '../../lib/format.js';
import { session } from '../../lib/store.js';
import { welcomeHeader } from '../../components/dashboard/WelcomeHeader.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { kpiGrid } from '../../components/dashboard/KPIGrid.js';
import { card } from '../../components/ui/Card.js';
import { icon } from '../../components/ui/Icon.js';
import { linkButton } from '../../components/ui/Button.js';
import { dataView, emptyState, soonState } from '../../components/ui/StateView.js';
import { dec, wellbeingBadge } from '../../lib/wellbeing.js';

/** KPI de un módulo que aún no publica datos: sin cifras inventadas (§13.6). */
function pendingKpi(title, iconName, note) {
  return async () => kpiCard({ title, value: 'Sin datos aún', note, iconName, tone: 'muted' });
}

function teamsCard() {
  return card({
    title: 'Tus equipos',
    iconName: 'users',
    actions: linkButton({ text: 'Ver equipos', href: '#/plantilla/equipos', variant: 'tertiary', iconName: 'arrow-right' }),
    body: dataView({
      load: (signal) => teams.list(signal),
      isEmpty: (list) => list.length === 0,
      empty: () => emptyState({
        title: 'Todavía no hay equipos.',
        text: session.perfil === 'GERENTE'
          ? 'Crea el primero para organizar a tu plantilla por zonas o turnos.'
          : 'La gerencia de tu empresa puede crearlos desde Plantilla.',
        iconName: 'users',
      }),
      render: (list) => h('ul', { class: 'list' },
        list.map((t) => h('li', { class: 'list__item' },
          h('span', { class: 'person__text' },
            h('span', { class: 'person__name', text: t.nombre }),
            t.zona ? h('span', { class: 'person__meta', text: t.zona }) : null),
          h('span', { class: 'badge', text: plural(t.empleados, 'persona', 'personas') })))),
    }),
  });
}

/** Resumen de bienestar por equipo con sus alertas abiertas (RF-053, RF-054). */
function wellbeingCard() {
  return card({
    title: 'Bienestar de los equipos',
    iconName: 'heart',
    actions: linkButton({ text: 'Ver detalle', href: '#/bienestar', variant: 'tertiary', iconName: 'arrow-right' }),
    body: dataView({
      load: async (signal) => {
        const [summary, open] = await Promise.all([
          wellbeing.summary({ weeks: 8 }, signal),
          alerts.list({ status: 'open', tipo: 'BIENESTAR_EQUIPO', per_page: 3 }, signal),
        ]);
        return { equipos: summary.data.equipos, alertas: open.data };
      },
      isEmpty: (r) => r.equipos.length === 0,
      empty: () => emptyState({ title: 'Todavía no hay equipos.', text: 'Crea equipos para seguir su bienestar.', iconName: 'users' }),
      render: ({ equipos, alertas }) => h('div', { class: 'stack' },
        alertas.length ? h('ul', { class: 'alert-list', role: 'list' }, alertas.map((x) => h('li', { class: ['alert-item', `alert-item--${x.severidad}`] },
          h('div', { class: 'alert-item__head' }, icon('bell'), h('strong', { text: x.entidad_nombre ?? 'Equipo' })),
          h('p', { class: 'small', text: x.mensaje })))) : null,
        h('ul', { class: 'list' }, equipos.map((t) => h('li', { class: 'list__item' },
          h('span', { class: 'person__text' },
            h('span', { class: 'person__name', text: t.nombre }),
            h('span', { class: 'person__meta', text: t.disponible ? `Índice ${t.indice}/100 · estrés ${dec(t.estres)}/5` : 'Menos de 5 respuestas: oculto por anonimato' })),
          wellbeingBadge(t.nivel))))),
    }),
  });
}

function quickLinks() {
  const links = [
    { href: '#/plantilla/nuevo', icon: 'user-plus', text: 'Añadir empleado' },
    { href: '#/plantilla', icon: 'users', text: 'Ver la plantilla' },
    { href: '#/plantilla/equipos', icon: 'map-pin', text: 'Equipos' },
    { href: '#/configuracion', icon: 'settings', text: 'Configuración' },
  ];
  return card({
    title: 'Accesos rápidos',
    body: h('div', { class: 'quick-links' },
      links.map((l) => h('a', { class: 'quick-link', href: l.href }, icon(l.icon), h('span', { text: l.text })))),
  });
}

export default function managementHome() {
  const me = session.me;
  const completo = session.hasFeature('riesgo_rotacion');
  const { node: welcome, titleId } = welcomeHeader({
    name: me.usuario.nombre,
    text: 'Aquí tienes un resumen del estado de tu equipo y de su bienestar y formación.',
  });

  const kpis = kpiGrid({
    label: 'Indicadores principales',
    items: [
      {
        title: 'Colaboradores',
        iconName: 'users',
        load: async () => {
          const res = await employees.list({ situacion: 'ALTA', per_page: 1 });
          const total = res?.meta?.total ?? 0;
          return kpiCard({ title: 'Colaboradores', value: formatNumber(total), note: 'Personas de alta en la plantilla', iconName: 'users', href: '#/plantilla' });
        },
      },
      {
        title: 'Índice de bienestar',
        iconName: 'heart',
        load: async () => {
          const { data } = await wellbeing.summary({ weeks: 8 });
          const a = data.actual;
          if (!a) return kpiCard({ title: 'Índice de bienestar', value: 'Sin datos suficientes', note: 'Mínimo 5 personas por semana', iconName: 'lock', tone: 'muted', href: '#/bienestar' });
          return kpiCard({
            title: 'Índice de bienestar',
            value: `${a.indice}/100`,
            note: a.variacion === null ? 'Media de la empresa' : `${a.variacion > 0 ? '+' : ''}${a.variacion} frente a la semana anterior`,
            noteTone: a.variacion === null ? null : (a.variacion >= 0 ? 'up' : 'alert'),
            noteIcon: a.variacion === null ? null : (a.variacion >= 0 ? 'arrow-up' : 'arrow-down'),
            iconName: 'heart',
            tone: a.nivel === 'BUENO' ? 'success' : a.nivel === 'ATENCION' ? 'warning' : 'danger',
            href: '#/bienestar',
          });
        },
      },
      { title: 'Avance en formación', iconName: 'graduation-cap', load: pendingKpi('Avance en formación', 'graduation-cap', 'Llega con el módulo de Formación') },
      completo
        ? { title: 'Alertas de rotación', iconName: 'shield-alert', load: pendingKpi('Alertas de rotación', 'shield-alert', 'Llega con la IA de RR. HH.') }
        : {
          title: 'Equipos',
          iconName: 'map-pin',
          load: async () => {
            const list = await teams.list();
            return kpiCard({ title: 'Equipos', value: formatNumber(list.length), note: 'Zonas y turnos de trabajo', iconName: 'map-pin', tone: 'info', href: '#/plantilla/equipos' });
          },
        },
    ],
  });

  const node = h('div', { class: 'page' },
    h('section', { class: 'stack', 'aria-labelledby': titleId }, welcome, kpis),
    h('div', { class: 'dashboard-grid' },
      teamsCard(),
      session.hasFeature('bienestar') ? wellbeingCard() : card({
        title: 'Formación',
        iconName: 'graduation-cap',
        body: soonState({ title: 'Estamos preparando este panel.', text: 'Aquí verás el avance de la formación en cuanto se active el módulo.' }),
      }),
      quickLinks()));

  return { title: 'Inicio', node };
}
