import { users } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDateTime, label } from '../../lib/format.js';
import { session } from '../../lib/store.js';
import { page } from '../../components/layout/Page.js';
import { personLine } from '../../components/ui/Avatar.js';
import { accessBadge, badge } from '../../components/ui/Badge.js';
import { card } from '../../components/ui/Card.js';
import { dataView, emptyState, soonState } from '../../components/ui/StateView.js';
import { table } from '../../components/ui/Table.js';

function companyCard() {
  const me = session.me;
  return card({
    title: 'Tu empresa',
    iconName: 'building',
    body: h('dl', { class: 'data-list' },
      h('div', {}, h('dt', { text: 'Empresa' }), h('dd', { text: me.interlocutor.nombre })),
      h('div', {}, h('dt', { text: 'Plan contratado' }), h('dd', {}, badge(label('plan', me.plan), { tone: 'info', iconName: 'circle-check' })))),
  });
}

/** Cuentas de gestión (GET /v1/users, solo gerencia). */
function accountsCard() {
  return card({
    title: 'Cuentas de gestión',
    iconName: 'users',
    body: dataView({
      loadingLabel: 'Cargando las cuentas…',
      load: (signal) => users.list(signal),
      isEmpty: (res) => (res?.data ?? []).length === 0,
      empty: () => emptyState({ title: 'No hay cuentas de RR. HH. todavía.', iconName: 'users' }),
      render: (res) => table({
        caption: 'Cuentas de gerencia y RR. HH.',
        rows: res.data,
        columns: [
          { label: 'Persona', primary: true, render: (u) => personLine(u, { meta: u.email }) },
          { label: 'Perfil', render: (u) => label('perfil', u.perfil) },
          { label: 'Acceso', render: (u) => accessBadge(u.estado_acceso) },
          { label: 'Último acceso', render: (u) => (u.ultimo_acceso_en ? formatDateTime(u.ultimo_acceso_en) : 'Nunca') },
        ],
      }),
    }),
  });
}

export default function configuracionView() {
  const gerente = session.perfil === 'GERENTE';
  return page({
    title: 'Configuración',
    subtitle: gerente
      ? 'Tu empresa, las cuentas de RR. HH. y la línea base de impacto.'
      : 'Los datos de tu empresa en Pyme Hub.',
    children: [
      h('div', { class: 'two-columns' },
        companyCard(),
        card({
          title: 'Línea base de impacto',
          iconName: 'chart-line',
          body: soonState({
            title: 'Muy pronto podrás registrarla.',
            text: 'Con la rotación y el absentismo de los 12 meses anteriores, Pyme Hub compara la evolución real de tu empresa.',
          }),
        })),
      gerente ? accountsCard() : null,
    ],
  });
}
