import { employees, training } from '../../services/api.js';
import { session } from '../../lib/store.js';
import { categoryBadge, deadlineText, stateBadge, ORIGENES_GESTION } from '../../lib/training.js';
import { openAssignDialog } from '../../components/training/AssignDialog.js';
import { button } from '../../components/ui/Button.js';
import { icon } from '../../components/ui/Icon.js';
import { progress } from '../../components/ui/Progress.js';
import { h } from '../../lib/dom.js';
import { formatDate, formatDateTime, fullName, label, seniority } from '../../lib/format.js';
import { page } from '../../components/layout/Page.js';
import { accessBadge, badge } from '../../components/ui/Badge.js';
import { card } from '../../components/ui/Card.js';
import { alertBox } from '../../components/ui/Field.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { pagination, table } from '../../components/ui/Table.js';

function dataList(entries) {
  return h('dl', { class: 'data-list' },
    entries.map(([term, value]) => h('div', {}, h('dt', { text: term }), h('dd', {}, value ?? '—'))));
}

/** Tono de una incidencia: el reconocimiento es positivo; el resto, neutro. */
function incidentBadge(tipo) {
  return tipo === 'RECONOCIMIENTO'
    ? badge(label('tipoIncidencia', tipo), { tone: 'success', iconName: 'circle-check' })
    : badge(label('tipoIncidencia', tipo), { tone: 'neutral', iconName: 'file-text' });
}

function incidentsCard(id) {
  let currentPage = 1;
  const holder = h('div');
  const load = () => holder.replaceChildren(dataView({
    loadingLabel: 'Cargando incidencias…',
    load: (signal) => employees.incidents(id, { page: currentPage, per_page: 10 }, signal),
    isEmpty: (res) => (res?.data ?? []).length === 0,
    empty: () => emptyState({ title: 'Sin incidencias registradas.', text: 'Aquí aparecerán retrasos, ausencias injustificadas o reconocimientos.', iconName: 'file-text' }),
    render: (res) => h('div', { class: 'stack' },
      table({
        caption: 'Incidencias del empleado',
        rows: res.data,
        columns: [
          { label: 'Fecha', primary: true, render: (i) => formatDate(i.fecha) },
          { label: 'Tipo', render: (i) => incidentBadge(i.tipo) },
          { label: 'Nota', render: (i) => i.nota || '—' },
          { label: 'Registrada por', render: (i) => (i.registrada_por ? fullName(i.registrada_por) : '—') },
        ],
      }),
      pagination({ meta: res.meta, onPage: (p) => { currentPage = p; load(); } })),
  }));
  load();
  return card({
    title: 'Incidencias',
    iconName: 'file-text',
    body: [
      h('p', { class: 'small muted', text: 'Solo se registran ausencias injustificadas: nunca bajas médicas ni su causa.' }),
      holder,
    ],
  });
}

function render(e) {
  const deBaja = Boolean(e.fecha_baja);
  return h('div', { class: 'stack' },
    deBaja
      ? alertBox({
        tone: 'warning',
        title: `De baja desde el ${formatDate(e.fecha_baja, 'long')}`,
        text: `Motivo: ${label('motivoBaja', e.motivo_baja)}. La ficha queda en solo lectura.`,
      })
      : null,
    h('div', { class: 'two-columns' },
      card({
        title: 'Datos laborales',
        iconName: 'briefcase',
        body: dataList([
          ['Puesto', label('puesto', e.puesto)],
          ['Equipo', e.equipo?.nombre ?? 'Sin equipo'],
          ['Turno', label('turno', e.turno)],
          ['Tipo de contrato', label('tipoContrato', e.tipo_contrato)],
          ['Fecha de alta', formatDate(e.fecha_alta, 'long')],
          ['Antigüedad', seniority(e.fecha_alta, e.fecha_baja)],
          ['Código interno', e.codigo_interno ?? '—'],
        ]),
      }),
      card({
        title: 'Acceso a Pyme Hub',
        iconName: 'lock',
        body: dataList([
          ['Estado', accessBadge(deBaja ? 'BAJA' : e.estado_acceso)],
          ['Email', e.email ?? 'Sin email'],
          ['Último acceso', e.ultimo_acceso_en ? formatDateTime(e.ultimo_acceso_en) : 'Nunca'],
        ]),
      })),
    session.hasFeature('formacion') ? trainingCard(e) : null,
    incidentsCard(e.id));
}

/** Historial formativo de la persona y lo que las reglas recomiendan (RF-043). */
function trainingCard(e) {
  const deBaja = Boolean(e.fecha_baja);
  let view = null;
  view = dataView({
    loadingLabel: 'Cargando su formación…',
    load: async (signal) => {
      const [list, recos] = await Promise.all([
        training.assignments({ employee_id: e.id, per_page: 50 }, signal),
        deBaja ? Promise.resolve({ data: [] }) : training.recommendations({ employee_id: e.id }, signal),
      ]);
      return { list: list.data, recos: recos.data };
    },
    isEmpty: (r) => r.list.length === 0 && r.recos.length === 0,
    empty: () => emptyState({ title: 'Sin formación todavía.', text: 'Cuando le asignes un módulo o se inscriba por su cuenta, lo verás aquí.', iconName: 'graduation-cap' }),
    render: ({ list, recos }) => h('div', { class: 'stack' },
      recos.length ? h('div', { class: 'reco-inline' },
        h('p', { class: 'reco-inline__title' }, icon('lightbulb'), h('strong', { text: 'Recomendado por las reglas' })),
        h('ul', { class: 'reco-list', role: 'list' }, recos.map((r) => h('li', { class: 'reco-list__item reco-list__item--compact' },
          h('div', { class: 'reco-list__module' },
            h('span', { class: 'reco-list__title' }, categoryBadge(r.modulo.categoria), h('a', { href: `#/formacion/modulos/${r.modulo.id}`, text: r.modulo.titulo })),
            h('span', { class: 'small muted', text: r.motivo })),
          button({ text: 'Asignar', variant: 'secondary', iconName: 'send', onClick: () => openAssignDialog({ modulo: r.modulo, preselected: [e], onDone: () => view.reload() }) }))))) : null,
      list.length ? table({
        caption: 'Formación de la persona',
        columns: [
          { label: 'Módulo', primary: true, render: (a) => h('div', { class: 'cell-stack' }, h('a', { href: `#/formacion/modulos/${a.modulo.id}`, text: a.modulo.titulo }), h('span', { class: 'small muted', text: ORIGENES_GESTION[a.origen] ?? a.origen })) },
          { label: 'Estado', render: (a) => stateBadge(a.estado) },
          { label: 'Avance', render: (a) => progress({ label: a.mejor_nota !== null ? `Nota ${a.mejor_nota} %` : 'Avance', value: a.progreso_pct }) },
          { label: 'Fecha límite', render: (a) => deadlineText(a) },
        ],
        rows: list,
      }) : null),
  });
  return card({ title: 'Formación', iconName: 'graduation-cap', body: h('div', { class: 'cq' }, view) });
}

/** Ficha del empleado (GET /v1/employees/{id}). */
export default function fichaView({ params }) {
  let heading = null;
  const view = dataView({
    loadingLabel: 'Cargando la ficha…',
    lines: 5,
    load: async (signal) => {
      const e = await employees.get(params.id, signal);
      // El título pasa a ser el nombre en cuanto llegan los datos
      heading.textContent = fullName(e);
      document.title = `${fullName(e)} · Pyme Hub`;
      return e;
    },
    render,
  });

  const result = page({
    title: 'Ficha del empleado',
    back: { href: '#/plantilla', label: 'Volver a la plantilla' },
    children: [view],
  });
  heading = result.node.querySelector('h1');
  return result;
}
