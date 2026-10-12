import { ApiError, myTraining } from '../../services/api.js';
import { h, uniqueId } from '../../lib/dom.js';
import { formatNumber, plural } from '../../lib/format.js';
import { href, updateQuery } from '../../lib/router.js';
import {
  CATEGORIAS, NIVELES, ORIGENES, categoryBadge, deadlineText, minutes, moduleArt, stateBadge, trainingCache,
} from '../../lib/training.js';
import { page, tabs } from '../../components/layout/Page.js';
import { card } from '../../components/ui/Card.js';
import { button, setLoading } from '../../components/ui/Button.js';
import { alertBox } from '../../components/ui/Field.js';
import { icon } from '../../components/ui/Icon.js';
import { progress } from '../../components/ui/Progress.js';
import { dataView, emptyState, soonState } from '../../components/ui/StateView.js';
import { toast } from '../../components/ui/Toast.js';

/**
 * Formación del empleado (§10): lo asignado y lo que ha empezado por su cuenta, y el catálogo
 * con autoinscripción en un toque (RF-047). Pensada para el móvil y para usarse sin conexión:
 * la lista se guarda en el dispositivo y los módulos abiertos también (RF-045).
 */
export default function employeeTrainingView({ query }) {
  const tab = query.tab === 'catalogo' ? 'catalogo' : 'mia';
  const nav = tabs('Secciones de formación', [
    { id: 'mia', label: 'Mi formación', href: href('/formacion'), iconName: 'graduation-cap' },
    { id: 'catalogo', label: 'Catálogo', href: href('/formacion', { tab: 'catalogo' }), iconName: 'library' },
  ], tab);

  return page({
    title: 'Formación',
    subtitle: 'Módulos de 3 a 5 minutos para aprender en el móvil, cuando te venga bien.',
    tabs: nav,
    children: [h('div', { class: 'cq' }, tab === 'catalogo' ? catalogSection(query) : mySection())],
  });
}

/* ---------- Mi formación ---------- */

function mySection() {
  const view = dataView({
    load: async (signal) => {
      try {
        const res = await myTraining.list(signal);
        trainingCache.set('lista', res);
        return res;
      } catch (error) {
        const cached = trainingCache.get('lista');
        if (error instanceof ApiError && error.code === 'PH-NET-001' && cached) return { ...cached, offline: true };
        throw error;
      }
    },
    isEmpty: (res) => (res?.data ?? []).length === 0,
    empty: () => emptyState({
      title: 'Todavía no tienes formación.',
      text: 'Cuando tu empresa te asigne un módulo aparecerá aquí. Mientras, echa un vistazo al catálogo.',
      iconName: 'graduation-cap',
      action: h('a', { class: 'btn btn--primary', href: href('/formacion', { tab: 'catalogo' }) }, icon('library'), h('span', { text: 'Ver el catálogo' })),
    }),
    loadingLabel: 'Cargando tu formación…',
    render: (res) => myBody(res),
  });
  return h('div', { class: 'training-layout' },
    h('div', { class: 'stack' }, view),
    h('aside', { class: 'stack training-aside', 'aria-label': 'Asesor de formación' }, advisorCard()));
}

function myBody({ data, meta, offline }) {
  const pendientes = data.filter((a) => a.estado !== 'COMPLETADA');
  const hechas = data.filter((a) => a.estado === 'COMPLETADA');
  return h('div', { class: 'stack' },
    offline ? alertBox({ tone: 'warning', iconName: 'wifi-off', text: 'Estás sin conexión. Te mostramos tu formación guardada en este dispositivo.' }) : null,
    h('ul', { class: 'training-stats', role: 'list', 'aria-label': 'Resumen de tu formación' },
      stat('circle-dot', formatNumber(meta.en_curso + meta.pendientes + meta.vencidas), 'por hacer'),
      stat('circle-check', formatNumber(meta.completadas), meta.completadas === 1 ? 'completada' : 'completadas'),
      stat('clock', minutes(meta.minutos_completados), 'de aprendizaje')),
    card({
      title: 'Para seguir',
      iconName: 'play',
      body: pendientes.length
        ? h('ul', { class: 'training-list', role: 'list' }, pendientes.map((a, i) => assignmentItem(a, meta.hoy, i)))
        : emptyState({ title: '¡Lo tienes todo al día!', text: 'No te queda formación pendiente. Si quieres seguir aprendiendo, prueba un módulo del catálogo.', iconName: 'award' }),
    }),
    hechas.length ? card({
      title: 'Completada',
      iconName: 'award',
      body: h('ul', { class: 'done-list', role: 'list' }, hechas.map((a) => h('li', { class: 'done-list__item' },
        h('span', { class: 'done-list__icon', 'aria-hidden': 'true' }, icon(CATEGORIAS[a.modulo.categoria]?.icon ?? 'book-open')),
        h('span', { class: 'done-list__text' },
          h('a', { href: href(`/formacion/curso/${a.id}`), text: a.modulo.titulo }),
          h('span', { class: 'small muted', text: `${minutes(a.modulo.duracion_min)} · ${ORIGENES[a.origen] ?? ''}` })),
        a.mejor_nota !== null ? h('span', { class: 'badge badge--success' }, icon('award', { size: 'sm' }), `${a.mejor_nota} %`) : null))),
    }) : null);
}

function stat(iconName, value, text) {
  return h('li', { class: 'training-stat' }, icon(iconName), h('strong', { text: value }), h('span', { text }));
}

function assignmentItem(a, hoy, index) {
  const started = a.progreso_pct > 0;
  const urgent = a.estado === 'VENCIDA';
  return h('li', { class: ['training-item', urgent && 'training-item--late'], style: { '--i': index } },
    moduleArt(a.modulo.categoria, { size: 'sm' }),
    h('div', { class: 'training-item__body' },
      h('div', { class: 'training-item__tags' }, categoryBadge(a.modulo.categoria), stateBadge(a.estado)),
      h('h3', { class: 'training-item__title', text: a.modulo.titulo }),
      h('p', { class: ['training-item__meta', urgent && 'training-item__meta--late'] },
        icon(a.fecha_limite ? 'calendar' : 'clock', { size: 'sm' }),
        `${deadlineText(a, hoy)} · ${minutes(a.modulo.duracion_min)}`),
      progress({ label: started ? 'Tu avance' : 'Sin empezar', value: a.progreso_pct })),
    h('a', { class: ['btn', started ? 'btn--secondary' : 'btn--primary', 'training-item__cta'], href: href(`/formacion/curso/${a.id}`) },
      icon(started ? 'play' : 'book-open'), h('span', { text: started ? 'Continuar' : 'Empezar' }),
      h('span', { class: 'visually-hidden', text: `: ${a.modulo.titulo}` })));
}

/** Asesor de formación con IA: llega en la fase 6 (§12). */
function advisorCard() {
  return card({
    title: 'Tu asesor de formación',
    iconName: 'sparkles',
    className: 'advisor-card',
    body: soonState({
      title: 'Muy pronto te recomendará por dónde seguir.',
      text: 'Le contarás qué te interesa y cuánto tiempo tienes, y te propondrá módulos del catálogo explicándote por qué.',
      iconName: 'sparkles',
    }),
  });
}

/* ---------- Catálogo con autoinscripción (RF-047) ---------- */

function catalogSection(query) {
  const state = { category: CATEGORIAS[query.categoria] ? query.categoria : '', q: query.q ?? '' };
  const results = h('div', { class: 'catalog-results' });

  const chips = h('div', { class: 'chip-group', role: 'group', 'aria-label': 'Filtrar por categoría' },
    [['', 'Todas', 'library'], ...Object.entries(CATEGORIAS).map(([k, c]) => [k, c.short, c.icon])].map(([value, text, iconName]) =>
      h('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(state.category === value),
        onclick: (event) => {
          state.category = value;
          chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === event.currentTarget)));
          reload();
        },
      }, icon(iconName, { size: 'sm' }), text)));

  const searchId = uniqueId('buscar');
  const search = h('input', { id: searchId, class: 'input', type: 'search', placeholder: 'Buscar por tema: estrés, carga, cliente…', value: state.q, autocomplete: 'off' });
  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = search.value.trim(); reload(); }, 300);
  });

  function reload() {
    updateQuery({ tab: 'catalogo', categoria: state.category, q: state.q });
    results.replaceChildren(dataView({
      load: (signal) => myTraining.catalog({ category: state.category, q: state.q }, signal),
      isEmpty: (res) => (res?.data ?? []).length === 0,
      empty: () => emptyState({ title: 'No hay módulos con ese filtro.', text: 'Prueba con otra categoría o con otra palabra.', iconName: 'search' }),
      loadingLabel: 'Cargando el catálogo…',
      lines: 4,
      render: (res) => h('ul', { class: 'catalog-grid', role: 'list' }, res.data.map((m, i) => catalogCard(m, i))),
    }));
  }

  reload();
  return h('div', { class: 'stack' },
    h('div', { class: 'catalog-filters' },
      chips,
      h('div', { class: 'field catalog-filters__search' },
        h('label', { class: 'visually-hidden', for: searchId, text: 'Buscar en el catálogo' }),
        h('div', { class: 'input-icon' }, icon('search'), search))),
    results);
}

function catalogCard(m, index) {
  const action = h('div', { class: 'catalog-card__action' });
  const titleId = uniqueId('mod');

  function paint() {
    if (m.asignacion) {
      const done = m.asignacion.estado === 'COMPLETADA';
      action.replaceChildren(
        h('a', { class: ['btn', done ? 'btn--tertiary' : 'btn--secondary', 'btn--block'], href: href(`/formacion/curso/${m.asignacion.id}`), 'aria-describedby': titleId },
          icon(done ? 'rotate-ccw' : 'play'), h('span', { text: done ? 'Repasar' : 'Continuar' })));
    } else {
      const btn = button({
        text: 'Inscribirme',
        iconName: 'plus',
        block: true,
        attrs: { 'aria-describedby': titleId },
        onClick: async () => {
          setLoading(btn, true, 'Inscribiendo…');
          try {
            const a = await myTraining.enroll(m.id);
            m.asignacion = { id: a.id, estado: a.estado, origen: a.origen };
            trainingCache.set('lista', null);
            toast(`Te has inscrito en «${m.titulo}». Ya puedes empezarlo.`);
            paint();
            action.querySelector('a')?.focus();
          } catch (error) {
            setLoading(btn, false);
            toast(error.message ?? 'No hemos podido inscribirte.', { tone: 'error' });
          }
        },
      });
      action.replaceChildren(btn);
    }
  }
  paint();

  return h('li', { class: 'catalog-card', style: { '--i': index } },
    moduleArt(m.categoria, { size: 'md' }),
    h('div', { class: 'catalog-card__body' },
      h('div', { class: 'training-item__tags' },
        categoryBadge(m.categoria),
        m.propio ? h('span', { class: 'badge badge--info' }, icon('building', { size: 'sm' }), 'De tu empresa') : null,
        m.para_mi_puesto ? h('span', { class: 'badge badge--success' }, icon('briefcase', { size: 'sm' }), 'Para tu puesto') : null),
      h('h3', { class: 'catalog-card__title', id: titleId, text: m.titulo }),
      h('p', { class: 'catalog-card__summary', text: m.resumen }),
      h('p', { class: 'catalog-card__meta' },
        h('span', {}, icon('clock', { size: 'sm' }), minutes(m.duracion_min)),
        h('span', {}, icon('signal-medium', { size: 'sm' }), NIVELES[m.nivel] ?? m.nivel),
        h('span', {}, icon('list-checks', { size: 'sm' }), plural(m.bloques, 'bloque', 'bloques'))),
      m.asignacion ? stateBadge(m.asignacion.estado) : null),
    action);
}
