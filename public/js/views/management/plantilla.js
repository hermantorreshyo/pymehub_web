import { employees, teams } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { formatDate, label, LABELS, seniority } from '../../lib/format.js';
import { href, updateQuery } from '../../lib/router.js';
import { page } from '../../components/layout/Page.js';
import { personLine } from '../../components/ui/Avatar.js';
import { accessBadge } from '../../components/ui/Badge.js';
import { linkButton } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { selectField, textField } from '../../components/ui/Field.js';
import { pagination, table } from '../../components/ui/Table.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { plantillaTabs } from './plantilla-tabs.js';

const PER_PAGE = 25;

/** Listado de la plantilla con búsqueda, filtros y paginación (GET /v1/employees). */
export default function plantillaView({ query }) {
  const state = {
    q: query.q ?? '',
    situacion: LABELS.situacion[query.situacion] ? query.situacion : 'ALTA',
    equipo_id: query.equipo_id ?? '',
    page: Math.max(1, parseInt(query.page ?? '1', 10) || 1),
  };

  const columns = [
    {
      label: 'Persona',
      primary: true,
      render: (e) => personLine(e, {
        href: `#/plantilla/${e.id}`,
        meta: [e.codigo_interno, e.email].filter(Boolean).join(' · ') || null,
      }),
    },
    { label: 'Puesto', render: (e) => label('puesto', e.puesto) },
    { label: 'Equipo', render: (e) => e.equipo?.nombre ?? 'Sin equipo' },
    { label: 'Turno', render: (e) => label('turno', e.turno) },
    { label: 'Contrato', render: (e) => label('tipoContrato', e.tipo_contrato) },
    { label: 'Antigüedad', render: (e) => h('span', { title: `Alta: ${formatDate(e.fecha_alta)}`, text: seniority(e.fecha_alta, e.fecha_baja) }) },
    { label: 'Acceso', render: (e) => accessBadge(e.fecha_baja ? 'BAJA' : e.estado_acceso) },
  ];

  const results = h('div');
  let view = null;

  function load() {
    updateQuery({
      q: state.q,
      situacion: state.situacion === 'ALTA' ? '' : state.situacion,
      equipo_id: state.equipo_id,
      page: state.page > 1 ? state.page : '',
    });
    view = dataView({
      loadingLabel: 'Cargando la plantilla…',
      lines: 6,
      load: (signal) => employees.list({ ...state, per_page: PER_PAGE }, signal),
      isEmpty: (res) => (res?.data ?? []).length === 0,
      empty: () => (state.q || state.equipo_id || state.situacion !== 'ALTA'
        ? emptyState({ title: 'No hay personas que coincidan con la búsqueda.', text: 'Prueba con otro nombre o quita algún filtro.', iconName: 'search' })
        : emptyState({
          title: 'Tu plantilla está vacía.',
          text: 'Añade a la primera persona para empezar a cuidar de tu equipo.',
          iconName: 'users',
          action: linkButton({ text: 'Añadir empleado', href: '#/plantilla/nuevo', variant: 'primary', iconName: 'user-plus' }),
        })),
      render: (res) => h('div', { class: 'stack' },
        table({ caption: 'Personas de la plantilla', columns, rows: res.data }),
        pagination({ meta: res.meta, onPage: (p) => { state.page = p; load(); results.scrollIntoView({ block: 'start' }); } })),
    });
    results.replaceChildren(view);
  }

  // Filtros
  const search = textField({ name: 'q', label: 'Buscar', type: 'search', value: state.q, hint: 'Nombre, apellidos, código interno o email', attrs: { maxlength: 80, autocomplete: 'off' } });
  const situacion = selectField({
    name: 'situacion',
    label: 'Situación',
    value: state.situacion,
    options: Object.entries(LABELS.situacion).map(([value, text]) => ({ value, label: text })),
  });
  const equipo = selectField({ name: 'equipo_id', label: 'Equipo', value: state.equipo_id, placeholder: 'Todos los equipos', options: [] });
  const equipoSelect = equipo.querySelector('select');

  teams.list().then((list) => {
    list.forEach((t) => equipoSelect.append(h('option', { value: t.id, text: t.nombre, selected: String(t.id) === String(state.equipo_id) })));
  }).catch(() => {
    equipoSelect.disabled = true;
    equipo.querySelector('.field__hint')?.remove();
    equipo.append(h('p', { class: 'field__hint', text: 'No se han podido cargar los equipos.' }));
  });

  let debounce = null;
  const toolbar = h('form', {
    class: 'toolbar',
    role: 'search',
    'aria-label': 'Filtrar la plantilla',
    onsubmit: (e) => { e.preventDefault(); },
  }, search, situacion, equipo);

  toolbar.addEventListener('input', (e) => {
    if (e.target.name !== 'q') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; load(); }, 350);
  });
  toolbar.addEventListener('change', (e) => {
    if (e.target.name === 'situacion') state.situacion = e.target.value;
    else if (e.target.name === 'equipo_id') state.equipo_id = e.target.value;
    else return;
    state.page = 1;
    load();
  });

  load();

  return page({
    title: 'Plantilla',
    subtitle: 'Las personas de tu empresa, sus equipos y su acceso a Pyme Hub.',
    actions: linkButton({ text: 'Añadir empleado', href: href('/plantilla/nuevo'), variant: 'primary', iconName: 'user-plus' }),
    tabs: plantillaTabs('empleados'),
    children: [card({ body: [toolbar, results] })],
  });
}
