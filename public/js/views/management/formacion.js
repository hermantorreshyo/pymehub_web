import { teams, training } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { formatNumber, fullName, label, plural } from '../../lib/format.js';
import { href, updateQuery } from '../../lib/router.js';
import {
  CATEGORIAS, ESTADOS, NIVELES, ORIGENES_GESTION, REGLAS, categoryBadge, deadlineText, minutes, moduleArt, stateBadge,
} from '../../lib/training.js';
import { page, tabs } from '../../components/layout/Page.js';
import { kpiCard } from '../../components/dashboard/KPICard.js';
import { kpiGrid } from '../../components/dashboard/KPIGrid.js';
import { personLine } from '../../components/ui/Avatar.js';
import { badge } from '../../components/ui/Badge.js';
import { button, linkButton, setLoading } from '../../components/ui/Button.js';
import { card } from '../../components/ui/Card.js';
import { selectField, textField } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { progress } from '../../components/ui/Progress.js';
import { pagination, table } from '../../components/ui/Table.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';
import { inDays, openAssignDialog } from '../../components/training/AssignDialog.js';

const PER_PAGE = 25;
const TABS = ['seguimiento', 'catalogo', 'recomendaciones'];

/**
 * Formación para gerencia y RR. HH. (§10): indicadores, seguimiento por persona, catálogo con
 * asignación (RF-042), módulos propios (RF-046) y recomendaciones por reglas (RF-043).
 */
export default function managementTrainingView({ query }) {
  const tab = TABS.includes(query.tab) ? query.tab : 'seguimiento';
  const nav = tabs('Secciones de formación', [
    { id: 'seguimiento', label: 'Seguimiento', href: href('/formacion'), iconName: 'list-checks' },
    { id: 'catalogo', label: 'Catálogo', href: href('/formacion', { tab: 'catalogo' }), iconName: 'library' },
    { id: 'recomendaciones', label: 'Recomendaciones', href: href('/formacion', { tab: 'recomendaciones' }), iconName: 'lightbulb' },
  ], tab);

  const kpis = kpiGrid({
    label: 'Indicadores de formación',
    items: [
      { title: 'Formación en marcha', iconName: 'play', load: async () => {
        const s = await summary();
        return kpiCard({ title: 'Formación en marcha', value: formatNumber(s.pendientes + s.en_curso), note: `${formatNumber(s.en_curso)} en curso · ${formatNumber(s.pendientes)} sin empezar`, iconName: 'play', tone: 'info' });
      } },
      { title: 'Tasa de finalización', iconName: 'award', load: async () => {
        const s = await summary();
        return kpiCard({ title: 'Tasa de finalización', value: s.tasa_finalizacion === null ? 'Sin datos' : `${s.tasa_finalizacion} %`, note: `${plural(s.completadas, 'módulo completado', 'módulos completados')}`, iconName: 'award', tone: 'success' });
      } },
      { title: 'Vencidas', iconName: 'triangle-alert', load: async () => {
        const s = await summary();
        return kpiCard({ title: 'Formación vencida', value: formatNumber(s.vencidas), note: s.vencidas ? 'Fuera de la fecha límite' : 'Todo dentro de plazo', noteTone: s.vencidas ? 'alert' : null, iconName: 'triangle-alert', tone: s.vencidas ? 'danger' : 'muted', href: s.vencidas ? href('/formacion', { estado: 'VENCIDA' }) : null });
      } },
      { title: 'Nota media', iconName: 'target', load: async () => {
        const s = await summary();
        return kpiCard({ title: 'Nota media', value: s.nota_media === null ? 'Sin datos' : `${s.nota_media} %`, note: `${plural(s.voluntarias, 'inscripción voluntaria', 'inscripciones voluntarias')}`, iconName: 'target', tone: 'success' });
      } },
    ],
  });

  const body = tab === 'catalogo' ? catalogTab(query) : tab === 'recomendaciones' ? recommendationsTab() : followUpTab(query);
  return page({
    title: 'Formación',
    subtitle: 'Impulsa el crecimiento de tu equipo con micro-formación pensada para el día a día.',
    actions: linkButton({ text: 'Crear módulo', href: href('/formacion/modulos/nuevo'), variant: 'secondary', iconName: 'plus' }),
    tabs: nav,
    children: [kpis, h('div', { class: 'cq' }, body)],
  });
}

let summaryPromise = null;
/** Un único GET /v1/training/summary para los cuatro indicadores de la vista. */
function summary() {
  summaryPromise ??= training.summary().then((r) => r.data).finally(() => setTimeout(() => { summaryPromise = null; }, 1000));
  return summaryPromise;
}

/* ---------- Seguimiento ---------- */

function followUpTab(query) {
  const state = {
    estado: ESTADOS[query.estado] ? query.estado : '',
    equipo_id: query.equipo_id ?? '',
    modulo_id: query.modulo_id ?? '',
    q: query.q ?? '',
    page: Math.max(1, parseInt(query.page ?? '1', 10) || 1),
  };
  const results = h('div');

  const columns = [
    { label: 'Persona', primary: true, render: (a) => personLine(a.empleado, { href: `#/plantilla/${a.empleado.id}`, meta: [label('puesto', a.empleado.puesto), a.empleado.equipo_nombre].filter((x) => x && x !== '—').join(' · ') || null }) },
    { label: 'Módulo', render: (a) => h('div', { class: 'cell-stack' }, h('a', { href: href(`/formacion/modulos/${a.modulo.id}`), text: a.modulo.titulo }), h('span', { class: 'small muted', text: `${CATEGORIAS[a.modulo.categoria]?.short ?? ''} · ${ORIGENES_GESTION[a.origen] ?? a.origen}` })) },
    { label: 'Estado', render: (a) => stateBadge(a.estado) },
    { label: 'Avance', render: (a) => progress({ label: a.mejor_nota !== null ? `Nota ${a.mejor_nota} %` : 'Avance', value: a.progreso_pct }) },
    { label: 'Fecha límite', render: (a) => h('span', { class: a.estado === 'VENCIDA' ? 'text-danger' : null, text: deadlineText(a) }) },
  ];

  function load() {
    updateQuery({ estado: state.estado, equipo_id: state.equipo_id, modulo_id: state.modulo_id, q: state.q, page: state.page > 1 ? state.page : '' });
    results.replaceChildren(dataView({
      loadingLabel: 'Cargando el seguimiento…',
      lines: 6,
      load: (signal) => training.assignments({ ...state, per_page: PER_PAGE }, signal),
      isEmpty: (res) => (res?.data ?? []).length === 0,
      empty: () => (state.estado || state.equipo_id || state.modulo_id || state.q
        ? emptyState({ title: 'No hay formación con esos filtros.', text: 'Prueba a quitar alguno.', iconName: 'search' })
        : emptyState({
          title: 'Todavía no has asignado formación.',
          text: 'Elige un módulo del catálogo y asígnalo a un equipo o a personas concretas.',
          iconName: 'graduation-cap',
          action: linkButton({ text: 'Ver el catálogo', href: href('/formacion', { tab: 'catalogo' }), variant: 'primary', iconName: 'library' }),
        })),
      render: (res) => h('div', { class: 'stack' },
        table({ caption: 'Seguimiento de la formación', columns, rows: res.data }),
        pagination({ meta: res.meta, onPage: (p) => { state.page = p; load(); results.scrollIntoView({ block: 'start' }); } })),
    }));
  }

  const estado = selectField({ name: 'estado', label: 'Estado', value: state.estado, placeholder: 'Todos', options: Object.entries(ESTADOS).map(([value, e]) => ({ value, label: e.text })) });
  const equipo = selectField({ name: 'equipo_id', label: 'Equipo', value: state.equipo_id, placeholder: 'Todos los equipos', options: [] });
  const modulo = selectField({ name: 'modulo_id', label: 'Módulo', value: state.modulo_id, placeholder: 'Todos los módulos', options: [] });
  const search = textField({ name: 'q', label: 'Buscar', type: 'search', value: state.q, hint: 'Persona o módulo', attrs: { maxlength: 80, autocomplete: 'off' } });
  teams.list().then((list) => list.forEach((t) => equipo.querySelector('select').append(h('option', { value: t.id, text: t.nombre, selected: String(t.id) === String(state.equipo_id) })))).catch(() => {});
  training.modules({}).then((res) => res.data.forEach((m) => modulo.querySelector('select').append(h('option', { value: m.id, text: m.titulo, selected: String(m.id) === String(state.modulo_id) })))).catch(() => {});

  let debounce = null;
  const toolbar = h('form', { class: 'toolbar toolbar--4', role: 'search', 'aria-label': 'Filtrar el seguimiento', onsubmit: (e) => e.preventDefault() }, search, estado, equipo, modulo);
  toolbar.addEventListener('input', (e) => {
    if (e.target.name !== 'q') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; load(); }, 350);
  });
  toolbar.addEventListener('change', (e) => {
    if (!['estado', 'equipo_id', 'modulo_id'].includes(e.target.name)) return;
    state[e.target.name] = e.target.value;
    state.page = 1;
    load();
  });
  load();

  return h('div', { class: 'stack' },
    h('div', { class: 'dashboard-grid dashboard-grid--2' }, teamsProgressCard(), topModulesCard()),
    card({ title: 'Seguimiento por persona', iconName: 'list-checks', body: [toolbar, results] }));
}

function teamsProgressCard() {
  return card({
    title: 'Avance por equipo',
    iconName: 'users',
    body: dataView({
      load: () => summary(),
      isEmpty: (s) => s.por_equipo.length === 0,
      empty: () => emptyState({ title: 'Sin formación por equipos todavía.', iconName: 'users' }),
      lines: 3,
      render: (s) => h('ul', { class: 'bar-list', role: 'list' }, s.por_equipo.map((t) => h('li', {},
        progress({ label: `${t.nombre} · ${t.completadas} de ${t.total}`, value: t.tasa }),
        t.vencidas ? h('p', { class: 'small text-danger' }, icon('triangle-alert', { size: 'sm' }), ` ${plural(t.vencidas, 'vencida', 'vencidas')}`) : null))),
    }),
  });
}

function topModulesCard() {
  return card({
    title: 'Módulos más asignados',
    iconName: 'library',
    body: dataView({
      load: () => summary(),
      isEmpty: (s) => s.por_modulo.length === 0,
      empty: () => emptyState({ title: 'Aún no hay módulos asignados.', iconName: 'library' }),
      lines: 3,
      render: (s) => h('ul', { class: 'list', role: 'list' }, s.por_modulo.slice(0, 5).map((m) => h('li', { class: 'list__item' },
        h('span', { class: 'person__text' },
          h('a', { class: 'person__name', href: href('/formacion/modulos/' + m.id), text: m.titulo }),
          h('span', { class: 'person__meta', text: `${m.completadas} de ${plural(m.total, 'persona', 'personas')} lo han completado` })),
        badge(`${m.tasa} %`, { tone: m.tasa >= 70 ? 'success' : m.tasa >= 40 ? 'warning' : 'neutral', iconName: 'award' })))),
    }),
  });
}

/* ---------- Catálogo ---------- */

function catalogTab(query) {
  const state = { category: CATEGORIAS[query.categoria] ? query.categoria : '' };
  const results = h('div');
  const chips = h('div', { class: 'chip-group', role: 'group', 'aria-label': 'Filtrar por categoría' },
    [['', 'Todas', 'library'], ...Object.entries(CATEGORIAS).map(([k, c]) => [k, c.short, c.icon])].map(([value, text, iconName]) =>
      h('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(state.category === value),
        onclick: (event) => {
          state.category = value;
          chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === event.currentTarget)));
          load();
        },
      }, icon(iconName, { size: 'sm' }), text)));

  function load() {
    updateQuery({ tab: 'catalogo', categoria: state.category });
    results.replaceChildren(dataView({
      load: (signal) => training.modules({ category: state.category }, signal),
      isEmpty: (res) => (res?.data ?? []).length === 0,
      empty: () => emptyState({ title: 'No hay módulos en esta categoría.', iconName: 'library' }),
      loadingLabel: 'Cargando el catálogo…',
      lines: 4,
      render: (res) => h('ul', { class: 'catalog-grid', role: 'list' }, res.data.map((m, i) => moduleCard(m, i, load))),
    }));
  }
  load();
  return card({ body: [chips, results], className: 'catalog-card-wrap' });
}

function moduleCard(m, index, reload) {
  const titleId = uniqueId('mod');
  const published = m.estado === 'PUBLICADO';
  return h('li', { class: 'catalog-card', style: { '--i': index } },
    moduleArt(m.categoria, { size: 'md' }),
    h('div', { class: 'catalog-card__body' },
      h('div', { class: 'training-item__tags' },
        categoryBadge(m.categoria),
        m.propio ? badge('Propio', { tone: 'info', iconName: 'building' }) : null,
        !published ? badge(m.estado === 'BORRADOR' ? 'Borrador' : 'Archivado', { tone: 'warning', iconName: 'pencil' }) : null),
      h('h3', { class: 'catalog-card__title', id: titleId }, h('a', { href: href(`/formacion/modulos/${m.id}`), text: m.titulo })),
      h('p', { class: 'catalog-card__summary', text: m.resumen }),
      h('p', { class: 'catalog-card__meta' },
        h('span', {}, icon('clock', { size: 'sm' }), minutes(m.duracion_min)),
        h('span', {}, icon('signal-medium', { size: 'sm' }), NIVELES[m.nivel] ?? m.nivel),
        h('span', {}, icon('users', { size: 'sm' }), m.uso.personas ? `${m.uso.completadas}/${m.uso.personas} completado` : 'Sin asignar'))),
    h('div', { class: 'catalog-card__action catalog-card__action--row' },
      linkButton({ text: 'Ver', href: href(`/formacion/modulos/${m.id}`), variant: 'tertiary', iconName: 'eye' }),
      published
        ? button({ text: 'Asignar', iconName: 'send', variant: 'secondary', attrs: { 'aria-describedby': titleId }, onClick: () => openAssignDialog({ modulo: m, onDone: reload }) })
        : linkButton({ text: 'Editar', href: href(`/formacion/modulos/${m.id}/editar`), variant: 'secondary', iconName: 'pencil' })));
}

/* ---------- Recomendaciones (RF-043) ---------- */

/** Demanda formativa agregada (IA-021): lo que la plantilla pide al asesor, sin datos individuales. */
function demandCard() {
  return card({
    title: 'Lo que pide tu equipo',
    iconName: 'sparkles',
    body: dataView({
      load: (signal) => training.demand(signal),
      lines: 4,
      render: ({ data: d, meta }) => {
        if (!d.disponible) {
          return h('div', { class: 'state state--soon' },
            h('span', { class: 'state__icon' }, icon('lock', { size: 'lg' })),
            h('p', { class: 'state__title', text: 'Todavía no hay suficientes respuestas.' }),
            h('p', { class: 'state__text', text: `Mostramos la demanda cuando al menos ${meta.umbral} personas han indicado sus preferencias en el asesor, para no identificar a nadie.` }));
        }
        // Porcentaje sobre las personas con preferencias (los temas admiten varios por persona)
        const bars = (list, labelOf) => h('ul', { class: 'bar-list', role: 'list' }, list.filter((x) => x.personas > 0).map((x) => h('li', {},
          progress({ label: `${labelOf(x)} · ${plural(x.personas, 'persona', 'personas')}`, value: Math.round((x.personas / d.personas) * 100) }))));
        return h('div', { class: 'stack' },
          h('p', { class: 'small muted', text: `${plural(d.personas, 'persona ha', 'personas han')} indicado sus preferencias. Porcentaje sobre esas personas; solo recuentos: nadie de la empresa ve las preferencias individuales.` }),
          h('div', { class: 'demand-grid' },
            h('div', {}, h('h3', { class: 'small-heading', text: 'Objetivos' }), bars(d.objetivos, (x) => x.etiqueta)),
            h('div', {}, h('h3', { class: 'small-heading', text: 'Temas' }), bars(d.temas, (x) => CATEGORIAS[x.clave]?.label ?? x.clave))),
          h('p', { class: 'small muted hint-inline' }, icon('lightbulb', { size: 'sm' }), ' Úsalo para decidir qué módulos propios crear. ',
            d.uso.consultas_30d ? `${plural(d.uso.consultas_30d, 'consulta', 'consultas')} al asesor en 30 días${d.uso.utilidad !== null ? ` · ${d.uso.utilidad} % las valoró útiles` : ''}.` : ''));
      },
    }),
  });
}

function recommendationsTab() {
  return h('div', { class: 'stack' },
    demandCard(),
    h('div', { class: 'alert alert--info', role: 'status' }, icon('info'),
      h('div', { class: 'alert__body' },
        h('p', { text: 'Sugerencias por reglas a partir de incidencias, antigüedad y alertas de bienestar del equipo. Nunca usan las respuestas individuales del check-in. Tú decides si asignar.' }))),
    dataView({
      load: (signal) => training.recommendations({}, signal),
      isEmpty: (res) => (res?.data ?? []).length === 0,
      empty: () => emptyState({ title: 'No hay recomendaciones ahora mismo.', text: 'Cuando haya siniestros, quejas, nuevas incorporaciones o alertas de equipo, verás aquí qué formación conviene.', iconName: 'lightbulb' }),
      loadingLabel: 'Calculando recomendaciones…',
      lines: 5,
      render: (res) => {
        const groups = {};
        res.data.forEach((r) => { (groups[r.regla] ??= []).push(r); });
        return h('div', { class: 'stack' }, Object.entries(groups).map(([regla, rows]) => card({
          title: `${REGLAS[regla]?.text ?? regla} · ${rows.length}`,
          iconName: REGLAS[regla]?.icon ?? 'lightbulb',
          body: h('ul', { class: 'reco-list', role: 'list' }, rows.map(recommendationRow)),
        })));
      },
    }));
}

function recommendationRow(r) {
  const action = h('div', { class: 'reco-list__action' });
  const btn = button({
    text: 'Asignar',
    iconName: 'send',
    variant: 'secondary',
    attrs: { 'aria-label': `Asignar «${r.modulo.titulo}» a ${fullName(r.empleado)}` },
    onClick: async () => {
      setLoading(btn, true, 'Asignando…');
      try {
        await training.assign({ modulo_id: r.modulo.id, usuario_ids: [r.empleado.id], fecha_limite: inDays(14) });
        action.replaceChildren(badge('Asignado · 2 semanas', { tone: 'success', iconName: 'circle-check' }));
        toast(`Asignado «${r.modulo.titulo}» a ${fullName(r.empleado)}.`);
      } catch (error) {
        setLoading(btn, false);
        toast(error.message, { tone: 'error' });
      }
    },
  });
  action.append(btn);
  return h('li', { class: 'reco-list__item' },
    personLine(r.empleado, { href: `#/plantilla/${r.empleado.id}`, meta: [label('puesto', r.empleado.puesto), r.empleado.equipo_nombre].filter((x) => x && x !== '—').join(' · ') }),
    h('div', { class: 'reco-list__module' },
      h('span', { class: 'reco-list__title' }, categoryBadge(r.modulo.categoria), h('a', { href: href(`/formacion/modulos/${r.modulo.id}`), text: r.modulo.titulo })),
      h('span', { class: 'small muted', text: r.motivo })),
    action);
}
