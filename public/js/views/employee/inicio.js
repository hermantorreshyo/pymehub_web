import { myTraining, wellbeing } from '../../services/api.js';
import { h } from '../../lib/dom.js';
import { session } from '../../lib/store.js';
import { SCALES, levelOf, optionLabel, tone, wellbeingBadge } from '../../lib/wellbeing.js';
import { welcomeHeader } from '../../components/dashboard/WelcomeHeader.js';
import { card } from '../../components/ui/Card.js';
import { icon } from '../../components/ui/Icon.js';
import { dataView, emptyState } from '../../components/ui/StateView.js';
import { progress } from '../../components/ui/Progress.js';
import { deadlineText, minutes, moduleArt, trainingCache } from '../../lib/training.js';

/** Inicio del empleado: pensado para el móvil y el uso con una mano (RNF-031). */
export default function employeeHome() {
  const me = session.me;
  const { node: welcome, titleId } = welcomeHeader({
    name: me.usuario.nombre,
    text: 'Este es tu espacio para contar cómo estás y seguir creciendo.',
  });

  const cards = [
    session.hasFeature('bienestar') && card({
      title: 'Tu check-in de hoy',
      iconName: 'smile',
      className: 'card--checkin',
      body: dataView({
        load: (signal) => wellbeing.mine(30, signal),
        loadingLabel: 'Comprobando tu check-in…',
        lines: 2,
        render: (res) => checkinSummary(res),
      }),
    }),
    session.hasFeature('formacion') && card({
      title: 'Tu formación',
      iconName: 'graduation-cap',
      body: dataView({
        load: async (signal) => {
          const res = await myTraining.list(signal);
          trainingCache.set('lista', res);
          return res;
        },
        loadingLabel: 'Cargando tu formación…',
        lines: 2,
        render: (res) => trainingSummary(res),
      }),
    }),
  ].filter(Boolean);

  return {
    title: 'Inicio',
    node: h('section', { class: 'page', 'aria-labelledby': titleId }, welcome, h('div', { class: 'dashboard-grid' }, cards)),
  };
}

function checkinSummary({ data, meta }) {
  const today = data.find((c) => c.fecha === meta.hoy);
  if (!today) {
    return h('div', { class: 'home-checkin' },
      h('p', { class: 'home-checkin__lead', text: '¿Cómo te sientes hoy? Cuéntanoslo en 15 segundos.' }),
      h('p', { class: 'small muted', text: 'Tres preguntas rápidas. Tu empresa solo ve medias de equipo, nunca tus respuestas.' }),
      h('a', { class: 'btn btn--primary btn--lg btn--block', href: '#/checkin' }, icon('smile'), h('span', { text: 'Hacer mi check-in' })),
      meta.racha > 0 ? h('p', { class: 'home-checkin__streak' }, icon('flame', { size: 'sm' }), meta.racha === 1 ? 'Ayer respondiste: ¡sigue la racha!' : `Llevas ${meta.racha} días seguidos`) : null);
  }
  return h('div', { class: 'home-checkin home-checkin--done' },
    h('p', { class: 'home-checkin__lead' }, icon('circle-check'), ' Hecho hoy. ¡Gracias!'),
    h('ul', { class: 'answers', role: 'list' },
      SCALES.map((s) => h('li', { class: ['answers__item', `answers__item--${tone(s, today[s.name])}`] },
        icon(s.options.find((o) => o.value === today[s.name])?.icon ?? 'meh'),
        h('span', {}, h('strong', { text: s.short }), ' ', optionLabel(s.name, today[s.name]))))),
    meta.medias ? h('p', { class: 'home-checkin__meta' }, 'Tu media de 30 días: ', h('strong', { text: `${meta.medias.indice}/100` }), ' ', wellbeingBadge(levelOf(meta.medias.indice))) : null,
    h('a', { class: 'btn btn--secondary btn--block', href: '#/checkin' }, icon('activity'), h('span', { text: 'Ver mi evolución' })));
}

/** Lo siguiente que toca aprender: el módulo más urgente, con un acceso directo. */
function trainingSummary({ data, meta }) {
  const next = data.find((a) => a.estado !== 'COMPLETADA');
  if (!next) {
    return emptyState({
      title: data.length ? '¡Formación al día!' : 'Aún no tienes formación asignada.',
      text: 'Echa un vistazo al catálogo: hay módulos de 3 a 5 minutos sobre conducción, carga, clientes y bienestar.',
      iconName: 'award',
      action: h('a', { class: 'btn btn--secondary', href: '#/formacion?tab=catalogo' }, icon('library'), h('span', { text: 'Ver el catálogo' })),
    });
  }
  const pendientes = meta.pendientes + meta.en_curso + meta.vencidas;
  return h('div', { class: 'home-training' },
    h('div', { class: 'home-training__next' },
      moduleArt(next.modulo.categoria, { size: 'sm' }),
      h('div', {},
        h('p', { class: 'home-training__title', text: next.modulo.titulo }),
        h('p', { class: ['small', next.estado === 'VENCIDA' ? 'text-danger' : 'muted'], text: `${deadlineText(next, meta.hoy)} · ${minutes(next.modulo.duracion_min)}` }))),
    progress({ label: next.progreso_pct ? 'Tu avance' : 'Sin empezar', value: next.progreso_pct }),
    h('a', { class: 'btn btn--primary btn--block', href: `#/formacion/curso/${next.id}` }, icon(next.progreso_pct ? 'play' : 'book-open'), h('span', { text: next.progreso_pct ? 'Continuar' : 'Empezar ahora' })),
    h('p', { class: 'small muted', text: pendientes > 1 ? `Tienes ${pendientes} módulos por hacer · ${meta.completadas} completados` : `${meta.completadas} completados hasta ahora` }));
}
