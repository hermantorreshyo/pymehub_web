import { teams } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { fullName, plural } from '../../lib/format.js';
import { href } from '../../lib/router.js';
import { session } from '../../lib/store.js';
import { page } from '../../components/layout/Page.js';
import { linkButton } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { plantillaTabs } from './plantilla-tabs.js';

function teamCard(t) {
  return card({
    title: t.nombre,
    headingLevel: 2,
    iconName: 'map-pin',
    body: [
      h('p', { class: 'team-card__meta' },
        h('span', {}, icon('users', { size: 'sm' }), plural(t.empleados, 'persona de alta', 'personas de alta')),
        t.zona ? h('span', {}, icon('map-pin', { size: 'sm' }), t.zona) : null,
        h('span', {}, icon('user', { size: 'sm' }), t.responsable ? `Responsable: ${fullName(t.responsable)}` : 'Sin responsable')),
      linkButton({ text: 'Ver personas', href: href('/plantilla', { equipo_id: t.id }), variant: 'tertiary', iconName: 'arrow-right' }),
    ],
  });
}

/** Equipos de la empresa (GET /v1/teams). La gerencia los gestiona; RR. HH. los consulta (P-10). */
export default function equiposView() {
  const view = dataView({
    loadingLabel: 'Cargando los equipos…',
    load: (signal) => teams.list(signal),
    isEmpty: (list) => list.length === 0,
    empty: () => emptyState({
      title: 'Todavía no hay equipos.',
      text: session.perfil === 'GERENTE'
        ? 'Los equipos agrupan a la plantilla por zona o turno. Su gestión llega en la próxima versión de la app.'
        : 'La gerencia de tu empresa es quien crea los equipos.',
      iconName: 'map-pin',
    }),
    render: (list) => h('div', { class: 'team-grid' }, list.map(teamCard)),
  });

  return page({
    title: 'Plantilla',
    subtitle: 'Equipos de trabajo y personas de alta en cada uno.',
    tabs: plantillaTabs('equipos'),
    children: [view],
  });
}
